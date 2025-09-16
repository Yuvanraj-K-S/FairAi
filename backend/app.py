from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import tempfile
import os
import json
from werkzeug.utils import secure_filename
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import certifi
from datetime import datetime, timedelta
from bson.objectid import ObjectId
from functools import wraps
import jwt
import bcrypt
from bson import json_util
import traceback
import sys
import time

# Import debug utilities
from debug_utils import (
    DebugTimer, DebugContext, DataProfiler, 
    log_function_call, debug_save_data, enable_debug_logging
)

# Enable debug printing if DEBUG environment variable is set
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3001", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'your-secret-key-here'),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=1),
    DEBUG=os.getenv('DEBUG', 'false').lower() == 'true',
    PROPAGATE_EXCEPTIONS=True
)

def save_uploaded_file(file, dest_dir):
    if not file:
        return None
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, file.filename)
    file.save(file_path)
    return file_path

# Ensure your app config has DEFAULT_FACE_DATASET_PATH set, e.g.:
# app.config['DEFAULT_FACE_DATASET_PATH'] = '/path/to/server/datasets/face_dataset'
DEFAULT_SERVER_DATASET = app.config.get('DEFAULT_FACE_DATASET_PATH', r'C:\Users\Prakash P\OneDrive\Desktop\FairAi\backend\dataset\facial_recognition')
# Request logging
@app.before_request
def log_request_info():
    if DEBUG:
        print(f"\n=== Request ===\n{request.method} {request.path}\nHeaders: {dict(request.headers)}\nBody: {request.get_data()}\n==============\n")

@app.after_request
def log_response(response):
    if DEBUG:
        print(f"\n=== Response ===\nStatus: {response.status}\nHeaders: {dict(response.headers)}\nBody: {response.get_data()}\n===============\n")
    return response

# MongoDB connection
def get_db():
    """Get MongoDB database connection with error handling and retry logic."""
    max_retries = 3
    retry_delay = 2  # seconds
    
    last_error = None
    for attempt in range(max_retries):
        try:
            mongo_uri = os.getenv('MONGO_DB_URL')
            if not mongo_uri:
                raise ValueError("MongoDB URI not found in environment variables")
            
            if DEBUG:
                print(f"Connecting to MongoDB (attempt {attempt + 1}/{max_retries})...")
            
            client = MongoClient(
                mongo_uri,
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
            
            # Get or create database
            db_name = os.getenv('MONGO_DB_NAME', 'fair_ai_auth')
            db = client[db_name]
            
            # Create indexes if they don't exist
            try:
                db.users.create_index("email", unique=True)
                db.users.create_index("created_at", expireAfterSeconds=86400)  # TTL index for 24h
            except Exception as idx_error:
                if DEBUG:
                    print(f"Warning: Failed to create indexes: {str(idx_error)}")
            
            if DEBUG:
                print("Successfully connected to MongoDB!")
            return db
            
        except Exception as e:
            last_error = e
            if DEBUG:
                print(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
    
    error_msg = f"Error: Failed to connect to MongoDB after {max_retries} attempts"
    if last_error:
        error_msg += f"\nLast error: {str(last_error)}"
    print(error_msg)
    return None

# JWT token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
            
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = get_db().users.find_one({"email": data['email']})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
                
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

# Helper function to parse MongoDB documents to JSON
def parse_json(data):
    return json.loads(json_util.dumps(data))

# Signup endpoint
@app.route('/api/auth/signup', methods=['POST'])
@log_function_call()
def signup():
    """User registration endpoint with input validation and error handling."""
    with DebugContext(app.config['DEBUG']):
        try:
            db = get_db()
            if db is None:
                if DEBUG:
                    print("Error: Database connection failed during signup")
                return jsonify({
                    "status": "error", 
                    "message": "Database connection failed. Please try again later."
                }), 503  # Service Unavailable
                
            data = request.get_json()
            if data is None:
                return jsonify({"status": "error", "message": "No input data provided"}), 400
            
            # Print request data (excluding sensitive info in production)
            if DEBUG:
                log_data = data.copy()
                if 'password' in log_data:
                    log_data['password'] = '***REDACTED***'
                print(f"\n=== Signup Request ===\n{log_data}\n==================\n")
            
            # Validate input
            if 'email' not in data or 'password' not in data or 'name' not in data:
                return jsonify({"status": "error", "message": "Missing required fields"}), 400
                
            email = data['email'].lower().strip()
            password = data['password'].strip()
            name = data['name'].strip()
            
            # Check if user already exists
            if db.users.find_one({"email": email}):
                return jsonify({"status": "error", "message": "Email already registered"}), 400
            
            # Hash password
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # Create user
            user = {
                "name": name,
                "email": email,
                "password": hashed.decode('utf-8'),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert user
            result = db.users.insert_one(user)
            user['_id'] = str(result.inserted_id)
            
            # Generate JWT token
            token = jwt.encode({
                'email': email,
                'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
            }, app.config['SECRET_KEY'])
            
            # Remove password from response
            user.pop('password', None)
            
            return jsonify({
                "status": "success",
                "message": "User created successfully",
                "user": parse_json(user),
                "token": token
            }), 201
            
        except (jwt.PyJWTError, jwt.InvalidTokenError, jwt.ExpiredSignatureError) as jwt_err:
            logger.error(f"JWT token generation error: {jwt_err}")
            return jsonify({
                "status": "error",
                "message": "Error generating authentication token"
            }), 500
            
        except Exception as e:
            logger.error(f"Error in signup: {str(e)}", exc_info=True)
            return jsonify({
                "status": "error",
                "message": "An unexpected error occurred during signup"
            }), 500

# Login endpoint
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        db = get_db()
        if db is None:
            return jsonify({"status": "error", "message": "Database connection failed"}), 500
            
        data = request.get_json()
        
        # Validate input
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"status": "error", "message": "Email and password are required"}), 400
            
        email = data['email'].lower().strip()
        password = data['password'].strip()
        
        # Find user
        user = db.users.find_one({"email": email})
        if not user:
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401
            
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401
            
        # Generate JWT token
        token = jwt.encode({
            'email': user['email'],
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }, app.config['SECRET_KEY'])
        
        # Remove password from response
        user['_id'] = str(user['_id'])
        user.pop('password', None)
        
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "user": parse_json(user),
            "token": token
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Get current user data endpoint
@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    try:
        db = get_db()
        if db is None:
            return jsonify({"status": "error", "message": "Database connection failed"}), 500
            
        # Get the latest user data from the database
        user = db.users.find_one({"email": current_user['email']})
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404
            
        # Remove sensitive data before sending user info
        user_data = {
            'id': str(user['_id']),
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'created_at': user.get('created_at', '')
        }
        
        return jsonify({
            "status": "success",
            "user": user_data
        })
        
    except Exception as e:
        print(f"Error in get_current_user: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Token verification endpoint
@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"isValid": False, "message": "No token provided"}), 401
            
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the token
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            
            # Check if the token is expired
            if 'exp' in payload and datetime.utcnow() > datetime.utcfromtimestamp(payload['exp']):
                return jsonify({"isValid": False, "message": "Token has expired"}), 401
                
            # Token is valid
            return jsonify({
                "isValid": True,
                "user": {
                    "email": payload['email']
                }
            })
            
        except jwt.ExpiredSignatureError:
            return jsonify({"isValid": False, "message": "Token has expired"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"isValid": False, "message": "Invalid token"}), 401
            
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"isValid": False, "message": "Token verification failed"}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }), 200

# Save uploaded file to temporary directory
def save_uploaded_file(file, target_dir):
    if not file:
        return None
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(target_dir, filename)
    file.save(file_path)
    return file_path

# Face recognition evaluation endpoint
@app.route('/api/face/evaluate', methods=['POST'])
@token_required
def evaluate_face_model(current_user):
    """
    POST form-data fields:
      - use_default_model: 'true'|'false' (if true -> use pretrained default model)
      - model_file: file (optional, if using custom model)
      - config_file: file (optional)
      - dataset_zip: file (optional; if missing will use server default dataset)
      - threshold: float
      - augment: comma separated augment names
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            use_default_model = request.form.get('use_default_model', 'false').lower() == 'true'

            # parse params
            threshold = float(request.form.get('threshold', 0.5))
            augment_str = request.form.get('augment', 'flip,rotation,brightness,blur')
            augmentations = [a.strip() for a in augment_str.split(',') if a.strip()]

            # import evaluator module
            try:
                from bias.face_bias_evaluator import FaceBiasEvaluator, load_dynamic_model
            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": f"Could not import evaluator: {str(e)}",
                    "traceback": traceback.format_exc()
                }), 500

            # Determine dataset_path: prefer uploaded dataset_zip, else server default
            dataset_path = None
            if 'dataset_zip' in request.files and request.files['dataset_zip'].filename:
                try:
                    dataset_zip = request.files['dataset_zip']
                    zip_path = os.path.join(temp_dir, dataset_zip.filename)
                    dataset_zip.save(zip_path)
                    dataset_path = os.path.join(temp_dir, 'dataset')
                    os.makedirs(dataset_path, exist_ok=True)
                    shutil.unpack_archive(zip_path, dataset_path)
                except Exception as e:
                    return jsonify({
                        "status": "error",
                        "message": f"Failed to extract uploaded dataset: {str(e)}"
                    }), 400
            else:
                # use server-side default dataset
                if not os.path.exists(DEFAULT_SERVER_DATASET):
                    return jsonify({
                        "status": "error",
                        "message": f"No dataset uploaded and server default dataset not found at {DEFAULT_SERVER_DATASET}."
                    }), 400
                dataset_path = DEFAULT_SERVER_DATASET

            # Handle model: default or custom uploaded
            try:
                if use_default_model:
                    # Load default model (returns model, model_type)
                    model, model_type = load_dynamic_model(None)
                    model_path = None
                    config_path = None
                else:
                    # custom model path OR if no model_file provided, still use default model but use_default_model is false
                    model_file = request.files.get('model_file')
                    config_file = request.files.get('config_file')

                    if model_file and model_file.filename:
                        model_path = save_uploaded_file(model_file, temp_dir)
                        config_path = save_uploaded_file(config_file, temp_dir) if config_file else None
                        model = None
                        model_type = None
                    else:
                        # No model provided -> fall back to server default model
                        model, model_type = load_dynamic_model(None)
                        model_path = None
                        config_path = None
            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to prepare model: {str(e)}",
                    "traceback": traceback.format_exc()
                }), 500

            # Initialize evaluator
            try:
                if use_default_model or (model is not None):
                    # we already have a loaded model object
                    evaluator = FaceBiasEvaluator(
                        model_path=None,
                        config_path=None,
                        dataset_path=dataset_path,
                        threshold=threshold,
                        augmentations=augmentations
                    )
                    evaluator.model = model
                    evaluator.model_type = model_type
                else:
                    # model_path contains the uploaded model file path (custom)
                    evaluator = FaceBiasEvaluator(
                        model_path=model_path,
                        config_path=config_path,
                        dataset_path=dataset_path,
                        threshold=threshold,
                        augmentations=augmentations
                    )

                # run evaluation
                output_dir = os.path.join(temp_dir, 'results')
                os.makedirs(output_dir, exist_ok=True)
                metrics = evaluator.run_evaluation(output_dir=output_dir)

            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": f"Evaluation failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }), 500

            # Build response
            response_data = {
                'status': 'success',
                'metrics': metrics,
                'visualizations': {},
                'recommendations': [],
                'used_augmentations': augmentations,
                'model_used': ('default' if use_default_model or (model is not None and model_path is None) else 'custom')
            }

            # recommendations file (optional)
            recs_path = os.path.join(output_dir, 'recommendations.txt')
            if os.path.exists(recs_path):
                try:
                    with open(recs_path, 'r') as f:
                        response_data['recommendations'] = [line.strip() for line in f if line.strip()]
                except Exception:
                    response_data['recommendations'] = ["No specific recommendations available."]

            # visualizations (optional images in results/visualizations)
            viz_dir = os.path.join(output_dir, 'visualizations')
            if os.path.exists(viz_dir):
                for viz_file in os.listdir(viz_dir):
                    if viz_file.lower().endswith(('.png', '.jpg', '.jpeg')):
                        try:
                            with open(os.path.join(viz_dir, viz_file), 'rb') as f:
                                response_data['visualizations'][viz_file] = f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
                        except Exception as e:
                            app.logger.error(f"Failed to encode visualization {viz_file}: {str(e)}")

            return jsonify(response_data)

    except Exception as e:
        app.logger.error(f"Unexpected error in evaluate_face_model: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}",
            "traceback": traceback.format_exc() if app.debug else None
        }), 500
@app.route('/api/loan/evaluate', methods=['POST'])
@token_required
def evaluate_loan_model(current_user):
    print("\n=== Starting loan evaluation ===")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Script directory: {os.path.dirname(os.path.abspath(__file__))}")
    
    try:
        # Check if model file is present in the request
        if 'model_file' not in request.files:
            return jsonify({
                "status": "error",
                "message": "Model file is required"
            }), 400
            
        model_file = request.files['model_file']
        
        # Get parameters from form data
        params_str = request.form.get('params', '{}')
        try:
            params = json.loads(params_str)
        except json.JSONDecodeError:
            return jsonify({
                "status": "error",
                "message": "Invalid JSON in params field"
            }), 400
            
        # Get threshold from request, default to 0.5 if not provided
        try:
            threshold = float(request.form.get('threshold', 0.5))
        except ValueError:
            return jsonify({
                "status": "error",
                "message": "Invalid threshold value. Must be a number."
            }), 400

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                # Save uploaded model file
                model_path = os.path.join(temp_dir, secure_filename(model_file.filename))
                model_file.save(model_path)
                
                # Use the default dataset with relative path (updated to point to the correct location)
                script_dir = os.path.dirname(os.path.abspath(__file__))
                default_dataset = os.path.join(script_dir, 'dataset', 'loan_approval', 'loan_approval_dataset.csv')
                default_dataset = os.path.normpath(default_dataset)  # Normalize the path
                print(f"Looking for dataset at: {default_dataset}")
                
                # Log the path for debugging
                print(f"Looking for dataset at: {default_dataset}")
                
                if not os.path.exists(default_dataset):
                    # Check if directory exists
                    dataset_dir = os.path.dirname(default_dataset)
                    if not os.path.exists(dataset_dir):
                        print(f"Dataset directory not found: {dataset_dir}")
                    else:
                        # Directory exists but file doesn't, list directory contents
                        try:
                            files = os.listdir(dataset_dir)
                            print(f"Directory exists but file not found. Directory contents: {files}")
                        except Exception as e:
                            print(f"Error listing directory contents: {str(e)}")
                    
                    return jsonify({
                        "status": "error",
                        "message": f"Default dataset not found at: {default_dataset}",
                        "details": {
                            "resolved_path": default_dataset,
                            "current_working_directory": os.getcwd(),
                            "script_directory": os.path.dirname(os.path.abspath(__file__))
                        }
                    }), 500
                    
                # Create a filtered version of the dataset with only the selected parameters
                import pandas as pd
                
                try:
                    # Read the full dataset
                    df = pd.read_csv(default_dataset)
                    
                    # Get the list of columns to keep (user parameters + target variable if it exists)
                    target_column = params.get('target_column', 'Loan_Status')  # Default target column name
                    columns_to_keep = params.get('features', [])  # User-selected features
                    
                    # Always include the target column if it's not already in the list
                    if target_column and target_column not in columns_to_keep:
                        columns_to_keep.append(target_column)
                    
                    # Filter the dataset to only include selected columns
                    if columns_to_keep:
                        # Ensure all requested columns exist in the dataset
                        valid_columns = [col for col in columns_to_keep if col in df.columns]
                        if not valid_columns:
                            return jsonify({
                                "status": "error",
                                "message": "None of the specified features exist in the dataset"
                            }), 400
                        
                        # Create filtered dataset
                        filtered_df = df[valid_columns]
                        
                        # Save filtered dataset to a temporary file
                        filtered_dataset_path = os.path.join(temp_dir, 'filtered_dataset.csv')
                        filtered_df.to_csv(filtered_dataset_path, index=False)
                        test_path = filtered_dataset_path
                    else:
                        # If no features specified, use the full dataset
                        test_path = default_dataset
                        
                except Exception as e:
                    return jsonify({
                        "status": "error",
                        "message": f"Error processing dataset: {str(e)}"
                    }), 500
                
                # Import the loan approval evaluator
                try:
                    print("\n=== Before importing loan_approval module ===")
                    print(f"Python path: {sys.path}")
                    print(f"Current directory contents: {os.listdir('.')}")
                    
                    # Try to list the bias directory to check its contents
                    try:
                        bias_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bias')
                        print(f"Bias directory exists: {os.path.exists(bias_dir)}")
                        if os.path.exists(bias_dir):
                            print(f"Bias directory contents: {os.listdir(bias_dir)}")
                    except Exception as dir_err:
                        print(f"Error checking bias directory: {str(dir_err)}")
                    
                    from bias.loan_approval import MLFairnessEvaluator, ValidationError
                    print("Successfully imported MLFairnessEvaluator and ValidationError")
                except ImportError as e:
                    import traceback
                    print(f"Error importing loan_approval module: {str(e)}")
                    print(f"Full traceback: {traceback.format_exc()}")
                    return jsonify({
                        "status": "error",
                        "message": f"Could not import loan approval module: {str(e)}",
                        "traceback": traceback.format_exc(),
                        "python_path": sys.path
                    }), 500
                
                # Initialize and run the evaluator with threshold
                evaluator = MLFairnessEvaluator(
                    model_path=model_path,
                    data_path=test_path,
                    params=params,
                    threshold=threshold,  # Add threshold parameter
                    output_dir=temp_dir
                )
                
                # Run the evaluation
                results = evaluator.run_evaluation()
                
                # Prepare response data
                response_data = {
                    'status': 'success',
                    'metrics': {},
                    'visualizations': {},
                    'recommendations': []
                }
                
                # Read metrics from results
                metrics_path = os.path.join(temp_dir, 'metrics.json')
                if os.path.exists(metrics_path):
                    with open(metrics_path, 'r') as f:
                        response_data['metrics'] = json.load(f)
                
                # Read recommendations
                recs_path = os.path.join(temp_dir, 'recommendations.txt')
                if os.path.exists(recs_path):
                    with open(recs_path, 'r') as f:
                        response_data['recommendations'] = [line.strip() for line in f if line.strip()]
                
                # Convert visualizations to base64
                viz_dir = os.path.join(temp_dir, 'visualizations')
                if os.path.exists(viz_dir):
                    for viz_file in os.listdir(viz_dir):
                        if viz_file.endswith(('.png', '.jpg', '.jpeg')):
                            with open(os.path.join(viz_dir, viz_file), 'rb') as f:
                                response_data['visualizations'][viz_file] = f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
                
                # Include predictions if available
                preds_path = os.path.join(temp_dir, 'predictions.csv')
                if os.path.exists(preds_path):
                    with open(preds_path, 'r') as f:
                        response_data['predictions'] = f.read()
                
                return jsonify(response_data)
                
            except ValidationError as e:
                return jsonify({
                    "status": "error",
                    "message": f"Validation error: {str(e)}"
                }), 400
            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": f"Error during evaluation: {str(e)}"
                }), 500
                
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "traceback": traceback.format_exc()
        }), 500

def init_app():
    """Initialize the Flask application with error handling."""
    try:
        with DebugTimer("Application initialization"):
            # Test database connection
            db = get_db()
            if db is None:
                print("Error: Failed to initialize database connection", file=sys.stderr)
                return False
                
            # Additional initialization code can go here
            if DEBUG:
                print("\n=== Application initialized successfully ===\n")
            return True
            
    except Exception as e:
        print(f"\n!!! CRITICAL: Failed to initialize application: {e}", file=sys.stderr)
        if DEBUG:
            traceback.print_exc()
        return False

if __name__ == '__main__':
    # Initialize application
    if not init_app():
        print("Error: Application initialization failed. Exiting...", file=sys.stderr)
        sys.exit(1)
        
    # Start the Flask development server
    try:
        print("\n=== Starting Flask development server... ===\n")
        app.run(
            host=os.getenv('HOST', '0.0.0.0'),
            port=int(os.getenv('PORT', 5000)),
            debug=DEBUG,
            use_reloader=DEBUG,
            threaded=True
        )
    except Exception as e:
        print(f"\n!!! FATAL ERROR: {e}", file=sys.stderr)
        if DEBUG:
            traceback.print_exc()
        sys.exit(1)