import re
import json
import xml.etree.ElementTree as ET
import asyncio
import httpx
import os
from typing import Dict, List, Any, Optional

def clean_npm_version(ver_str: str) -> str:
    # Extract version like 1.2.3 from ^1.2.3, ~1.2.3, etc.
    m = re.search(r'(\d+\.\d+\.\d+(?:-[a-zA-Z0-9\.]+)*)', ver_str)
    if m:
        return m.group(1)
    return ver_str.lstrip('^~>=<').strip()

def parse_requirements_txt(content: str) -> List[Dict[str, str]]:
    deps = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('-'):
            continue
        # Strip inline comments or environment markers
        line = line.split(';')[0].strip()
        # Match name followed by comparator and version
        m = re.match(r'^([a-zA-Z0-9_\-\.\[\]]+)\s*(?:==|>=|<=|>|<|!=|~=|@)\s*([a-zA-Z0-9_\-\.]+)', line)
        if m:
            name = m.group(1).strip()
            # remove extras like [security]
            name = re.sub(r'\[.*\]', '', name).strip()
            version = m.group(2).strip()
            deps.append({"name": name, "version": version, "ecosystem": "PyPI"})
        else:
            name = line.strip()
            if re.match(r'^[a-zA-Z0-9_\-\.\[\]]+$', name):
                name = re.sub(r'\[.*\]', '', name).strip()
                deps.append({"name": name, "version": None, "ecosystem": "PyPI"})
    return deps

def parse_package_json(content: str) -> List[Dict[str, str]]:
    deps = []
    try:
        data = json.loads(content)
        for key in ["dependencies", "devDependencies"]:
            if key in data and isinstance(data[key], dict):
                for name, ver in data[key].items():
                    cleaned_ver = clean_npm_version(str(ver))
                    # Ignore workspace or local protocol versions
                    if cleaned_ver.startswith("file:") or cleaned_ver.startswith("link:"):
                        continue
                    deps.append({"name": name, "version": cleaned_ver, "ecosystem": "npm"})
    except Exception:
        pass
    return deps

def parse_pipfile(content: str) -> List[Dict[str, str]]:
    deps = []
    in_packages = False
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('[') and line.endswith(']'):
            section = line[1:-1].strip()
            if section in ["packages", "dev-packages"]:
                in_packages = True
            else:
                in_packages = False
            continue
        if in_packages:
            if '=' in line:
                parts = line.split('=', 1)
                name = parts[0].strip().strip('"').strip("'").strip()
                val = parts[1].strip()
                version = None
                if val.startswith('{') and 'version' in val:
                    m = re.search(r'version\s*=\s*["\']([^"\']+)["\']', val)
                    if m:
                        version = m.group(1)
                else:
                    version = val.strip('"').strip("'").strip()
                
                if version == '*':
                    version = None
                elif version:
                    version = version.lstrip('=').strip()
                
                deps.append({"name": name, "version": version, "ecosystem": "PyPI"})
    return deps

def parse_pom_xml(content: str) -> List[Dict[str, str]]:
    deps = []
    try:
        # Strip xmlns prefix declaration to simplify XPath queries without namespaces
        clean_xml = re.sub(r'\sxmlns="[^"]+"', '', content)
        root = ET.fromstring(clean_xml)
        for dep in root.findall('.//dependency'):
            group_id_el = dep.find('groupId')
            artifact_id_el = dep.find('artifactId')
            version_el = dep.find('version')
            
            if group_id_el is not None and artifact_id_el is not None:
                group_id = group_id_el.text.strip() if group_id_el.text else ""
                artifact_id = artifact_id_el.text.strip() if artifact_id_el.text else ""
                version = version_el.text.strip() if (version_el is not None and version_el.text) else None
                
                if version and version.startswith('${') and version.endswith('}'):
                    prop_name = version[2:-1]
                    prop_el = root.find(f'.//properties/{prop_name}')
                    if prop_el is not None and prop_el.text:
                        version = prop_el.text.strip()
                    else:
                        version = None
                
                if group_id and artifact_id:
                    name = f"{group_id}:{artifact_id}"
                    deps.append({"name": name, "version": version, "ecosystem": "Maven"})
    except Exception:
        pass
    return deps

def extract_severity(vuln: Dict[str, Any]) -> str:
    # 1. Check database_specific.severity
    db_spec = vuln.get("database_specific", {})
    if isinstance(db_spec, dict):
        sev = db_spec.get("severity")
        if sev:
            sev_lower = str(sev).lower()
            if sev_lower in ["critical", "high", "medium", "moderate", "low"]:
                return "medium" if sev_lower == "moderate" else sev_lower
        
        # 2. Check database_specific.cvss.score
        cvss = db_spec.get("cvss", {})
        if isinstance(cvss, dict):
            score = cvss.get("score")
            if score is not None:
                try:
                    val = float(score)
                    if val >= 9.0: return "critical"
                    elif val >= 7.0: return "high"
                    elif val >= 4.0: return "medium"
                    else: return "low"
                except ValueError:
                    pass

    # 3. Check affected elements
    for aff in vuln.get("affected", []):
        aff_spec = aff.get("database_specific", {})
        if isinstance(aff_spec, dict):
            sev = aff_spec.get("severity")
            if sev:
                sev_lower = str(sev).lower()
                if sev_lower in ["critical", "high", "medium", "moderate", "low"]:
                    return "medium" if sev_lower == "moderate" else sev_lower
        
        # Check ecosystem_specific
        eco_spec = aff.get("ecosystem_specific", {})
        if isinstance(eco_spec, dict):
            sev = eco_spec.get("severity")
            if sev:
                sev_lower = str(sev).lower()
                if sev_lower in ["critical", "high", "medium", "moderate", "low"]:
                    return "medium" if sev_lower == "moderate" else sev_lower

    # 4. Check top-level severity array
    sev_list = vuln.get("severity", [])
    if isinstance(sev_list, list):
        for s in sev_list:
            if isinstance(s, dict):
                score_val = s.get("score")
                if score_val:
                    try:
                        val = float(score_val)
                        if val >= 9.0: return "critical"
                        elif val >= 7.0: return "high"
                        elif val >= 4.0: return "medium"
                        else: return "low"
                    except ValueError:
                        # Vector string. Let's do basic parsing of CVSS vector.
                        v = str(score_val).upper()
                        if "C:H" in v and "I:H" in v and "A:H" in v:
                            if "PR:N" in v or "PR:L" in v:
                                return "critical"
                            return "high"
                        elif "C:H" in v or "I:H" in v or "A:H" in v:
                            return "high"
                        elif "C:M" in v or "I:M" in v or "A:M" in v or "C:L" in v or "I:L" in v or "A:L" in v:
                            return "medium"
                        
    return "medium"

def get_fix_suggestion(vuln: Dict[str, Any], package_name: str) -> str:
    fixed_versions = []
    for aff in vuln.get("affected", []):
        aff_pkg = aff.get("package", {})
        if aff_pkg.get("name", "").lower() == package_name.lower():
            for r in aff.get("ranges", []):
                for ev in r.get("events", []):
                    fixed = ev.get("fixed")
                    if fixed:
                        fixed_versions.append(fixed)
    if fixed_versions:
        uniq_fixed = list(set(fixed_versions))
        if len(uniq_fixed) == 1:
            return f"upgrade to version {uniq_fixed[0]}"
        else:
            return f"upgrade to version {', '.join(uniq_fixed)}"
    return "upgrade to the latest secure version"

async def scan_dependencies(files: Dict[str, str]) -> List[Dict[str, Any]]:
    findings = []
    parsed_deps = [] # list of (file_path, dep_dict)

    # 1. Parse files
    for filepath, content in files.items():
        filename = filepath.split('/')[-1]
        if filename == "requirements.txt":
            for dep in parse_requirements_txt(content):
                parsed_deps.append((filepath, dep))
        elif filename == "package.json":
            for dep in parse_package_json(content):
                parsed_deps.append((filepath, dep))
        elif filename == "Pipfile":
            for dep in parse_pipfile(content):
                parsed_deps.append((filepath, dep))
        elif filename == "pom.xml":
            for dep in parse_pom_xml(content):
                parsed_deps.append((filepath, dep))

    if not parsed_deps:
        return findings

    # 2. Query OSV.dev API
    async with httpx.AsyncClient() as client:
        for filepath, dep in parsed_deps:
            payload = {
                "package": {
                    "name": dep["name"],
                    "ecosystem": dep["ecosystem"]
                }
            }
            if dep["version"]:
                payload["version"] = dep["version"]

            # Graceful request with rate limit / retry handling
            data = None
            for attempt in range(3):
                try:
                    resp = await client.post("https://api.osv.dev/v1/query", json=payload, timeout=10.0)
                    if resp.status_code == 429:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    break
                except Exception:
                    if attempt == 2:
                        break
                    await asyncio.sleep(1.0)
            
            # Rate limiting sleep between requests
            await asyncio.sleep(0.1)

            if not data or "vulns" not in data:
                continue

            for vuln in data["vulns"]:
                # Determine CVE ID or OSV ID
                cve_id = vuln.get("id", "UNKNOWN-ID")
                aliases = vuln.get("aliases", [])
                if isinstance(aliases, list):
                    for alias in aliases:
                        if alias.startswith("CVE-"):
                            cve_id = alias
                            break

                # Parse details
                summary = vuln.get("summary")
                details = vuln.get("details", "")
                title = summary if summary else (details.split('\n')[0][:100] if details else f"Vulnerability in {dep['name']}")
                plain_explanation = details if details else "No detailed description available."
                
                severity = extract_severity(vuln)
                fix_suggestion = get_fix_suggestion(vuln, dep["name"])

                findings.append({
                    "file": filepath,
                    "line_number": 1, # default line number for dependency file
                    "severity": severity,
                    "title": title,
                    "plain_explanation": plain_explanation,
                    "fix_suggestion": fix_suggestion,
                    "source": "scanner",
                    "type": "cve",
                    "cve_id": cve_id,
                    "package": dep["name"],
                    "version": dep["version"] or "unknown"
                })

    # Simplify and translate CVE explanations into student-friendly text
    if findings:
        explained_tasks = [explain_cve_finding(f) for f in findings]
        findings = await asyncio.gather(*explained_tasks)

    return findings

def clean_cve_explanation_fallback(details: str) -> str:
    if not details:
        return "No detailed description available."
        
    lines = details.splitlines()
    cleaned_lines = []
    
    discard_sections = ["### details", "### poc", "### proof of concept", "### patches", "### workarounds", "### references", "## references"]
    
    for line in lines:
        line_lower = line.lower().strip()
        if any(sec in line_lower for sec in discard_sections):
            break
        if line_lower.startswith("### summary") or line_lower.startswith("### impact"):
            parts = line.split(" ", 2)
            if len(parts) > 2:
                cleaned_lines.append(parts[2])
            continue
        cleaned_lines.append(line)
        
    cleaned_text = "\n".join(cleaned_lines).strip()
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    
    if not cleaned_text:
        return details[:300] + "..." if len(details) > 300 else details
        
    return cleaned_text

async def explain_cve_finding(finding: Dict[str, Any]) -> Dict[str, Any]:
    title = finding.get("title", "")
    package = finding.get("package", "unknown")
    raw_explanation = finding.get("plain_explanation", "")
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.strip() == "" or api_key.startswith("your_"):
        finding["plain_explanation"] = clean_cve_explanation_fallback(raw_explanation)
        return finding
        
    try:
        from groq import Groq
        loop = asyncio.get_running_loop()
        
        def call_groq():
            client = Groq(api_key=api_key)
            system_prompt = (
                "You are a friendly cybersecurity mentor for student developers. "
                "Your task is to take a highly technical dependency vulnerability description (CVE) "
                "and explain it in plain, simple English (no complex jargon). "
                "Use a simple real-world analogy if helpful. "
                "Keep the explanation brief (1-3 sentences) and highly encouraging. "
                "Also provide a direct, simple recommendation on how to fix/remediate it (e.g. upgrading the package)."
            )
            user_content = (
                f"Vulnerability Title: {title}\n"
                f"Package: {package}\n"
                f"Technical details:\n{raw_explanation}\n\n"
                "Return a JSON object with these exact keys:\n"
                "- plain_explanation (string)\n"
                "- fix_suggestion (string)\n"
            )
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            return chat_completion.choices[0].message.content.strip()
            
        result_str = await loop.run_in_executor(None, call_groq)
        res = json.loads(result_str)
        if "plain_explanation" in res:
            finding["plain_explanation"] = res["plain_explanation"]
        if "fix_suggestion" in res:
            finding["fix_suggestion"] = res["fix_suggestion"]
            
    except Exception:
        finding["plain_explanation"] = clean_cve_explanation_fallback(raw_explanation)
        
    return finding
