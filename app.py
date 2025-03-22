from flask import Flask
from flasgger import Swagger  # type: ignore
from pymongo import MongoClient
import logging

# Initialize Flask app
app = Flask(__name__)
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
app.register_blueprint(repo_routes.bp)
app.register_blueprint(file_routes.bp)
app.register_blueprint(project_mgmt_routes.bp)

if __name__ == '__main__':
    from utils import setup_mongodb_indexes
    setup_mongodb_indexes(db)
    app.run(debug=True)
