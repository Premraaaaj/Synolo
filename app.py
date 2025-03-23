from flask import Flask, jsonify
from flask_cors import CORS
from flask_session import Session
from pymongo import MongoClient
import logging
import os

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Session configuration
app.config['SECRET_KEY'] = os.urandom(24)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# CORS configuration
CORS(app, 
     resources={
         r"/api/*": {
             "origins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "X-User-ID"],
             "supports_credentials": True,
             "expose_headers": ["Content-Type", "X-User-ID"]
         }
     })

# Initialize session
Session(app)

# MongoDB connection
try:
    client = MongoClient('mongodb://localhost:27017/')
    # Test the connection
    client.server_info()
    db = client['project_management']
    logger.info("Successfully connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Import routes
from routes import project_mgmt_routes, auth_routes

# Register blueprints
app.register_blueprint(project_mgmt_routes.bp, url_prefix='/api')
app.register_blueprint(auth_routes.bp, url_prefix='/api/auth')

@app.route('/')
def index():
    return jsonify({"message": "Welcome to the Project Management API"})

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy", "message": "API is running"})

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    from utils import setup_mongodb_indexes
    try:
        setup_mongodb_indexes(db)
        logger.info("Starting Flask server on http://localhost:5000")
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise
