import os
import json
import asyncio
from typing import Dict, List, Any
from langgraph.graph import StateGraph, END

from app.models import (
    AnalyzerState,
    is_mock_mode,
    run_mock_orchestrator,
    run_mock_vuln_hunter,
    run_mock_bug_detector,
    run_mock_misconfig,
    run_mock_explainer,
    call_live_orchestrator,
    call_live_vuln_hunter,
    call_live_bug_detector,
    call_live_misconfig,
    call_live_explainer,
    call_live_report_generator
)

# --- Node 1: Code Base Orchestration ---
def orchestrate_codebase_node(state: AnalyzerState) -> Dict[str, Any]:
    logs = list(state.get("logs", []))
    logs.append("Orchestrator Agent: Starting codebase structure analysis...")
    
    files = state["files"]
    if not files:
        return {
            "logs": logs + ["Orchestrator Agent: No files found to analyze!"],
            "error": "No files found to analyze"
        }
        
    mock = is_mock_mode()
    if mock:
        logs.append("Orchestrator Agent: [MOCK MODE] Key(s) missing, running mock orchestrator...")
        res = run_mock_orchestrator(files)
    else:
        try:
            logs.append("Orchestrator Agent: Analyzing codebase concern areas with Gemini...")
            res = call_live_orchestrator(files)
        except Exception as e:
            logs.append(f"Orchestrator Agent Warning: Gemini API call failed ({str(e)}). Falling back to rule-based categorization.")
            res = run_mock_orchestrator(files)
            
    logs.append(f"Orchestrator Agent: Categorized codebase. Assignments: "
                f"vuln_hunter: {len(res['assignments'].get('vuln_hunter', []))} files, "
                f"bug_detector: {len(res['assignments'].get('bug_detector', []))} files, "
                f"misconfig: {len(res['assignments'].get('misconfig', []))} files.")
                
    return {
        "app_summary": res["summary"],
        "categorization": res["categorization"],
        "assignments": res["assignments"],
        "logs": logs
    }

# --- Node 2: Specialist - Vuln Hunter ---
async def vuln_hunter_node(state: AnalyzerState) -> Dict[str, Any]:
    logs = list(state.get("logs", []))
    logs.append("Vuln Hunter Agent: Running parallel vulnerability analysis (SQLi, XSS, RCE, Auth)...")
    
    files = state["files"]
    assigned = state["assignments"].get("vuln_hunter", [])
    
    if not assigned:
        logs.append("Vuln Hunter Agent: No files assigned. Skipping.")
        return {"vuln_hunter_raw": "[]", "logs": logs}
        
    mock = is_mock_mode()
    if mock:
        await asyncio.sleep(1)  # Simulate latency
        res = run_mock_vuln_hunter({k: files[k] for k in assigned if k in files})
    else:
        try:
            # Wrap synchronous SDK call in run_in_executor to execute in worker thread
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(
                None, call_live_vuln_hunter, files, assigned
            )
        except Exception as e:
            logs.append(f"Vuln Hunter Agent Error: {str(e)}. Attempting mock safety fallback...")
            res = run_mock_vuln_hunter({k: files[k] for k in assigned if k in files})
            
    logs.append("Vuln Hunter Agent: Completed analysis.")
    return {"vuln_hunter_raw": res, "logs": logs}

# --- Node 3: Specialist - Bug Detector ---
async def bug_detector_node(state: AnalyzerState) -> Dict[str, Any]:
    logs = list(state.get("logs", []))
    logs.append("Bug Detector Agent: Running parallel logic & exception checking (race conditions, logic bugs)...")
    
    files = state["files"]
    assigned = state["assignments"].get("bug_detector", [])
    
    if not assigned:
        logs.append("Bug Detector Agent: No files assigned. Skipping.")
        return {"bug_detector_raw": "[]", "logs": logs}
        
    mock = is_mock_mode()
    if mock:
        await asyncio.sleep(1.2)  # Simulate latency
        res = run_mock_bug_detector({k: files[k] for k in assigned if k in files})
    else:
        try:
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(
                None, call_live_bug_detector, files, assigned
            )
        except Exception as e:
            logs.append(f"Bug Detector Agent Error: {str(e)}. Attempting mock safety fallback...")
            res = run_mock_bug_detector({k: files[k] for k in assigned if k in files})
            
    logs.append("Bug Detector Agent: Completed analysis.")
    return {"bug_detector_raw": res, "logs": logs}

# --- Node 4: Specialist - Misconfig Agent ---
async def misconfig_node(state: AnalyzerState) -> Dict[str, Any]:
    logs = list(state.get("logs", []))
    logs.append("Misconfig Agent: Running parallel configuration audit (env, CORS, Docker, secrets)...")
    
    files = state["files"]
    assigned = state["assignments"].get("misconfig", [])
    
    if not assigned:
        logs.append("Misconfig Agent: No files assigned. Skipping.")
        return {"misconfig_raw": "[]", "logs": logs}
        
    mock = is_mock_mode()
    if mock:
        await asyncio.sleep(0.8)  # Simulate latency
        res = run_mock_misconfig({k: files[k] for k in assigned if k in files})
    else:
        try:
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(
                None, call_live_misconfig, files, assigned
            )
        except Exception as e:
            logs.append(f"Misconfig Agent Error: {str(e)}. Attempting mock safety fallback...")
            res = run_mock_misconfig({k: files[k] for k in assigned if k in files})
            
    logs.append("Misconfig Agent: Completed analysis.")
    return {"misconfig_raw": res, "logs": logs}

# --- Node 5: Explainer Agent ---
def explain_findings_node(state: AnalyzerState) -> Dict[str, Any]:
    logs = list(state.get("logs", []))
    logs.append("Explainer Agent: Aggregating specialist findings and translating into student-friendly terms...")
    
    # Safely load findings
    raw_findings = []
    
    def parse_findings(raw_str: str, agent_name: str) -> List[Dict[str, Any]]:
        try:
            if not raw_str or raw_str.strip() == "":
                return []
            parsed = json.loads(raw_str)
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception as e:
            logs.append(f"Explainer Agent: Failed to parse raw output from {agent_name}: {str(e)}")
            return []

    vh_findings = parse_findings(state.get("vuln_hunter_raw", "[]"), "Vuln Hunter")
    bd_findings = parse_findings(state.get("bug_detector_raw", "[]"), "Bug Detector")
    mc_findings = parse_findings(state.get("misconfig_raw", "[]"), "Misconfig Agent")
    
    # Merge findings, keeping track of sources
    raw_findings.extend(vh_findings)
    raw_findings.extend(bd_findings)
    raw_findings.extend(mc_findings)
    
    if not raw_findings:
        logs.append("Explainer Agent: No raw findings to translate.")
        return {"explained_findings": [], "logs": logs}
        
    mock = is_mock_mode()
    if mock:
        res = run_mock_explainer(raw_findings)
    else:
        try:
            logs.append("Explainer Agent: Calling Claude Haiku for student-friendly explanations...")
            explained_str = call_live_explainer(raw_findings)
            res = json.loads(explained_str)
        except Exception as e:
            logs.append(f"Explainer Agent Error: {str(e)}. Falling back to local explainer.")
            res = run_mock_explainer(raw_findings)
            
    logs.append(f"Explainer Agent: Completed translation for {len(res)} findings.")
    return {
        "explained_findings": res,
        "logs": logs
    }

# --- Node 6: Report Generator ---
def generate_report_node(state: AnalyzerState) -> Dict[str, Any]:
    logs = list(state.get("logs", []))
    logs.append("Report Generator Agent: Formatting final JSON report and determining severities...")
    
    explained = state.get("explained_findings", [])
    if not explained:
        logs.append("Report Generator Agent: No findings to format.")
        return {"final_report": [], "logs": logs}
        
    mock = is_mock_mode()
    if mock:
        # Our explainer already outputs the desired format for demo purposes
        # Let's clean the JSON schema to match the requested format
        cleaned_report = []
        for item in explained:
            cleaned_report.append({
                "file": item.get("file", "unknown"),
                "line_number": int(item.get("line_number", 1)),
                "severity": item.get("severity", "medium").lower(),
                "title": item.get("title", "Security Flaw"),
                "plain_explanation": item.get("plain_explanation", ""),
                "fix_suggestion": item.get("fix_suggestion", "")
            })
        final_report = cleaned_report
    else:
        try:
            logs.append("Report Generator Agent: Ordering findings with Llama...")
            report_str = call_live_report_generator(explained)
            final_report = json.loads(report_str)
        except Exception as e:
            logs.append(f"Report Generator Agent Error: {str(e)}. Applying rule-based formatting.")
            # Fallback format
            cleaned_report = []
            for item in explained:
                cleaned_report.append({
                    "file": item.get("file", "unknown"),
                    "line_number": int(item.get("line_number", 1)),
                    "severity": item.get("severity", "medium").lower(),
                    "title": item.get("title", "Security Flaw"),
                    "plain_explanation": item.get("plain_explanation", ""),
                    "fix_suggestion": item.get("fix_suggestion", "")
                })
            final_report = cleaned_report
            
    logs.append(f"Report Generator Agent: Outputting final report containing {len(final_report)} issues.")
    return {
        "final_report": final_report,
        "logs": logs
    }

# --- Create LangGraph Workflow ---
def create_analyzer_graph() -> StateGraph:
    workflow = StateGraph(AnalyzerState)
    
    # Add Nodes
    workflow.add_node("orchestrator", orchestrate_codebase_node)
    workflow.add_node("vuln_hunter", vuln_hunter_node)
    workflow.add_node("bug_detector", bug_detector_node)
    workflow.add_node("misconfig", misconfig_node)
    workflow.add_node("explainer", explain_findings_node)
    workflow.add_node("report_generator", generate_report_node)
    
    # Set entry point
    workflow.set_entry_point("orchestrator")
    
    # Orchestrator forks parallel specialist agents
    workflow.add_edge("orchestrator", "vuln_hunter")
    workflow.add_edge("orchestrator", "bug_detector")
    workflow.add_edge("orchestrator", "misconfig")
    
    # Specialists run and then join at the explainer agent
    workflow.add_edge("vuln_hunter", "explainer")
    workflow.add_edge("bug_detector", "explainer")
    workflow.add_edge("misconfig", "explainer")
    
    # Explainer runs, then outputs to report generator
    workflow.add_edge("explainer", "report_generator")
    
    # Report generator finishes the flow
    workflow.add_edge("report_generator", END)
    
    return workflow.compile()
