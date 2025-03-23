from flask import Blueprint, request, jsonify, session
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Blueprint
bp = Blueprint('auth', __name__)

# MongoDB connection
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['project_management']
    users_collection = db['users']
    logger.info("Successfully connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Constants for rate limiting
MAX_LOGIN_ATTEMPTS = 5
LOGIN_TIMEOUT_MINUTES = 15

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Please log in first'}), 401
        return f(*args, **kwargs)
    return decorated_function

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed)

@bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        logger.debug(f"Signup request data: {data}")
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password are required'}), 400

        username = data['username']
        password = data['password']

        # Check if username already exists
        if users_collection.find_one({'username': username}):
            return jsonify({'error': 'Username already taken'}), 409

        # Hash password
        hashed_password = hash_password(password)

        # Create user document
        user = {
            'username': username,
            'password': hashed_password,
            'created_at': datetime.utcnow(),
            'login_attempts': 0,
            'last_login_attempt': None
        }

        # Insert user into database
        result = users_collection.insert_one(user)
        
        if result.inserted_id:
            logger.info(f"User {username} created successfully")
            return jsonify({
                'message': 'User registered successfully',
                'user': {
                    'id': str(result.inserted_id),
                    'username': username
                }
            }), 201
        else:
            logger.error("Failed to create user")
            return jsonify({'error': 'Failed to create user'}), 500

    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({'error': 'An error occurred during signup'}), 500

@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        logger.debug(f"Login request data: {data}")
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password are required'}), 400

        username = data['username']
        password = data['password']

        # Find user
        user = users_collection.find_one({'username': username})
        
        if not user:
            logger.warning(f"Login attempt failed for non-existent user: {username}")
            return jsonify({'error': 'Invalid username or password'}), 401

        # Check if user is locked out
        if user.get('login_attempts', 0) >= MAX_LOGIN_ATTEMPTS:
            last_attempt = user.get('last_login_attempt')
            if last_attempt and datetime.utcnow() - last_attempt < timedelta(minutes=LOGIN_TIMEOUT_MINUTES):
                logger.warning(f"Account locked for user: {username}")
                return jsonify({
                    'error': f'Account locked. Try again in {LOGIN_TIMEOUT_MINUTES} minutes'
                }), 429
            else:
                # Reset login attempts if timeout has passed
                users_collection.update_one(
                    {'_id': user['_id']},
                    {'$set': {'login_attempts': 0}}
                )

        # Verify password
        if not verify_password(password, user['password']):
            # Increment login attempts
            users_collection.update_one(
                {'_id': user['_id']},
                {
                    '$inc': {'login_attempts': 1},
                    '$set': {'last_login_attempt': datetime.utcnow()}
                }
            )
            logger.warning(f"Failed login attempt for user: {username}")
            return jsonify({'error': 'Invalid username or password'}), 401

        # Reset login attempts on successful login
        users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'login_attempts': 0}}
        )

        # Set session
        session['user_id'] = str(user['_id'])
        session['username'] = user['username']
        logger.info(f"User {username} logged in successfully")

        # Return user data (excluding password)
        user_data = {
            'id': str(user['_id']),
            'username': user['username']
        }

        return jsonify({
            'message': 'Login successful',
            'user': user_data
        })

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'An error occurred during login'}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    try:
        session.clear()
        logger.info("User logged out successfully")
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'An error occurred during logout'}), 500

@bp.route('/check-auth', methods=['GET'])
def check_auth():
    try:
        if 'user_id' in session:
            user = users_collection.find_one({'_id': ObjectId(session['user_id'])})
            if user:
                return jsonify({
                    'authenticated': True,
                    'user': {
                        'id': str(user['_id']),
                        'username': user['username']
                    }
                })
        return jsonify({'authenticated': False})
    except Exception as e:
        logger.error(f"Auth check error: {str(e)}")
        return jsonify({'authenticated': False}) 