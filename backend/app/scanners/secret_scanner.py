import re
from typing import Dict, List, Any

# Regex patterns mapped to (pattern_name, severity)
SECRET_PATTERNS = {
    "AWS Access Key": (re.compile(r'\b(AKIA[0-9A-Z]{16})\b'), "high"),
    "Google API Key": (re.compile(r'\b(AIzaSy[0-9A-Za-z_-]{33})\b'), "high"),
    "GitHub Token": (re.compile(r'\b(ghp_[a-zA-Z0-9]{36})\b'), "high"),
    "Stripe Live API Key": (re.compile(r'\b(sk_live_[0-9a-zA-Z]{24})\b'), "critical"),
    "Slack Token": (re.compile(r'\b(xox[baprs]-[0-9a-zA-Z-]{10,48})\b'), "high"),
    "Private Key": (re.compile(r'(-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----)'), "critical"),
    "JWT Token": (re.compile(r'\b(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b'), "high"),
    "Database URL": (re.compile(r'\b((?:mysql|postgres|mongodb|redis)://[^\s\'"\)]+)\b'), "high"),
    "Hardcoded Password": (re.compile(r'(?i)\bpassword\s*=\s*[\'"]([^\'"]{6,})[\'"]'), "high"),
    "Generic API Key": (re.compile(r'\b((?:sk|pk)-[a-zA-Z0-9_\-]{20,60})\b|(?i)\b(?:api_key|apikey)\s*=\s*[\'"]([a-zA-Z0-9_\-]{6,})[\'"]'), "high")
}

def mask_value(val: str) -> str:
    val = val.strip()
    if len(val) <= 8:
        if len(val) <= 2:
            return "***"
        return val[:2] + "***" + val[-2:]
    return val[:4] + "***" + val[-4:]

def should_skip_file(filepath: str) -> bool:
    fn_lower = filepath.lower()
    # Skip .env.example
    if fn_lower.endswith(".env.example"):
        return True
    # Skip README.md
    if fn_lower.endswith("readme.md"):
        return True
    # Skip test and mock files
    # E.g. if 'test' or 'mock' is present as part of the filename or directory path
    path_parts = fn_lower.replace("\\", "/").split("/")
    for part in path_parts:
        if "test" in part or "mock" in part:
            return True
    return False

def scan_secrets(files: Dict[str, str]) -> List[Dict[str, Any]]:
    findings = []
    
    for filepath, content in files.items():
        if should_skip_file(filepath):
            continue
            
        filename = filepath.split('/')[-1]
        
        # Check if the file is a .env file and contains actual values
        is_env_file = (filename == ".env" or filepath.endswith("/.env"))
        
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            line_num = idx + 1
            
            # 1. Scan for .env values if it's a .env file
            if is_env_file:
                # E.g. DB_PASS=mysecretvalue
                m = re.match(r'^\s*([A-Z0-9_-]+)\s*=\s*([^#\s]+)', line)
                if m:
                    var_name = m.group(1)
                    val = m.group(2).strip().strip('"').strip("'")
                    # Ignore common placeholders
                    if val and not any(placeholder in val.lower() for placeholder in ["your_", "placeholder", "dummy", "my_"]):
                        masked = mask_value(val)
                        findings.append({
                            "file": filepath,
                            "line_number": line_num,
                            "severity": "high",
                            "title": f"Committed .env Config Value: {var_name}",
                            "plain_explanation": f"Accidentally committed configuration value for '{var_name}' found in .env: {masked}",
                            "fix_suggestion": "Move sensitive configuration parameters to environment variables or gitignore files.",
                            "source": "scanner",
                            "type": "secret",
                            "masked_value": masked,
                            "pattern_type": "Committed .env Value"
                        })
                continue
            
            # 2. Scan other files using regex patterns
            for pattern_name, (pattern, severity) in SECRET_PATTERNS.items():
                for match in pattern.finditer(line):
                    groups = [g for g in match.groups() if g is not None]
                    secret_val = groups[0] if groups else match.group(0)
                    masked = mask_value(secret_val)
                    
                    findings.append({
                        "file": filepath,
                        "line_number": line_num,
                        "severity": severity,
                        "title": f"Hardcoded {pattern_name} Found",
                        "plain_explanation": f"A hardcoded {pattern_name} was detected: {masked}",
                        "fix_suggestion": "Remove the hardcoded secret and load it dynamically using secure environment variables or a key vault.",
                        "source": "scanner",
                        "type": "secret",
                        "masked_value": masked,
                        "pattern_type": pattern_name
                    })
                    
    return findings
