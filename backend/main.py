import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from dotenv import load_dotenv

# Load environmental variables early
load_dotenv()

from app.fetcher import fetch_codebase_from_git, fetch_codebase_from_zip
from app.graph import create_analyzer_graph
from app.models import check_api_keys

app = FastAPI(title="VulnLens Pro Backend", version="1.0.0")

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
            
        return {
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
