from flask import Blueprint, request, jsonify, current_app as app
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import hashlib
import logging

bp = Blueprint('project_mgmt', __name__)
client = MongoClient('mongodb://localhost:27017/')
db = client['synolo_test_project_mgmt']

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
    """Get all projects"""
    all_projects = list(projects.find({}))
    return jsonify({
        'projects': [{
            'project_id': str(p['_id']),
            'project_name': p['project_name'],
            'project_description': p.get('project_description', ''),
            'members': p.get('members', []),
            'owner_id': p['owner_id']
        } for p in all_projects]
    }), 200

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
        project = projects.find_one({'_id': ObjectId(project_id)})
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        project_tasks = list(tasks.find({'project_id': project_id}))
        return jsonify({
            'tasks': [{
                'task_id': str(t['_id']),
                'task_name': t['task_name'],
                'status': t['status'],
                'assigned_to': t['assigned_to'],
                'issued_date': t['issued_date'].isoformat(),
                'completion_date': t.get('completion_date', '').isoformat() if t.get('completion_date') else None
            } for t in project_tasks]
        }), 200
    except Exception as e:
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
