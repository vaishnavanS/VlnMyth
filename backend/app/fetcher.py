import os
import shutil
import tempfile
import zipfile
import re
from typing import Dict, List, Tuple

# Common directories and files to exclude from analysis to save tokens and focus on source code
EXCLUDE_DIRS = {
    "node_modules", "venv", ".venv", "env", ".git", "__pycache__", 
    "dist", "build", ".next", ".cache", "out", "target", "bin", "obj"
}
EXCLUDE_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
    "Pipfile.lock", ".DS_Store", "favicon.ico"
}
# Binary extensions to ignore
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz", 
    ".exe", ".dll", ".so", ".dylib", ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mp3", ".wav", ".db", ".sqlite", ".pyc"
}

def is_text_file(filepath: str) -> bool:
    _, ext = os.path.splitext(filepath.lower())
    if ext in BINARY_EXTENSIONS:
        return False
    # Check if file seems text-like by reading a small chunk
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(1024)
            if b'\x00' in chunk:
                return False
    except Exception:
        return False
    return True

def clean_github_url(url: str) -> str:
    """Standardize GitHub URL to cloneable HTTPS url."""
    url = url.strip()
    # Handle ssh or other formats if needed, but primarily format standard urls
    if url.endswith(".git"):
        return url
    return url + ".git"

def fetch_codebase_from_git(repo_url: str) -> Tuple[Dict[str, str], str]:
    """Clones the repo into a temporary folder, walks it, and returns file contents."""
    temp_dir = tempfile.mkdtemp(prefix="vulnlens_git_")
    try:
        import subprocess
        clean_url = clean_github_url(repo_url)
        result = subprocess.run(
            ["git", "clone", "--depth=1", clean_url, temp_dir],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            raise Exception(result.stderr)
        files_dict = read_files_from_dir(temp_dir)
        return files_dict, temp_dir
    except Exception as e:
        # Cleanup if failed
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise ValueError(f"Failed to clone repository: {str(e)}")

def fetch_codebase_from_zip(zip_path: str) -> Tuple[Dict[str, str], str]:
    """Extracts zip into a temporary folder, walks it, and returns file contents."""
    temp_dir = tempfile.mkdtemp(prefix="vulnlens_zip_")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        files_dict = read_files_from_dir(temp_dir)
        return files_dict, temp_dir
    except Exception as e:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise ValueError(f"Failed to extract zip file: {str(e)}")

def read_files_from_dir(directory: str) -> Dict[str, str]:
    """Walks the directory and reads file contents up to a limit of 50 files."""
    files_dict = {}
    file_count = 0
    max_files = 50

    for root, dirs, files in os.walk(directory):
        # In-place modify dirs to skip excluded directories during walk
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
        
        for file in files:
            if file in EXCLUDE_FILES or file.startswith('.'):
                continue
                
            abs_path = os.path.join(root, file)
            if not is_text_file(abs_path):
                continue
                
            rel_path = os.path.relpath(abs_path, directory)
            
            try:
                with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check for empty files
                if not content.strip():
                    continue
                    
                files_dict[rel_path] = content
                file_count += 1
                if file_count >= max_files:
                    break
            except Exception:
                continue
        
        if file_count >= max_files:
            break
            
    return files_dict
