from flask import jsonify
from flask_cors import cross_origin
from bson.objectid import ObjectId
from backend.database.db import get_db

@project_bp.route('/api/projects/<project_id>/tasks/<task_id>', methods=['DELETE'])
@cross_origin()
def delete_task(project_id, task_id):
    try:
        db = get_db()
        tasks_collection = db.tasks
        
        # First, find the task to ensure it exists and belongs to the project
        task = tasks_collection.find_one({
            '_id': ObjectId(task_id),
            'project_id': ObjectId(project_id)
        })
        
        if not task:
            return jsonify({
                'error': 'Task not found'
            }), 404
        
        # Delete the task
        result = tasks_collection.delete_one({
            '_id': ObjectId(task_id)
        })
        
        if result.deleted_count == 0:
            return jsonify({
                'error': 'Failed to delete task'
            }), 500
        
        # Get updated tasks list
        updated_tasks = list(tasks_collection.find({'project_id': ObjectId(project_id)}))
        
        # Process tasks to include project information
        processed_tasks = []
        for task in updated_tasks:
            # Convert ObjectId to string for JSON serialization
            task['_id'] = str(task['_id'])
            if 'project_id' in task:
                task['project_id'] = str(task['project_id'])
            
            # Get project information if project_id exists
            if 'project_id' in task:
                project = db.projects.find_one({'_id': ObjectId(task['project_id'])})
                if project:
                    task['project_name'] = project.get('project_name', 'Unknown Project')
            
            processed_tasks.append(task)
        
        return jsonify({
            'message': 'Task deleted successfully',
            'tasks': processed_tasks
        })
        
    except Exception as e:
        print(f"Error in delete_task: {str(e)}")
        return jsonify({
            'error': 'Failed to delete task',
            'message': str(e)
        }), 500 