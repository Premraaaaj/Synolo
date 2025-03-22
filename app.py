from flask import Flask
from flasgger import Swagger  # type: ignore
from pymongo import MongoClient
import logging
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
swagger = Swagger(app)

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['version_control_system']

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routes
from routes import repo_routes, file_routes, project_mgmt_routes

# Register Blueprints
app.register_blueprint(repo_routes.bp, url_prefix='/api')
app.register_blueprint(file_routes.bp, url_prefix='/api')
app.register_blueprint(project_mgmt_routes.bp, url_prefix='/api')

if __name__ == '__main__':
    from utils import setup_mongodb_indexes
    setup_mongodb_indexes(db)
    app.run(debug=True)
