import hashlib

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
