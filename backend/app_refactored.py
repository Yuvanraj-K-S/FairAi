import os
import logging
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import tempfile
import json
from werkzeug.utils import secure_filename
from pymongo import MongoClient, ASCENDING
from pymongo.server_api import ServerApi
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
import certifi
from datetime import datetime, timedelta
from bson.objectid import ObjectId
from functools import wraps
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWTError
import bcrypt
from bson import json_util
import traceback
import sys
import base64

# Load environment variables first
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3001", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration from environment variables
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'your-secret-key-here'),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=1),
    UPLOAD_FOLDER=os.getenv('UPLOAD_FOLDER', './uploads'),
    DATASET_PATH=os.getenv('DATASET_PATH', './dataset/facial_recognition'),
    MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB max upload size
    DEBUG=os.getenv('DEBUG', 'false').lower() == 'true'
)

# Ensure upload and dataset directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['DATASET_PATH'], exist_ok=True)

# MongoDB configuration
MONGO_URI = os.getenv('MONGO_DB_URL')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'fair_ai_auth')

# Request logging
@app.before_request
def log_request_info():
    if app.config['DEBUG']:
        logger.info(f"Request: {request.method} {request.path}")
        logger.debug(f"Headers: {dict(request.headers)}")
        if request.is_json:
            logger.debug(f"JSON Body: {request.get_json()}")
        elif request.form:
            logger.debug(f"Form Data: {request.form.to_dict()}")

@app.after_request
def log_response(response):
    if app.config['DEBUG']:
        logger.debug(f"Response: {response.status}")
        logger.debug(f"Headers: {dict(response.headers)}")
        if response.is_json:
            logger.debug(f"JSON Response: {response.get_json()}")
    return response

def get_db():
    """Get MongoDB database connection with error handling and retry logic."""
    max_retries = 3
    retry_delay = 2  # seconds
    
    last_error = None
    for attempt in range(max_retries):
        try:
            if not MONGO_URI:
                raise ValueError("MongoDB URI not found in environment variables")
            
            logger.info(f"Connecting to MongoDB (attempt {attempt + 1}/{max_retries})...")
            
            client = MongoClient(
                MONGO_URI,
                server_api=ServerApi('1'),
                tlsCAFile=certifi.where(),
                connectTimeoutMS=5000,
                socketTimeoutMS=30000,
                serverSelectionTimeoutMS=5000,
                retryWrites=True,
                w='majority'
            )
            
            # Test the connection
            client.admin.command('ping')
            
            # Get database
            db = client[MONGO_DB_NAME]
            
            # Create indexes if they don't exist
            try:
                db.users.create_index([("email", ASCENDING)], unique=True)
                # Only create TTL index for temporary users
                db.users.create_index(
                    "temp_created_at",
                    expireAfterSeconds=86400,  # 24 hours
                    partialFilterExpression={"is_temporary": True}
                )
                logger.info("MongoDB indexes created/verified")
            except PyMongoError as idx_error:
                logger.error(f"Failed to create indexes: {str(idx_error)}")
            
            logger.info("Successfully connected to MongoDB!")
            return db
            
        except Exception as e:
            last_error = e
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
    
    error_msg = f"Failed to connect to MongoDB after {max_retries} attempts"
    if last_error:
        error_msg += f"\nLast error: {str(last_error)}"
    logger.error(error_msg)
    return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
            
        if not token:
            return jsonify({
                "success": False,
                "message": "Authentication token is missing"
            }), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = get_db().users.find_one({"email": data['email']})
            
            if not current_user:
                return jsonify({
                    "success": False,
                    "message": "User not found"
                }), 401
                
            return f(current_user, *args, **kwargs)
            
        except ExpiredSignatureError:
            return jsonify({
                "success": False,
                "message": "Token has expired"
            }), 401
        except (InvalidTokenError, PyJWTError) as e:
            logger.error(f"Invalid token: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Invalid token"
            }), 401
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Token verification failed"
            }), 500
            
    return decorated

def save_uploaded_file(file, target_dir):
    """
    Save an uploaded file to the target directory with a secure filename.
    
    Args:
        file: FileStorage object from request.files
        target_dir: Directory to save the file to
        
    Returns:
        str: Path to the saved file
    """
    try:
        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
            
        filename = secure_filename(file.filename)
        if not filename:
            raise ValueError("Invalid filename")
            
        filepath = os.path.join(target_dir, filename)
        file.save(filepath)
        
        logger.info(f"File saved to {filepath}")
        return filepath
        
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise

# Auth Routes
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """
    Register a new user.
    
    Request JSON:
        name: User's full name
        email: User's email (must be unique)
        password: User's password (will be hashed)
        
    Returns:
        JSON response with status and user data
    """
    try:
        db = get_db()
        if not db:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
            
        data = request.get_json()
        
        # Validate input
        required_fields = ['name', 'email', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({
                "success": False,
                "message": f"Missing required fields: {', '.join(required_fields)}"
            }), 400
            
        name = data['name'].strip()
        email = data['email'].lower().strip()
        password = data['password'].strip()
        
        # Validate email format
        if '@' not in email or '.' not in email.split('@')[1]:
            return jsonify({
                "success": False,
                "message": "Invalid email format"
            }), 400
            
        # Check if user already exists
        if db.users.find_one({"email": email}):
            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409
            
        # Hash password with bcrypt
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        # Store base64 encoded password
        encoded_password = base64.b64encode(hashed_password).decode('utf-8')
        
        # Create user document
        user_data = {
            'name': name,
            'email': email,
            'password': encoded_password,
            'created_at': datetime.utcnow(),
            'is_temporary': False
        }
        
        # Insert user into database
        result = db.users.insert_one(user_data)
        
        # Generate JWT token
        token = jwt.encode({
            'email': email,
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }, app.config['SECRET_KEY'])
        
        # Prepare response
        user_data['_id'] = str(result.inserted_id)
        user_data.pop('password', None)
        
        return jsonify({
            "success": True,
            "message": "User registered successfully",
            "data": {
                "user": user_data,
                "token": token
            }
        }), 201
        
    except PyMongoError as e:
        logger.error(f"Database error during signup: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Database operation failed"
        }), 500
    except Exception as e:
        logger.error(f"Error during signup: {str(e)}")
        return jsonify({
            "success": False,
            "message": "An unexpected error occurred"
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Authenticate a user and return a JWT token.
    
    Request JSON:
        email: User's email
        password: User's password
        
    Returns:
        JSON response with status, user data, and JWT token
    """
    try:
        db = get_db()
        if not db:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
            
        data = request.get_json()
        
        # Validate input
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400
            
        email = data['email'].lower().strip()
        password = data['password'].strip()
        
        # Find user
        user = db.users.find_one({"email": email})
        if not user:
            logger.warning(f"Failed login attempt for non-existent email: {email}")
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401
        
        # Verify password
        try:
            # Get stored password and decode from base64
            stored_hash = base64.b64decode(user["password"].encode('utf-8'))
            
            if not bcrypt.checkpw(password.encode('utf-8'), stored_hash):
                logger.warning(f"Failed login attempt for user: {email}")
                return jsonify({
                    "success": False,
                    "message": "Invalid email or password"
                }), 401
                
        except Exception as e:
            logger.error(f"Password verification error for user {email}: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Error during authentication"
            }), 500
        
        # Generate JWT token
        token = jwt.encode({
            'email': user['email'],
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }, app.config['SECRET_KEY'])
        
        # Prepare response
        user_data = {
            'id': str(user['_id']),
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'created_at': user.get('created_at', datetime.utcnow())
        }
        
        return jsonify({
            "success": True,
            "message": "Login successful",
            "data": {
                "user": user_data,
                "token": token
            }
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "An error occurred during login"
        }), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """
    Get the current authenticated user's data.
    
    Requires authentication via JWT token.
    
    Returns:
        JSON response with user data
    """
    try:
        db = get_db()
        if not db:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
            
        # Get the latest user data from the database
        user = db.users.find_one({"email": current_user['email']})
        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404
            
        # Prepare response data
        user_data = {
            'id': str(user['_id']),
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'created_at': user.get('created_at', datetime.utcnow())
        }
        
        return jsonify({
            "success": True,
            "data": {
                "user": user_data
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_current_user: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to retrieve user data"
        }), 500

@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    """
    Verify if a JWT token is valid.
    
    Headers:
        Authorization: Bearer <token>
        
    Returns:
        JSON response indicating if the token is valid
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "isValid": False,
                "message": "No token provided"
            }), 401
            
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the token
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            
            # Check if the token is expired
            if 'exp' in payload and datetime.utcnow() > datetime.utcfromtimestamp(payload['exp']):
                return jsonify({
                    "success": False,
                    "isValid": False,
                    "message": "Token has expired"
                }), 401
                
            # Token is valid
            return jsonify({
                "success": True,
                "isValid": True,
                "message": "Token is valid",
                "data": {
                    "email": payload['email']
                }
            })
            
        except ExpiredSignatureError:
            return jsonify({
                "success": False,
                "isValid": False,
                "message": "Token has expired"
            }), 401
        except (InvalidTokenError, PyJWTError) as e:
            logger.error(f"Invalid token: {str(e)}")
            return jsonify({
                "success": False,
                "isValid": False,
                "message": "Invalid token"
            }), 401
            
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({
            "success": False,
            "isValid": False,
            "message": "Token verification failed"
        }), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify the service is running.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        "success": True,
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "FairAI Authentication Service"
    })

def init_app():
    """Initialize the Flask application with error handling."""
    try:
        # Test database connection
        db = get_db()
        if not db:
            logger.error("Failed to connect to database during initialization")
            return False
            
        logger.info("Application initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing application: {str(e)}")
        return False

if __name__ == '__main__':
    # Initialize application
    if not init_app():
        logger.error("Application initialization failed. Exiting...")
        sys.exit(1)
        
    # Get port from environment variable or use default
    port = int(os.getenv('PORT', 5000))
    
    # Run the Flask application
    app.run(host='0.0.0.0', port=port)
