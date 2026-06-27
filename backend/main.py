import os
import shutil
import uuid
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict
from dotenv import load_dotenv
from groq import Groq

# Load environmental variables early
load_dotenv()

from app.fetcher import fetch_codebase_from_git, fetch_codebase_from_zip
from app.graph import create_analyzer_graph
from app.models import check_api_keys

app = FastAPI(title="VulnLens Pro Backend", version="1.0.0")

# In-memory store mapping session_id -> { files, final_report, app_summary }
sessions_db = {}

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    repo_url: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    conversation_history: List[Dict[str, str]]

@app.get("/health")
def health_check():
    api_status = check_api_keys()
    # If any keys are missing, we run in mock mode
    mock_active = not all(api_status.values())
    return {
        "status": "ok",
        "mock_mode_active": mock_active,
        "api_keys_configured": api_status
    }

@app.post("/analyze")
async def analyze_repository(
    repo_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    if not repo_url and not file:
        raise HTTPException(status_code=400, detail="Either repo_url or file must be provided.")
        
    files = {}
    temp_dir_to_clean = None
    
    try:
        # Step 1: Fetch files from URL or Zip
        if repo_url:
            # Simple sanitization validation
            if not repo_url.startswith("http://") and not repo_url.startswith("https://"):
                raise HTTPException(status_code=400, detail="Invalid repository URL. Must start with http:// or https://")
            
            files, temp_dir_to_clean = fetch_codebase_from_git(repo_url)
        elif file:
            if not file.filename.endswith(".zip"):
                raise HTTPException(status_code=400, detail="Uploaded file must be a ZIP archive.")
                
            # Create a temporary file to save ZIP content
            suffix = os.path.splitext(file.filename)[1]
            import tempfile
            with tempfile.NamedFile(suffix=suffix, delete=False) as tmp:
                shutil.copyfileobj(file.file, tmp)
                zip_path = tmp.name
                
            try:
                files, temp_dir_to_clean = fetch_codebase_from_zip(zip_path)
            finally:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                    
        # Check files count limit
        if len(files) == 0:
            raise HTTPException(status_code=400, detail="No readable text files found in the source directory.")
            
        # Step 2: Initialize State and Run LangGraph
        initial_state = {
            "files": files,
            "app_summary": "",
            "categorization": {},
            "assignments": {},
            "vuln_hunter_raw": "",
            "bug_detector_raw": "",
            "misconfig_raw": "",
            "cve_findings": [],
            "secret_findings": [],
            "explained_findings": [],
            "final_report": [],
            "logs": ["System: Source code loaded. Total files: " + str(len(files))],
            "error": None
        }
        
        # Compile and execute Graph
        graph = create_analyzer_graph()
        
        # Execute asynchronously
        loop = asyncio.get_running_loop()
        final_state = await graph.ainvoke(initial_state)
        
        # Check if errors occurred
        if final_state.get("error"):
            raise HTTPException(status_code=500, detail=final_state["error"])
            
        # Store codebase and report details in-memory for chat history context
        session_id = str(uuid.uuid4())
        sessions_db[session_id] = {
            "files": files,
            "final_report": final_state.get("final_report", []),
            "app_summary": final_state.get("app_summary", "")
        }
            
        return {
            "session_id": session_id,
            "summary": final_state.get("app_summary", ""),
            "categorization": final_state.get("categorization", {}),
            "logs": final_state.get("logs", []),
            "findings": final_state.get("final_report", []),
            "mock_mode": not all(check_api_keys().values())
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up cloned repo or zip directory
        if temp_dir_to_clean and os.path.exists(temp_dir_to_clean):
            shutil.rmtree(temp_dir_to_clean)

# Import asyncio for ainvoke runtime
import asyncio

@app.post("/chat")
async def chat_handler(request: ChatRequest):
    session_id = request.session_id
    message = request.message
    conversation_history = request.conversation_history
    
    # 1. Check if Groq API Key is missing
    api_status = check_api_keys()
    if not api_status.get("GROQ_API_KEY"):
        return {
            "reply": "Chat requires the Groq API key. Please configure GROQ_API_KEY in the backend to enable the AI Security Mentor."
        }
        
    # 2. Check if session exists
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found. Please run a scan first.")
        
    session_data = sessions_db[session_id]
    files = session_data.get("files", {})
    final_report = session_data.get("final_report", [])
    app_summary = session_data.get("app_summary", "")
    
    # 3. Build condensed view of repository files
    condensed_files_list = []
    for fn, content in files.items():
        lines = content.splitlines()
        truncated_lines = lines[:60]
        is_truncated = len(lines) > 60
        file_content = "\n".join(truncated_lines)
        if is_truncated:
            file_content += "\n... [truncated to first 60 lines]"
        condensed_files_list.append(f"### File: {fn}\n{file_content}\n")
        
    condensed_files_str = "\n".join(condensed_files_list)
    
    # Limit findings to the 10 most severe
    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    sorted_report = sorted(
        final_report,
        key=lambda x: severity_order.get(str(x.get("severity", "low")).lower(), 0),
        reverse=True
    )
    limited_report = sorted_report[:10]
    report_str = json.dumps(limited_report, indent=2)
    
    # 4. Build system prompt
    system_prompt = f"""You are a friendly security mentor for student developers. Act as a supportive, encouraging teacher.
Your goal is to:
- Answer questions about the security scan findings and issues detected in their codebase.
- Explain vulnerabilities, bugs, or misconfigurations in simple, non-jargon language using analogies if helpful.
- Suggest direct code fixes (provide code snippets when useful) and guide them on how to write secure code.

Keep your explanations clear, simple, and jargon-free, as the user is a student developer learning security concepts.

Here is the context about the analyzed codebase project:
1. Application Summary:
{app_summary}

2. Full Scan Report (Findings):
{report_str}

3. Condensed Codebase Files (truncated to first 60 lines each):
{condensed_files_str}
"""
    
    # 5. Format messages for Groq API
    messages = [{"role": "system", "content": system_prompt}]
    for turn in conversation_history:
        role = turn.get("role")
        content = turn.get("content")
        if role in ["user", "assistant"] and content:
            messages.append({"role": role, "content": content})
            
    # Append the current message
    messages.append({"role": "user", "content": message})
    
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        loop = asyncio.get_running_loop()
        
        def call_groq():
            return client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.3
            )
            
        response = await loop.run_in_executor(None, call_groq)
        reply = response.choices[0].message.content
        return {"reply": reply}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Groq API: {str(e)}")
