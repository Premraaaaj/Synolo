from flask import Blueprint, request, jsonify
from pymongo import MongoClient
import os
import difflib
from datetime import datetime
from bson import ObjectId
import logging
from utils import calculate_file_hash
from typing import Dict, List
from utils import scan_directory, process_file_for_staging

bp = Blueprint('file_routes', __name__)
client = MongoClient('mongodb://localhost:27017/')
db = client['version_control_system']
repos_collection = db['repositories']
staging_collection = db['staging']

logger = logging.getLogger(__name__)

@bp.route('/stage/<repo_name>', methods=['POST'])
def stage_file(repo_name):
    """
    Stage files for commit
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
            - path
          properties:
            path:
              type: string
              description: Absolute path of file or directory to stage
    responses:
      200:
        description: Files staged successfully
        schema:
          type: object
          properties:
            message:
              type: string
              example: "3 files staged successfully"
            staged_files:
              type: array
              items:
                type: object
                properties:
                  path:
                    type: string
                  hash:
                    type: string
      400:
        description: Error in staging
    """
    try:
        # Check repository
        repo = repos_collection.find_one({'repo_name': repo_name})
        if not repo:
            return jsonify({'error': 'Repository does not exist'}), 400

        # Validate request
        data = request.json
        if not data or 'path' not in data:
            return jsonify({'error': 'Path is required'}), 400

        source_path = data['path'].replace('\\', '/')
        if not os.path.exists(source_path):
            return jsonify({'error': 'Path does not exist'}), 400

        staged_files = []
        file_updates = []

        if os.path.isfile(source_path):
            # Handle single file
            file_data = process_file_for_staging(source_path)
            file_data['path'] = os.path.basename(source_path)
            file_updates.append(file_data)
            staged_files.append({
                'path': file_data['path'],
                'hash': file_data['sha']
            })
        else:
            # Handle directory
            for rel_path, abs_path in scan_directory(source_path):
                file_data = process_file_for_staging(abs_path)
                file_data['path'] = rel_path
                file_updates.append(file_data)
                staged_files.append({
                    'path': rel_path,
                    'hash': file_data['sha']
                })

        # Update staging collection with all files under root
        staging_collection.update_one(
            {'repo_name': repo_name},
            {
                '$set': {
                    'repo_name': repo_name,
                    'files': file_updates
                }
            },
            upsert=True
        )

        return jsonify({
            'message': f'{len(staged_files)} file(s) staged successfully',
            'staged_files': staged_files
        }), 200

    except Exception as e:
        logger.error(f"Error staging files: {str(e)}")
        return jsonify({'error': f'Error staging files: {str(e)}'}), 400

@bp.route('/unstage/<repo_name>', methods=['DELETE'])
def unstage_all(repo_name):
    """
    Unstage all files or specific directory
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: The name of the repository
      - name: directory
        in: query
        type: string
        required: false
        description: Optional directory path to unstage (defaults to all files)
    responses:
      200:
        description: Files unstaged successfully
        schema:
          type: object
          properties:
            message:
              type: string
              example: "All files unstaged successfully"
            unstaged_count:
              type: integer
              example: 3
      400:
        description: Error in unstaging
    """
    try:
        directory = request.args.get('directory', '')
        
        staging_doc = staging_collection.find_one({'repo_name': repo_name})
        if not staging_doc:
            return jsonify({'error': 'No files in staging area'}), 400

        if not directory:
            # Unstage everything
            count = len(staging_doc.get('files', []))
            staging_collection.delete_one({'repo_name': repo_name})
            return jsonify({
                'message': 'All files unstaged successfully',
                'unstaged_count': count
            }), 200
        
        # Unstage specific directory
        original_count = len(staging_doc.get('files', []))
        updated_files = [
            f for f in staging_doc.get('files', [])
            if not f['path'].startswith(directory)
        ]
        unstaged_count = original_count - len(updated_files)
        
        if unstaged_count == 0:
            return jsonify({'error': 'No files found in specified directory'}), 400

        staging_collection.update_one(
            {'repo_name': repo_name},
            {'$set': {'files': updated_files}}
        )

        return jsonify({
            'message': f'Unstaged {unstaged_count} files from {directory}',
            'unstaged_count': unstaged_count
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error unstaging files: {str(e)}'}), 400

@bp.route('/staged/<repo_name>', methods=['GET'])
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
        schema:
          type: object
          properties:
            staged_files:
              type: array
              items:
                type: object
                properties:
                  path:
                    type: string
                  hash:
                    type: string
                  size:
                    type: integer
    """
    try:
        staged_files = staging_collection.find_one({'repo_name': repo_name})
        if not staged_files:
            return jsonify({'staged_files': []}), 200

        # Convert binary content to metadata
        serializable_files = []
        for file in staged_files.get('files', []):
            serializable_files.append({
                'path': file['path'],
                'hash': file['sha'],
                'size': len(file['content']),
                'staged_at': file.get('staged_at', datetime.utcnow()).isoformat()
            })

        return jsonify({'staged_files': serializable_files}), 200

    except Exception as e:
        logger.error(f"Error listing staged files: {str(e)}")
        return jsonify({'error': f'Error listing staged files: {str(e)}'}), 400

@bp.route('/commit/<repo_name>', methods=['POST'])
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
        'files': staging_doc['files']
    }

    repo['commits'].append(commit_data)
    if 'files' not in repo:
        repo['files'] = []
    repo['files'].extend(staging_doc['files'])

    repos_collection.update_one({'repo_name': repo_name}, {'$set': repo})
    staging_collection.delete_one({'repo_name': repo_name})

    return jsonify({'message': 'Changes committed successfully', 'commit_id': commit_id}), 200

@bp.route('/history/<repo_name>', methods=['GET'])
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
        schema:
          type: object
          properties:
            commits:
              type: array
              items:
                type: object
                properties:
                  commit_id:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
                  message:
                    type: string
                  author:
                    type: string
                  file_count:
                    type: integer
                  files:
                    type: array
                    items:
                      type: object
                      properties:
                        path:
                          type: string
                        sha:
                          type: string
                        size:
                          type: integer
    """
    try:
        repo = repos_collection.find_one({'repo_name': repo_name})
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404

        # Process commits to remove binary content
        serializable_commits = []
        for commit in repo.get('commits', []):
            # Process files in commit
            files = []
            for file in commit.get('files', []):
                files.append({
                    'path': file['path'],
                    'sha': file['sha'],
                    'size': len(file['content']),
                    'modified_at': datetime.utcnow().isoformat()
                })

            # Create serializable commit object
            commit_obj = {
                'commit_id': commit['commit_id'],
                'timestamp': commit['timestamp'].isoformat(),
                'message': commit['message'],
                'author': commit['author'],
                'file_count': len(files),
                'files': files
            }
            serializable_commits.append(commit_obj)

        return jsonify({'commits': serializable_commits}), 200

    except Exception as e:
        logger.error(f"Error retrieving commit history: {str(e)}")
        return jsonify({'error': f'Error retrieving commit history: {str(e)}'}), 400

@bp.route('/diff/<repo_name>', methods=['GET'])
def get_file_diff(repo_name):
    """
    Get differences between staged files and repository state
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
        description: File differences retrieved successfully
      404:
        description: Repository not found
      400:
        description: Error generating diff
    """
    try:
        # Get repository and staging documents
        repo = repos_collection.find_one({'repo_name': repo_name})
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404

        staging = staging_collection.find_one({'repo_name': repo_name})
        if not staging:
            return jsonify({'diffs': []}), 200

        diffs = []
        staged_files = {f['path']: f for f in staging.get('files', [])}
        repo_files = {f['path']: f for f in repo.get('files', [])}

        # Check all staged files
        for path, staged_file in staged_files.items():
            repo_file = repo_files.get(path)
            
            if not repo_file:
                # Handle new file
                try:
                    staged_content = staged_file['content'].decode('utf-8').splitlines()
                    diff = difflib.unified_diff(
                        [], 
                        staged_content,
                        fromfile='/dev/null',
                        tofile=path
                    )
                    diffs.append({
                        'file_path': path,
                        'status': 'new',
                        'diff': '\n'.join(list(diff)),
                        'is_binary': False
                    })
                except UnicodeDecodeError:
                    diffs.append({
                        'file_path': path,
                        'status': 'new',
                        'diff': 'Binary file - diff not available',
                        'is_binary': True
                    })
            else:
                # Handle modified file
                try:
                    staged_content = staged_file['content'].decode('utf-8').splitlines()
                    repo_content = repo_file['content'].decode('utf-8').splitlines()
                    
                    if staged_file['sha'] != repo_file['sha']:
                        diff = difflib.unified_diff(
                            repo_content,
                            staged_content,
                            fromfile=f'a/{path}',
                            tofile=f'b/{path}'
                        )
                        diffs.append({
                            'file_path': path,
                            'status': 'modified',
                            'diff': '\n'.join(list(diff)),
                            'is_binary': False
                        })
                except UnicodeDecodeError:
                    diffs.append({
                        'file_path': path,
                        'status': 'modified',
                        'diff': 'Binary file - diff not available',
                        'is_binary': True
                    })

        # Check for deleted files
        for path, repo_file in repo_files.items():
            if path not in staged_files:
                try:
                    repo_content = repo_file['content'].decode('utf-8').splitlines()
                    diff = difflib.unified_diff(
                        repo_content,
                        [],
                        fromfile=path,
                        tofile='/dev/null'
                    )
                    diffs.append({
                        'file_path': path,
                        'status': 'deleted',
                        'diff': '\n'.join(list(diff)),
                        'is_binary': False
                    })
                except UnicodeDecodeError:
                    diffs.append({
                        'file_path': path,
                        'status': 'deleted',
                        'diff': 'Binary file - diff not available',
                        'is_binary': True
                    })

        return jsonify({'diffs': diffs}), 200

    except Exception as e:
        logger.error(f"Error generating diff: {str(e)}")
        return jsonify({'error': f'Error generating diff: {str(e)}'}), 400

@bp.route('/rollback/<repo_name>', methods=['POST'])
@bp.route('/rollback/<repo_name>/<path:file_path>', methods=['POST'])
def rollback(repo_name, file_path=None):
    """
    Rollback repository or specific file to previous commit state
    """
    try:
        repo = repos_collection.find_one({'repo_name': repo_name})
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404

        commits = repo.get('commits', [])
        if not commits:
            return jsonify({'error': 'No commits found in repository'}), 400

        # Handle single commit case - rollback to empty state
        if len(commits) == 1:
            if file_path:
                # Remove single file from staging and repo
                staging_collection.update_one(
                    {'repo_name': repo_name},
                    {'$pull': {'files': {'path': file_path}}}
                )
                repos_collection.update_one(
                    {'repo_name': repo_name},
                    {'$pull': {'files': {'path': file_path}}}
                )
                return jsonify({
                    'message': f'File {file_path} rolled back to empty state',
                    'files_affected': 1
                }), 200
            else:
                # Clear entire repo
                staging_collection.delete_one({'repo_name': repo_name})
                repos_collection.update_one(
                    {'repo_name': repo_name},
                    {'$set': {'files': [], 'commits': []}}
                )
                return jsonify({
                    'message': 'Repository rolled back to empty state',
                    'files_affected': len(commits[0].get('files', []))
                }), 200

        # Get previous commit (second to last)
        previous_commit = commits[-2]

        if file_path:
            # Rollback specific file
            file_version = next(
                (f for f in previous_commit['files'] if f['path'] == file_path),
                None
            )
            if not file_version:
                return jsonify({'error': 'File not found in previous commit'}), 404

            # Update staging area
            staging_doc = staging_collection.find_one({'repo_name': repo_name}) or {
                'repo_name': repo_name,
                'files': []
            }
            file_index = next(
                (i for i, f in enumerate(staging_doc['files']) 
                 if f['path'] == file_path),
                -1
            )
            if file_index >= 0:
                staging_doc['files'][file_index] = file_version
            else:
                staging_doc['files'].append(file_version)

            staging_collection.update_one(
                {'repo_name': repo_name},
                {'$set': staging_doc},
                upsert=True
            )

            return jsonify({
                'message': f'File {file_path} rolled back to previous commit',
                'files_affected': 1
            }), 200
        else:
            # Rollback entire repository
            staging_doc = {
                'repo_name': repo_name,
                'files': previous_commit['files']
            }
            staging_collection.update_one(
                {'repo_name': repo_name},
                {'$set': staging_doc},
                upsert=True
            )

            # Remove latest commit
            commits.pop()
            repos_collection.update_one(
                {'repo_name': repo_name},
                {'$set': {'commits': commits}}
            )

            return jsonify({
                'message': 'Repository rolled back to previous commit',
                'files_affected': len(previous_commit['files'])
            }), 200

    except Exception as e:
        logger.error(f"Error during rollback: {str(e)}")
        return jsonify({'error': f'Error during rollback: {str(e)}'}), 400
    


@bp.route('/clone/<repo_name>', methods=['POST'])
def clone_repository(repo_name):
    """
    Clone repository to specified path with repo name as root directory
    ---
    tags:
      - Repositories
    parameters:
      - name: repo_name
        in: path
        type: string
        required: true
        description: Repository name to clone
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - target_path
          properties:
            target_path:
              type: string
              description: Parent directory where repository should be cloned
    """
    try:
        # Validate request
        data = request.json
        if not data or 'target_path' not in data:
            return jsonify({'error': 'Target path is required'}), 400

        base_path = data['target_path'].replace('\\', '/')
        # Create repo directory inside target path
        target_path = os.path.join(base_path, repo_name)
        
        # Get repository
        repo = repos_collection.find_one({'repo_name': repo_name})
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404

        # Create target directory with repo name
        os.makedirs(target_path, exist_ok=True)

        files_created = 0
        # Get latest versions of files
        latest_files = {}
        for commit in repo.get('commits', []):
            for file in commit.get('files', []):
                latest_files[file['path']] = file

        # Create files
        for file_path, file_data in latest_files.items():
            full_path = os.path.join(target_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'wb') as f:
                f.write(file_data['content'])
            files_created += 1

        return jsonify({
            'message': f'Repository cloned successfully to {target_path}',
            'files_created': files_created,
            'repo_name': repo_name
        }), 200

    except Exception as e:
        logger.error(f"Error cloning repository: {str(e)}")
        return jsonify({'error': f'Error cloning repository: {str(e)}'}), 400