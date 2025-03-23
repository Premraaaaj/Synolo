from flask import Blueprint, request, jsonify, current_app as app
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import hashlib
import logging

bp = Blueprint('project_mgmt', __name__)
client = MongoClient('mongodb://localhost:27017/')
db = client['project_mgmt']

# Collections
users = db['users']
projects = db['projects']
tasks = db['tasks']

@bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user"""
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    if users.find_one({'username': data['username']}):
        return jsonify({'error': 'Username already exists'}), 400

    hashed_password = hashlib.sha256(data['password'].encode()).hexdigest()
    user_id = str(ObjectId())
    new_user = {
        'id': user_id,
        'username': data['username'],
        'password': hashed_password
    }
    
    users.insert_one(new_user)
    return jsonify({'message': 'User created successfully', 'user_id': user_id}), 201

@bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    user = users.find_one({'username': data['username'], 'password': data.get('password')})
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    return jsonify({
        'user_id': user['id'],
        'username': user['username']
    }), 200

@bp.route('/projects', methods=['GET'])
def get_all_projects():
    """Get all projects for the current user"""
    try:
        # Get user_id from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID not provided'}), 400

        # Find projects where user is either owner or member
        user_projects = list(projects.find({
            '$or': [
                {'owner_id': user_id},
                {'members': user_id}
            ]
        }))

        # Convert ObjectId to string for JSON serialization
        projects_list = []
        for project in user_projects:
            project['_id'] = str(project['_id'])
            projects_list.append({
                'project_id': project['_id'],
                'project_name': project['project_name'],
                'project_description': project.get('project_description', ''),
                'members': project.get('members', []),
                'owner_id': project['owner_id'],
                'tasks': project.get('tasks', [])
            })

        return jsonify({
            'projects': projects_list
        }), 200
    except Exception as e:
        print(f"Error in get_all_projects: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/projects', methods=['POST'])
def create_project():
    """Create new project"""
    data = request.json
    if not data or not data.get('project_name'):
        return jsonify({'error': 'Project name required'}), 400

    new_project = {
        'project_name': data['project_name'],
        'project_description': data.get('project_description', ''),
        'tasks': [],
        'members': [data.get('owner_id')],
        'owner_id': data.get('owner_id')
    }
    
    result = projects.insert_one(new_project)
    return jsonify({
        'message': 'Project created successfully',
        'project_id': str(result.inserted_id)
    }), 201

@bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete project"""
    try:
        project = projects.find_one({'_id': ObjectId(project_id)})
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        # Delete associated tasks
        tasks.delete_many({'project_id': project_id})
        projects.delete_one({'_id': ObjectId(project_id)})
        
        return jsonify({'message': 'Project deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get project details"""
    try:
        # Try to find project by MongoDB _id first
        try:
            project = projects.find_one({'_id': ObjectId(project_id)})
        except:
            # If not found by _id, try project_id
            project = projects.find_one({'project_id': project_id})

        if not project:
            return jsonify({'error': 'Project not found'}), 404

        return jsonify({
            'project_id': project.get('project_id', str(project['_id'])),
            'project_name': project['project_name'],
            'project_description': project.get('project_description', ''),
            'members': project.get('members', []),
            'owner_id': project['owner_id'],
            'tasks': project.get('task', [])  # Include task IDs
        }), 200
    except Exception as e:
        print(f"Error in get_project: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 400

@bp.route('/tasks', methods=['GET'])
def get_all_tasks():
    """Get all tasks"""
    all_tasks = list(tasks.find({}))
    return jsonify({
        'tasks': [{
            'task_id': str(t['_id']),
            'project_id': t['project_id'],
            'task_name': t['task_name'],
            'status': t['status'],
            'issued_date': t['issued_date'].isoformat(),
            'completion_date': t.get('completion_date', '').isoformat() if t.get('completion_date') else None
        } for t in all_tasks]
    }), 200

@bp.route('/projects/<project_id>/tasks', methods=['GET'])
def get_tasks_by_project(project_id):
    """Get tasks for specific project"""
    try:
        # Try to find project by MongoDB _id first
        try:
            project = projects.find_one({'_id': ObjectId(project_id)})
        except:
            # If not found by _id, try project_id
            project = projects.find_one({'project_id': project_id})

        if not project:
            return jsonify({'error': 'Project not found'}), 404

        # Get tasks for this project using the MongoDB _id
        project_tasks = list(tasks.find({'project_id': str(project['_id'])}))
        return jsonify({
            'tasks': [{
                'task_id': str(t['_id']),  # Use MongoDB _id as task_id
                'task_name': t['task_name'],
                'status': t['status'],
                'assigned_to': t['assigned_to'],
                'issued_date': t['issued_date'],
                'completion_date': t.get('completion_date')
            } for t in project_tasks]
        }), 200
    
    except Exception as e:
        print(f"Error in get_tasks_by_project: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 400

@bp.route('/projects/<project_id>/tasks', methods=['POST'])
def create_task(project_id):
    """Create new task in project"""
    try:
        project = projects.find_one({'_id': ObjectId(project_id)})
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        data = request.json
        if not data or not data.get('task_name') or not data.get('assigned_to'):
            return jsonify({'error': 'Task name and assignee required'}), 400

        new_task = {
            'project_id': project_id,
            'task_name': data['task_name'],
            'status': 'pending',
            'assigned_to': data['assigned_to'],
            'issued_date': datetime.utcnow(),
            'completion_date': None
        }
        
        result = tasks.insert_one(new_task)
        projects.update_one(
            {'_id': ObjectId(project_id)},
            {'$push': {'tasks': str(result.inserted_id)}}
        )
        
        return jsonify({
            'message': 'Task created successfully',
            'task_id': str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete task"""
    try:
        task = tasks.find_one({'_id': ObjectId(task_id)})
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        tasks.delete_one({'_id': ObjectId(task_id)})
        projects.update_one(
            {'_id': ObjectId(task['project_id'])},
            {'$pull': {'tasks': task_id}}
        )
        
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/tasks/<task_id>', methods=['PUT'])
def update_task_status(task_id):
    """Update task status"""
    try:
        data = request.json
        if not data or not data.get('status'):
            return jsonify({'error': 'Status is required'}), 400

        # Validate status
        valid_statuses = ['pending', 'in_progress', 'completed']
        if data['status'] not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400

        # Find the task
        task = tasks.find_one({'_id': ObjectId(task_id)})
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        # Prepare update data
        update_data = {'status': data['status']}
        
        # If status is completed, add completion date
        if data['status'] == 'completed':
            update_data['completion_date'] = datetime.utcnow()
        # If status is changed from completed, remove completion date
        elif task.get('status') == 'completed':
            update_data['completion_date'] = None

        # Update the task
        tasks.update_one(
            {'_id': ObjectId(task_id)},
            {'$set': update_data}
        )
        
        return jsonify({'message': 'Task status updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/tasks/user', methods=['GET'])
def get_user_tasks():
    """Get all tasks assigned to the current user"""
    try:
        # Get user_id from request headers
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID not provided'}), 400

        print(f"Fetching tasks for user ID: {user_id}")  # Debug log

        # Get all tasks where user is assigned
        user_tasks = list(tasks.find({'assigned_to': user_id}))
        print(f"Found {len(user_tasks)} tasks for user")  # Debug log

        # Get project details for each task
        processed_tasks = []
        for task in user_tasks:
            # Get project details
            project = projects.find_one({'_id': ObjectId(task['project_id'])})
            if project:
                processed_task = {
                    'task_id': str(task['_id']),
                    'task_name': task['task_name'],
                    'description': task.get('description', ''),
                    'status': task['status'],
                    'assigned_to': task['assigned_to'],
                    'project_name': project['project_name'],
                    'project_id': str(project['_id']),
                    'issued_date': task['issued_date'],
                    'completion_date': task.get('completion_date')
                }
                processed_tasks.append(processed_task)

        # Sort tasks by status and date
        processed_tasks.sort(key=lambda x: (
            {'pending': 0, 'in_progress': 1, 'completed': 2}[x['status']],
            x['issued_date']
        ))

        print(f"Returning {len(processed_tasks)} processed tasks")  # Debug log
        return jsonify({
            'tasks': processed_tasks
        }), 200
    except Exception as e:
        print(f"Error in get_user_tasks: {str(e)}")
        return jsonify({'error': str(e)}), 500
