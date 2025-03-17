from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from datetime import datetime
import logging

bp = Blueprint('repo_routes', __name__)
client = MongoClient('mongodb://localhost:27017/')
db = client['version_control_system']
repos_collection = db['repositories']

logger = logging.getLogger(__name__)

@bp.route('/repo/create/<repo_name>', methods=['POST'])
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

@bp.route('/repo/delete/<repo_name>', methods=['DELETE'])
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

@bp.route('/repo/list', methods=['GET'])
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