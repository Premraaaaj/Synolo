from flask import Flask, request, jsonify
import hashlib
import difflib
from datetime import datetime
from flasgger import Swagger  # type: ignore
from pymongo import MongoClient
from bson import ObjectId
import os
import logging

# Initialize Flask app
app = Flask(__name__)
swagger = Swagger(app)

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['version_control_system']
repos_collection = db['repositories']
staging_collection = db['staging']

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_mongodb_indexes():
    """Setup MongoDB indexes for performance and constraints"""
    repos_collection.create_index('repo_name', unique=True)

def calculate_file_hash(file_path):
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

@app.route('/repo/create/<repo_name>', methods=['POST'])
def create_repo(repo_name):
    """
    Create a new repository
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
    responses:
      201:
        description: Repository created successfully
      400:
        description: Repository already exists or invalid name
      500:
        description: Database error
    """
    # Validate repository name
    if not repo_name or not repo_name.strip():
        return jsonify({'error': 'Repository name cannot be empty'}), 400
    
    if not repo_name.isalnum() and not all(c.isalnum() or c in '-_' for c in repo_name):
        return jsonify({'error': 'Repository name can only contain letters, numbers, hyphens and underscores'}), 400

    try:
        repos_collection.insert_one({
            'repo_name': repo_name,
            'folders': {},
            'commits': [],
            'created_at': datetime.utcnow()
        })
        return jsonify({'message': f'Repository "{repo_name}" created successfully'}), 201
    
    except Exception as e:
        if 'duplicate key error' in str(e).lower():
            return jsonify({'error': 'Repository already exists'}), 400
        return jsonify({'error': f'Error creating repository: {str(e)}'}), 500


@app.route('/repo/delete/<repo_name>', methods=['DELETE'])
def delete_repo(repo_name):
    """
    Delete a repository
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
    responses:
      200:
        description: Repository deleted successfully
      404:
        description: Repository not found
    """
    result = repos_collection.delete_one({'repo_name': repo_name})
    if result.deleted_count == 0:
        return jsonify({'error': 'Repository not found'}), 404
    return jsonify({'message': f'Repository "{repo_name}" deleted successfully'}), 200

@app.route('/repo/list', methods=['GET'])
def list_repos():
    """
    List all repositories
    ---
    tags:
      - Repositories
    responses:
      200:
        description: List of repositories
    """
    repos = list(repos_collection.find({}, {'_id': 0, 'repo_name': 1}))
    return jsonify({'repositories': repos}), 200

@app.route('/stage/<repo_name>', methods=['POST'])
def stage_file(repo_name):
    """
    Stage a file for commit
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
      - name: file_path
        in: body
        required: true
        schema:
          type: object
          required:
            - path
          properties:
            path:
              type: string
              description: Absolute path of the file to stage
    responses:
      200:
        description: File staged successfully
        schema:
          type: object
          properties:
            message:
              type: string
              example: File "C:/Users/file.txt" staged successfully
      400:
        description: Error in staging file
        schema:
          type: object
          properties:
            error:
              type: string
              example: File does not exist
    """
    logger.info(f"Staging file for repository: {repo_name}")
    repo = repos_collection.find_one({'repo_name': repo_name})
    if not repo:
        logger.error(f"Repository {repo_name} does not exist")
        return jsonify({'error': 'Repository does not exist'}), 400

    data = request.json
    if not data or 'path' not in data:
        logger.error("File path is required")
        return jsonify({'error': 'File path is required'}), 400

    source_path = data['path']
    if not os.path.exists(source_path):
        logger.error(f"Source file {source_path} does not exist")
        return jsonify({'error': 'Source file does not exist'}), 400

    try:
        file_name = os.path.basename(source_path)
        file_hash = calculate_file_hash(source_path)
        folder = os.path.dirname(source_path).replace('\\', '/')

        with open(source_path, 'rb') as f:
            file_content = f.read()

        staging_doc = staging_collection.find_one({'repo_name': repo_name})
        if not staging_doc:
            staging_doc = {'repo_name': repo_name, 'folders': {}}

        if folder not in staging_doc['folders']:
            staging_doc['folders'][folder] = []

        staging_doc['folders'][folder].append({'filename': file_name, 'sha': file_hash, 'content': file_content})
        staging_collection.update_one({'repo_name': repo_name}, {'$set': staging_doc}, upsert=True)

        logger.info(f"File {source_path} staged successfully")
        return jsonify({'message': f'File "{source_path}" staged successfully'}), 200

    except Exception as e:
        logger.error(f"Error staging file: {str(e)}")
        return jsonify({'error': f'Error staging file: {str(e)}'}), 400

@app.route('/unstage/<repo_name>/<file_path>', methods=['DELETE'])
def unstage_file(repo_name, file_path):
    """
    Unstage a file
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
      - name: file_path
        in: path
        type: string
        required: true
        description: The path of the file to unstage
    responses:
      200:
        description: File unstaged successfully
      400:
        description: Error message
    """
    folder = os.path.dirname(file_path).replace('\\', '/')
    file_name = os.path.basename(file_path)
    staging_doc = staging_collection.find_one({'repo_name': repo_name})
    if not staging_doc or folder not in staging_doc['folders']:
        return jsonify({'error': 'File not found in staging area'}), 400

    files = staging_doc['folders'][folder]
    updated_files = [f for f in files if f['filename'] != file_name]
    if len(files) == len(updated_files):
        return jsonify({'error': 'File not found in staging area'}), 400

    if updated_files:
        staging_doc['folders'][folder] = updated_files
    else:
        del staging_doc['folders'][folder]

    staging_collection.update_one({'repo_name': repo_name}, {'$set': staging_doc})
    return jsonify({'message': f'File "{file_path}" unstaged successfully'}), 200

@app.route('/staged/<repo_name>', methods=['GET'])
def list_staged_files(repo_name):
    """
    List staged files
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
    responses:
      200:
        description: List of staged files
    """
    staged_files = staging_collection.find_one({'repo_name': repo_name}, {'_id': 0, 'folders': 1})
    if not staged_files:
        return jsonify({'staged_files': []}), 200
    return jsonify({'staged_files': staged_files['folders']}), 200

@app.route('/commit/<repo_name>', methods=['POST'])
def commit_changes(repo_name):
    """
    Commit staged changes
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - message
          properties:
            message:
              type: string
              description: Commit message
            author:
              type: string
              description: Author of the commit
    responses:
      200:
        description: Changes committed successfully
      400:
        description: Error message
    """
    data = request.json
    commit_message = data.get('message')
    author = data.get('author', 'Unknown')
    if not commit_message:
        return jsonify({'error': 'Commit message is required'}), 400

    staging_doc = staging_collection.find_one({'repo_name': repo_name})
    if not staging_doc:
        return jsonify({'error': 'No files staged for commit'}), 400

    repo = repos_collection.find_one({'repo_name': repo_name})
    if not repo:
        return jsonify({'error': 'Repository does not exist'}), 400

    commit_id = str(ObjectId())
    commit_data = {
        'commit_id': commit_id,
        'timestamp': datetime.utcnow(),
        'message': commit_message,
        'author': author,
        'folders': staging_doc['folders']
    }

    repo['commits'].append(commit_data)
    for folder, files in staging_doc['folders'].items():
        if folder not in repo['folders']:
            repo['folders'][folder] = []
        repo['folders'][folder].extend(files)

    repos_collection.update_one({'repo_name': repo_name}, {'$set': repo})
    staging_collection.delete_one({'repo_name': repo_name})

    return jsonify({'message': 'Changes committed successfully', 'commit_id': commit_id}), 200

@app.route('/history/<repo_name>', methods=['GET'])
def get_commit_history(repo_name):
    """
    Get commit history
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
    responses:
      200:
        description: Commit history retrieved successfully
    """
    repo = repos_collection.find_one({'repo_name': repo_name}, {'commits': 1, '_id': 0})
    if not repo:
        return jsonify({'error': 'Repository not found'}), 404
    return jsonify({'commits': repo['commits']}), 200

@app.route('/diff/<repo_name>/<file_path>', methods=['GET'])
def get_file_diff(repo_name, file_path):
    """
    Get file differences
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
      - name: file_path
        in: path
        type: string
        required: true
        description: The path of the file
    responses:
      200:
        description: File differences retrieved successfully
    """
    repo = repos_collection.find_one({'repo_name': repo_name})
    if not repo:
        return jsonify({'error': 'Repository not found'}), 404

    folder = os.path.dirname(file_path).replace('\\', '/')
    file_name = os.path.basename(file_path)
    last_commit = repo['commits'][-1] if repo['commits'] else None
    if not last_commit:
        return jsonify({'error': 'No previous versions found'}), 400

    file_version = next((f for f in last_commit['folders'].get(folder, []) if f['filename'] == file_name), None)
    if not file_version:
        return jsonify({'error': 'File not found in last commit'}), 404

    current_file = staging_collection.find_one({'repo_name': repo_name, f'folders.{folder}.filename': file_name}, {'folders.$': 1})
    if not current_file:
        return jsonify({'error': 'File not found in staging area'}), 400

    current_content = current_file['folders'][folder][0]['content'].decode('utf-8').splitlines()
    last_content = file_version['content'].decode('utf-8').splitlines()
    diff = difflib.unified_diff(last_content, current_content, fromfile='last_version', tofile='current_version')
    return jsonify({'diff': '\n'.join(diff)}), 200

@app.route('/rollback/<repo_name>/<file_path>', methods=['POST'])
def rollback_changes(repo_name, file_path):
    """
    Rollback changes to a file
    ---
    tags:
      - Version Control
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: Repository name
      - name: file_path
        in: path
        type: string
        required: true
        description: Path to the file to rollback
      - name: commit_id
        in: query
        type: string
        required: false
        description: Optional specific commit ID to rollback to
    responses:
      200:
        description: File rolled back successfully
        schema:
          type: object
          properties:
            message:
              type: string
              example: File test.py rolled back successfully
            commit_id:
              type: string
              example: 507f1f77bcf86cd799439011
      400:
        description: Error in rollback operation
        schema:
          type: object
          properties:
            error:
              type: string
              example: No previous commits found
      404:
        description: Repository or file not found
        schema:
          type: object
          properties:
            error:
              type: string
              example: File not found in commit
    """
    commit_id = request.args.get('commit_id')
    repo = repos_collection.find_one({'repo_name': repo_name})
    if not repo:
        return jsonify({'error': 'Repository not found'}), 404

    if commit_id:
        commit = next((c for c in repo['commits'] if c['commit_id'] == commit_id), None)
        if not commit:
            return jsonify({'error': 'Commit not found'}), 404
    else:
        commit = repo['commits'][-1] if repo['commits'] else None
        if not commit:
            return jsonify({'error': 'No previous commits found'}), 400

    folder = os.path.dirname(file_path).replace('\\', '/')
    file_name = os.path.basename(file_path)
    file_version = next((f for f in commit['folders'].get(folder, []) if f['filename'] == file_name), None)
    if not file_version:
        return jsonify({'error': 'File not found in commit'}), 404

    try:
        staging_doc = staging_collection.find_one({'repo_name': repo_name})
        if not staging_doc:
            staging_doc = {'repo_name': repo_name, 'folders': {}}

        if folder not in staging_doc['folders']:
            staging_doc['folders'][folder] = []

        staging_doc['folders'][folder].append(file_version)
        staging_collection.update_one({'repo_name': repo_name}, {'$set': staging_doc}, upsert=True)

        return jsonify({
            'message': f'File {file_path} rolled back successfully',
            'commit_id': commit['commit_id']
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error during rollback: {str(e)}'}), 400

if __name__ == '__main__':
    setup_mongodb_indexes()
    app.run(debug=True)
