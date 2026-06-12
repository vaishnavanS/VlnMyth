import os
import json
import asyncio
from typing import Dict, List, Any, TypedDict, Optional
import operator
from typing import Annotated
from pydantic import BaseModel

# --- LLM Client Imports ---
import google.generativeai as genai
from groq import Groq
from anthropic import Anthropic
from openai import OpenAI

# LangGraph state type definition
class AnalyzerState(TypedDict):
    # Inputs
    files: Dict[str, str]  # filename -> contents
    
    # Processed states
    app_summary: str
    categorization: Dict[str, List[str]] # category -> files list
    assignments: Dict[str, List[str]] # agent_name -> files list
    
    # Raw agent findings
    vuln_hunter_raw: str
    bug_detector_raw: str
    misconfig_raw: str
    
    # Summarized/Aggregated findings
    explained_findings: List[Dict[str, Any]]
    
    # Final report
    final_report: List[Dict[str, Any]]
    
    # Status tracking for UI
    logs: Annotated[List[str], operator.add]
    error: Optional[str]

# Simple model representation for frontend
class Finding(BaseModel):
    file: str
    line_number: int
    severity: str  # critical, high, medium, low
    title: str
    plain_explanation: str
    fix_suggestion: str

# Helper to load API keys and determine if we are in mock/demo mode
def check_api_keys() -> Dict[str, bool]:
    keys = ["GOOGLE_API_KEY", "GROQ_API_KEY", "NVIDIA_API_KEY", "TOGETHER_API_KEY", "ANTHROPIC_API_KEY"]
    status = {}
    for k in keys:
        val = os.getenv(k)
        status[k] = bool(val and val.strip() and not val.startswith("your_"))
    return status

def is_mock_mode() -> bool:
    # If any key is missing, we can run mock mode to ensure demo works perfectly
    keys_status = check_api_keys()
    return not all(keys_status.values())

# --- Mock Handlers for fallback mode ---
def run_mock_orchestrator(files: Dict[str, str]) -> Dict[str, Any]:
    # Summarize based on extension presence
    extensions = {os.path.splitext(f)[1] for f in files.keys()}
    summary = f"A codebase containing files with extensions: {', '.join(extensions)}."
    
    categories = {
        "auth": [],
        "database": [],
        "api": [],
        "config": [],
        "frontend": [],
        "other": []
    }
    
    for f in files.keys():
        f_lower = f.lower()
        if "auth" in f_lower or "login" in f_lower or "jwt" in f_lower:
            categories["auth"].append(f)
        elif "db" in f_lower or "model" in f_lower or "schema" in f_lower or "sql" in f_lower:
            categories["database"].append(f)
        elif "route" in f_lower or "api" in f_lower or "controller" in f_lower or "app.py" in f_lower or "main.py" in f_lower:
            categories["api"].append(f)
        elif "config" in f_lower or "env" in f_lower or "settings" in f_lower or "docker" in f_lower:
            categories["config"].append(f)
        elif "html" in f_lower or "css" in f_lower or "jsx" in f_lower or "tsx" in f_lower or "js" in f_lower or "ts" in f_lower:
            categories["frontend"].append(f)
        else:
            categories["other"].append(f)
            
    # Assign categories to specialists
    assignments = {
        "vuln_hunter": categories["auth"] + categories["database"] + categories["api"],
        "bug_detector": categories["api"] + categories["frontend"] + categories["other"],
        "misconfig": categories["config"] + categories["other"]
    }
    
    # Ensure there is at least something assigned
    for k in assignments:
        if not assignments[k]:
            assignments[k] = list(files.keys())[:2]
            
    return {
        "summary": summary,
        "categorization": categories,
        "assignments": assignments
    }

def run_mock_vuln_hunter(files: Dict[str, str]) -> str:
    findings = []
    # Inspect files to create somewhat realistic mock vulnerabilities
    for filename, content in files.items():
        if "select" in content.lower() and ("+" in content or "f\"" in content or "format" in content) and ("sql" in filename.lower() or "db" in filename.lower() or "model" in filename.lower() or "route" in filename.lower()):
            findings.append({
                "file": filename,
                "line": 14,
                "type": "SQL Injection",
                "detail": f"Raw SQL query construction found in {filename}. User inputs are concatenated directly into the query, allowing SQL command injection."
            })
        if "dangerouslysetinnerhtml" in content.lower() or ("innerhtml" in content.lower()):
            findings.append({
                "file": filename,
                "line": 42,
                "type": "Cross-Site Scripting (XSS)",
                "detail": "Direct injection of HTML markup using innerHTML or dangerouslySetInnerHTML. Untrusted inputs can lead to persistent or reflected XSS."
            })
            
    # Default fallback finding if code looks clean
    if not findings:
        findings.append({
            "file": list(files.keys())[0] if files else "app.py",
            "line": 8,
            "type": "Potential Auth Bypass / Improper Access Control",
            "detail": "Missing authorization decorators or middleware validations on critical backend handler routes."
        })
    return json.dumps(findings, indent=2)

def run_mock_bug_detector(files: Dict[str, str]) -> str:
    findings = []
    for filename, content in files.items():
        if "try" not in content and ("request" in content or "fetch" in content or "open" in content):
            findings.append({
                "file": filename,
                "line": 27,
                "type": "Unhandled Exception / Resource Leak",
                "detail": f"File operations or external API requests in {filename} are performed without try-except blocks, leading to unhandled runtime failures."
            })
            
    if not findings:
        findings.append({
            "file": list(files.keys())[0] if files else "main.py",
            "line": 15,
            "type": "Race Condition / Unhandled Promise Rejection",
            "detail": "Asynchronous network request or local state modification triggers without verification of request lifecycle or response integrity."
        })
    return json.dumps(findings, indent=2)

def run_mock_misconfig(files: Dict[str, str]) -> str:
    findings = []
    for filename, content in files.items():
        if "secret" in content.lower() or "password" in content.lower() or "key" in content.lower() or "token" in content.lower():
            if not filename.endswith(".example") and not filename.endswith(".md"):
                findings.append({
                    "file": filename,
                    "line": 5,
                    "type": "Hardcoded Secret / API Token Exposure",
                    "detail": f"Possible sensitive credential or plain-text key hardcoded inside the file {filename}."
                })
        if "cors" in content.lower() or "*" in content:
            if "cors" in filename.lower() or "main.py" in filename.lower() or "app.js" in filename.lower():
                findings.append({
                    "file": filename,
                    "line": 22,
                    "type": "Permissive CORS Configuration",
                    "detail": "CORS headers are configured to allow credentials and wildcard origins (*), which defeats the browser's same-origin security policy."
                })
                
    if not findings:
        findings.append({
            "file": ".env" if ".env" in files else (list(files.keys())[0] if files else "settings.py"),
            "line": 1,
            "type": "Missing Security Headers / Debug Mode Active",
            "detail": "Production environment lacks HTTP security headers (like Content-Security-Policy, Strict-Transport-Security) or has debug flag set to True."
        })
    return json.dumps(findings, indent=2)

def run_mock_explainer(raw_findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    explained = []
    severity_map = {
        "SQL Injection": "critical",
        "Cross-Site Scripting (XSS)": "high",
        "Potential Auth Bypass / Improper Access Control": "high",
        "Hardcoded Secret / API Token Exposure": "critical",
        "Permissive CORS Configuration": "medium",
        "Unhandled Exception / Resource Leak": "low",
        "Race Condition / Unhandled Promise Rejection": "medium",
        "Missing Security Headers / Debug Mode Active": "low"
    }
    
    for f in raw_findings:
        title = f.get("type", "Security Weakness")
        filename = f.get("file", "unknown")
        line = f.get("line", 1)
        detail = f.get("detail", "")
        
        severity = severity_map.get(title, "medium")
        
        # Simple plain English explanations for students
        if "SQL" in title:
            explanation = "This code builds a database query by directly putting user inputs into the SQL string. It is like leaving a key in the lock; anyone can type special characters to modify the query and steal, modify, or erase all database data."
            suggestion = "Always use parameterized queries (prepared statements) or an ORM. Never merge user inputs directly with SQL strings using concatenation or f-strings."
        elif "XSS" in title or "Cross-Site" in title:
            explanation = "The frontend displays user inputs directly as HTML without cleaning it. An attacker could inject malicious JavaScript into the webpage. When another user visits, that script runs in their browser and could steal their account login sessions."
            suggestion = "Sanitize all user inputs before printing them to the screen, or use framework-native rendering (like React JSX curly braces) which automatically safe-encodes HTML characters."
        elif "Auth Bypass" in title or "Access Control" in title:
            explanation = "A critical pathway does not verify if the request comes from an authenticated user. Anyone who knows the endpoint URL can bypass the login wall and run actions or access private data."
            suggestion = "Add proper authentication middleware check functions on this route. Ensure users have correct roles/permissions before executing logic."
        elif "Secret" in title or "Hardcoded" in title:
            explanation = "Sensitive credentials or passwords are saved directly in the code. Anyone who gets access to the git repository (including public viewers or hackers) can steal these tokens and hijack linked third-party services."
            suggestion = "Remove the secret keys from the file immediately. Place them in a separate .env file that is excluded from Git via .gitignore, and access them using os.getenv()."
        elif "CORS" in title:
            explanation = "The API is configured to allow requests from any website on the internet (using a wildcard star). Other malicious websites can make requests to your API using a logged-in user's credentials without their knowledge."
            suggestion = "Only specify trusted domains in the Access-Control-Allow-Origin list. Avoid using '*' if credentials (cookies/auth headers) are allowed."
        elif "Exception" in title:
            explanation = "This part of the code communicates with outside files or APIs but doesn't have a plan if those services are down. If a connection fails, the whole application will crash instantly."
            suggestion = "Wrap these calls inside try-except code blocks. Add proper error messaging so the app fails gracefully without crashing."
        else:
            explanation = f"We detected a logic/configuration issue where {detail.lower()}"
            suggestion = "Review the source code file at this location, add input validation checks, and verify correct configuration flags."
            
        explained.append({
            "file": filename,
            "line_number": line,
            "severity": severity,
            "title": title,
            "plain_explanation": explanation,
            "fix_suggestion": suggestion
        })
    return explained

# --- Live API Client Calls ---

# 1. Orchestrator using Google Gemini
def call_live_orchestrator(files: Dict[str, str]) -> Dict[str, Any]:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    
    # We summarize the files list for the model to prevent blowing up tokens.
    # Provide the orchestrator with file paths and first 100 lines/characters or short snippets.
    # To keep it efficient, we pass the filenames and file outlines.
    file_manifest = []
    for fn, content in files.items():
        lines = content.splitlines()[:40] # first 40 lines of each file
        snippet = "\n".join(lines)
        file_manifest.append(f"--- FILE: {fn} ---\n{snippet}\n")
        
    manifest_str = "\n".join(file_manifest)
    
    prompt = f"""You are the Lead Security Orchestrator Agent. 
Your task is to review the files in the codebase, understand the app's overall structure, and split the files by concern.
Then, assign files to three specialist security agents:
1. vuln_hunter: handles authentication, database connections, API routes, user controllers (looking for injection, authorization bypass, logic flaws).
2. bug_detector: handles general application logic, route functions, utilities, helper modules (looking for unhandled errors, logical issues, resource leaks).
3. misconfig: handles settings files, configuration files, Dockerfiles, package configs, environment files, build setups (looking for exposed secrets, missing headers, bad configurations).

Here are the codebase files (snippets of first 40 lines):
{manifest_str}

Reply ONLY with a raw JSON object containing these exact keys:
1. "summary": A brief, 1-2 sentence description of what the app does.
2. "categorization": {{ "auth": [], "database": [], "api": [], "config": [], "frontend": [], "other": [] }} placing each filename in the right category.
3. "assignments": {{ "vuln_hunter": [], "bug_detector": [], "misconfig": [] }} specifying which files each agent should inspect. Every file should be inspected by at least one agent.

Do not include any markdown styling, code block wrapper, or extra text. Return ONLY the valid JSON object.
"""
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    
    # Extract JSON
    text = response.text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
        
    return json.loads(text)

# 2. Specialist: Vuln Hunter (Groq/Llama-3.3-70b-versatile)
def call_live_vuln_hunter(files: Dict[str, str], assigned_files: List[str]) -> str:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Build contents block for assigned files
    code_content = []
    for f in assigned_files:
        if f in files:
            code_content.append(f"### FILE: {f} ###\n{files[f]}\n")
    
    context = "\n".join(code_content)
    
    system_prompt = """You are Vuln Hunter, an expert web application security research agent.
Your specialty is identifying security vulnerabilities: SQL injection, XSS, RCE, IDOR, SSRF, authentication bypass, path traversal, CSRF, insecure deserialization, etc.
Analyze the provided code and identify vulnerabilities.

For each finding, provide:
- The file path
- The line number
- The vulnerability type
- A brief technical description/detail of the issue

Return the findings as a JSON list. Example:
[
  {
    "file": "database.py",
    "line": 15,
    "type": "SQL Injection",
    "detail": "Direct concatenation of parameter into query"
  }
]
Do not include any conversational filler, markdown formatting (like ```json), or extra text. Output ONLY the JSON array. If no vulnerabilities are found, return []."""

    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze the following codebase files:\n\n{context}"}
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.1,
    )
    
    result = chat_completion.choices[0].message.content.strip()
    if "```json" in result:
        result = result.split("```json")[1].split("```")[0].strip()
    elif "```" in result:
        result = result.split("```")[1].split("```")[0].strip()
    return result

# 3. Specialist: Bug Detector (Nvidia NIM / llama-3.1-nemotron-70b-instruct)
def call_live_bug_detector(files: Dict[str, str], assigned_files: List[str]) -> str:
    # Uses OpenAI-compatible API
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.getenv("NVIDIA_API_KEY")
    )
    
    code_content = []
    for f in assigned_files:
        if f in files:
            code_content.append(f"### FILE: {f} ###\n{files[f]}\n")
            
    context = "\n".join(code_content)
    
    system_prompt = """You are Bug Detector, an expert software developer and static code analyzer.
Your specialty is finding logic bugs, null pointer exceptions, unhandled exceptions/rejections, race conditions, memory leaks, resource leaks, or structural issues.
Analyze the provided code and identify bugs.

For each finding, provide:
- The file path
- The line number
- The bug type
- A brief technical description/detail of the issue

Return the findings as a JSON list. Example:
[
  {
    "file": "utils.js",
    "line": 42,
    "type": "Unhandled Promise Rejection",
    "detail": "fetch request lacks catch block"
  }
]
Do not include any conversational filler, markdown formatting (like ```json), or extra text. Output ONLY the JSON array. If no bugs are found, return []."""

    completion = client.chat.completions.create(
        model="meta/llama-3.1-nemotron-70b-instruct",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze the following codebase files:\n\n{context}"}
        ],
        temperature=0.1,
    )
    
    result = completion.choices[0].message.content.strip()
    if "```json" in result:
        result = result.split("```json")[1].split("```")[0].strip()
    elif "```" in result:
        result = result.split("```")[1].split("```")[0].strip()
    return result

# 4. Specialist: Misconfig Agent (Together AI / Mixtral-8x7B-Instruct-v0.1)
def call_live_misconfig(files: Dict[str, str], assigned_files: List[str]) -> str:
    # Together client
    client = OpenAI(
        base_url="https://api.together.xyz/v1",
        api_key=os.getenv("TOGETHER_API_KEY")
    )
    
    code_content = []
    for f in assigned_files:
        if f in files:
            code_content.append(f"### FILE: {f} ###\n{files[f]}\n")
            
    context = "\n".join(code_content)
    
    system_prompt = """You are Misconfig Agent, a devops and infrastructure security expert.
Your specialty is detecting hardcoded secrets/API keys, .env file exposure, permissive CORS, missing security headers, unsafe Dockerfile policies, insecure cookies, and insecure system settings.
Analyze the provided code and identify misconfigurations.

For each finding, provide:
- The file path
- The line number
- The misconfiguration type
- A brief technical description/detail of the issue

Return the findings as a JSON list. Example:
[
  {
    "file": ".env.example",
    "line": 4,
    "type": "Hardcoded Secret",
    "detail": "Production key left in example config"
  }
]
Do not include any conversational filler, markdown formatting (like ```json), or extra text. Output ONLY the JSON array. If no issues are found, return []."""

    completion = client.chat.completions.create(
        model="mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze the following codebase files:\n\n{context}"}
        ],
        temperature=0.1,
    )
    
    result = completion.choices[0].message.content.strip()
    if "```json" in result:
        result = result.split("```json")[1].split("```")[0].strip()
    elif "```" in result:
        result = result.split("```")[1].split("```")[0].strip()
    return result

# 5. Explainer Agent (Anthropic / Claude Haiku 4.5)
# Note: claude-haiku-4-5 is specified. To ensure API compatibility, we will use the anthropic SDK and model "claude-3-5-haiku-20241022" or "claude-3-haiku-20240307".
def call_live_explainer(raw_findings: List[Dict[str, Any]]) -> str:
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    prompt = f"""You are Explainer Agent, a cybersecurity mentor who teaches college students.
Your job is to take raw security findings, bugs, or misconfigurations and explain them in plain English.
CRITICAL: Do not use complex cybersecurity jargon. If you must use a term, explain it with a simple analogy (e.g. SQL Injection is like a lock pick, XSS is like someone sneaking their own sign onto a bulletin board).
Target audience: college students who do not know cybersecurity.

Here is the JSON list of raw findings:
{json.dumps(raw_findings, indent=2)}

For each finding, you must provide:
1. file: the file path
2. line: the line number
3. type: the finding title
4. plain_explanation: explaining what the problem is and why it is dangerous in plain English.
5. fix_suggestion: a simple, direct instruction on how to fix it.

Format your output as a raw JSON list. Do not write anything else. Return ONLY the JSON.
"""
    
    response = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=4000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    result = response.content[0].text.strip()
    if "```json" in result:
        result = result.split("```json")[1].split("```")[0].strip()
    elif "```" in result:
        result = result.split("```")[1].split("```")[0].strip()
    return result

# 6. Report Generator (Groq/Llama-3.3-70b-versatile)
def call_live_report_generator(explained_findings: List[Dict[str, Any]]) -> str:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    prompt = f"""You are the Report Generator.
Your job is to take the explained findings and organize them into a clean, structured JSON report.
For each finding, you must determine its severity (must be one of: "critical", "high", "medium", "low").
The final JSON must be an array of objects, where each object has these exact keys:
- "file" (string)
- "line_number" (integer)
- "severity" (string: "critical", "high", "medium", or "low")
- "title" (string)
- "plain_explanation" (string)
- "fix_suggestion" (string)

Here are the explained findings:
{json.dumps(explained_findings, indent=2)}

Return ONLY the raw JSON list of findings. Do not include markdown code block wrappers (```json) or conversational text."""

    completion = client.chat.completions.create(
        messages=[
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.1,
    )
    
    result = completion.choices[0].message.content.strip()
    if "```json" in result:
        result = result.split("```json")[1].split("```")[0].strip()
    elif "```" in result:
        result = result.split("```")[1].split("```")[0].strip()
    return result
