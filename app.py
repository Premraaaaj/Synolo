from flask import Flask, request, jsonify
from pymongo import MongoClient

app = Flask(__name__)

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['version_control_system']
repos_collection = db['repositories']

@app.route('/create_repo', methods=['POST'])
def create_repo():
    data = request.json
    repo_name = data.get('name')
    
    if not repo_name:
        return jsonify({'error': 'Repository name is required'}), 400
    
    # Check if the repository already exists
    if repos_collection.find_one({'name': repo_name}):
        return jsonify({'error': 'Repository already exists'}), 400
    
    # Create the repository
    repo = {'name': repo_name}
    repos_collection.insert_one(repo)
    
    return jsonify({'message': 'Repository created successfully'}), 201

if __name__ == '__main__':
    app.run(debug=True)
