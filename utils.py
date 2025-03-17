import hashlib
import os
from datetime import datetime, timezone
from typing import Dict, List, Tuple

def setup_mongodb_indexes(db):
    """Setup MongoDB indexes for performance and constraints"""
    db['repositories'].create_index('repo_name', unique=True)

def calculate_file_hash(file_path):
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def scan_directory(dir_path: str) -> List[Tuple[str, str]]:
    """
    Scan a directory and return list of (relative_path, absolute_path) tuples
    """
    files = []
    base_path = os.path.abspath(dir_path)
    
    for root, _, filenames in os.walk(dir_path):
        for filename in filenames:
            abs_path = os.path.join(root, filename)
            rel_path = os.path.relpath(abs_path, base_path)
            files.append((rel_path, abs_path))
    
    return files

def process_file_for_staging(file_path: str) -> Dict:
    """
    Process a single file and return its staging metadata
    """
    with open(file_path, 'rb') as f:
        content = f.read()
        
    return {
        'filename': os.path.basename(file_path),
        'path': file_path,  # This will be updated by the calling function
        'sha': calculate_file_hash(file_path),
        'content': content,
        'staged_at': datetime.now(timezone.utc)
    }
