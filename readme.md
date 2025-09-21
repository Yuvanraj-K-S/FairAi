# FairAI - Bias Detection and Mitigation Platform

A comprehensive platform for evaluating and mitigating bias in AI models, with a focus on facial recognition and loan approval systems. The platform provides a user-friendly web interface and RESTful API for analyzing model fairness across different demographic groups.

## 🌟 Features

### Face Recognition Module
- Evaluate bias in face recognition models (ONNX, PyTorch, TensorFlow, H5)
- Support for custom datasets and pre-loaded benchmark datasets
- Comprehensive bias metrics including:
  - False Match Rate (FMR) and False Non-Match Rate (FNMR)
  - Demographic parity difference
  - Equal opportunity difference
  - Statistical parity difference
- Visual reports with charts and downloadable JSON reports
- Support for FaceNet-PyTorch and custom face recognition models

### Loan Approval Module
- Fairness assessment for loan approval models
- Support for scikit-learn, ONNX, PyTorch, and TensorFlow models
- Multiple bias metrics:
  - Disparate impact ratio
  - Equalized odds difference
  - Average odds difference
  - Statistical parity difference
- Interactive visualizations of model performance across groups
- CSV dataset support with configurable sensitive attributes

### User Management
- Secure JWT-based authentication with bcrypt password hashing
- User registration and login system
- Protected API endpoints with token verification
- MongoDB-based user data storage

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB Atlas account or local MongoDB instance
- pip
- npm or yarn

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Yuvanraj-K-S/FairAi.git
   cd FairAi/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the backend directory with the following variables:
   ```env
   MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=FairAI
   SECRET_KEY=your-very-long-secret-key-for-jwt-tokens
   DEBUG=true
   DEFAULT_FACE_DATASET_PATH=./dataset/facial_recognition
   DATASET_PATH=./backend/dataset/facial_recognition
   ```

5. Run the backend server:
   ```bash
   python app.py
   ```
   The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3001` (configured in package.json)

## 📚 Project Structure

```
FairAi/
├── backend/
│   ├── bias/                       # Core bias evaluation modules
│   │   ├── __init__.py
│   │   ├── face_bias_evaluator.py  # Face recognition bias evaluation
│   │   ├── loan_approval.py        # Loan approval fairness analysis
│   │   ├── TRIAL.py               # Experimental evaluation scripts
│   │   └── results/               # Generated evaluation results
│   ├── dataset/                    # Default datasets
│   │   ├── facial_recognition/     # Face recognition test datasets
│   │   └── loan_approval/          # Loan approval test datasets
│   ├── app.py                      # Main Flask application
│   ├── app_refactored.py          # Refactored Flask application with improved logging
│   ├── debug_utils.py             # Debug and profiling utilities
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables (create from template)
│   └── Bias_UI.txt               # UI/UX documentation and specifications
├── frontend/
│   ├── public/                    # Static files and assets
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # API client configuration
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Auth/              # Authentication components
│   │   │   ├── config/            # Configuration components
│   │   │   ├── layout/            # Layout components
│   │   │   ├── run/               # Evaluation run components
│   │   │   ├── ui/                # General UI components
│   │   │   └── upload/            # File upload components
│   │   ├── contexts/              # React context providers
│   │   │   └── AuthContext.js     # Authentication context
│   │   ├── pages/                 # Application pages
│   │   │   ├── HomePage.js        # Landing page
│   │   │   ├── FacialUploadPage.jsx      # Face recognition upload UI
│   │   │   ├── FacialRecognitionResultsPage.jsx  # Face recognition results
│   │   │   ├── LoanFormPage.jsx   # Loan approval evaluation UI
│   │   │   ├── LoanResultsPage.jsx # Loan approval results
│   │   │   └── LoginPage.js       # User authentication
│   │   ├── theme/                 # Theme configuration
│   │   ├── App.js                 # Main application component
│   │   └── index.js              # Application entry point
│   ├── package.json              # Node.js dependencies and scripts
│   └── tailwind.config.js        # Tailwind CSS configuration
├── bias_results/                  # Generated bias evaluation results
│   └── plots/                     # Result visualization plots
├── fairness_results/             # Generated fairness evaluation results
│   └── plots/                     # Fairness visualization plots
├── models/                       # Uploaded and stored models
├── test_results/                 # Test execution results
└── readme.md                     # Project documentation
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
  - Body: `{ "username": "string", "email": "string", "password": "string" }`
- `POST /api/auth/login` - User login
  - Body: `{ "email": "string", "password": "string" }`
- `GET /api/auth/me` - Get current user info (requires JWT token)
- `GET /api/auth/verify` - Verify JWT token validity

### Face Recognition
- `POST /api/face/evaluate` - Evaluate face recognition model (requires JWT token)
  - Form Data Parameters:
    - `model_file`: Model file (.h5, .pt, .pkl, .onnx)
    - `config_file`: Configuration file (.json) - optional
    - `dataset_zip`: Dataset zip file - optional
    - `use_default_model`: Boolean to use default model
    - `threshold`: Confidence threshold (0.0-1.0)
    - `augment`: Comma-separated augmentation methods

### Loan Approval
- `POST /api/loan/evaluate` - Evaluate loan approval model (requires JWT token)
  - Form Data Parameters:
    - `model_file`: Model file (.pkl, .joblib, .onnx, .pt, .h5)
    - `test_data`: Test dataset (.csv)
    - `config`: Configuration JSON string
    - `sensitive_features`: List of sensitive feature names

### System
- `GET /health` - Health check and system status

## 🔧 Configuration

### Face Recognition Configuration
The system uses a default configuration, but you can provide a custom config file:

```json
{
  "input_shape": [224, 224, 3],
  "normalization": {
    "mean": [0.5, 0.5, 0.5],
    "std": [0.5, 0.5, 0.5]
  },
  "model": {
    "embedding_dim": 512
  }
}
```

### Loan Approval Configuration
Configure evaluation parameters through the web interface or API:

```json
{
  "features": ["age", "income", "credit_score"],
  "label": "approved",
  "sensitive_attribute": "gender",
  "positive_label": 1,
  "id_column": "customer_id",
  "threshold": 0.5
}
```

### Supported Model Formats
- **Face Recognition**: `.onnx`, `.pt`, `.pth`, `.h5`, `.pkl`
- **Loan Approval**: `.pkl`, `.joblib`, `.onnx`, `.pt`, `.pth`, `.h5`

### Dataset Requirements

#### Face Recognition Datasets
- **Format**: ZIP file containing images
- **Structure**: 
  ```
  dataset.zip
  ├── group1/
  │   ├── person1/
  │   │   ├── image1.jpg
  │   │   └── image2.jpg
  │   └── person2/
  │       └── image1.jpg
  └── group2/
      └── person1/
          └── image1.jpg
  ```
- **Supported Image Formats**: `.jpg`, `.jpeg`, `.png`, `.bmp`
- **Image Requirements**: Minimum 224x224 pixels recommended

#### Loan Approval Datasets
- **Format**: CSV file with headers
- **Required Columns**: 
  - Target variable (e.g., 'approved', 'loan_status')
  - Sensitive attributes (e.g., 'gender', 'race', 'age_group')
  - Feature columns (e.g., 'income', 'credit_score', 'employment_length')
- **Example Structure**:
  ```csv
  customer_id,age,income,credit_score,gender,race,approved
  1,25,50000,720,female,white,1
  2,35,75000,680,male,black,0
  ```

## 🌐 Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGO_DB_URL` | MongoDB connection string | Yes | `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=FairAI` |
| `SECRET_KEY` | Secret key for JWT tokens (use a long, random string) | Yes | `your-very-long-secret-key-for-jwt-tokens` |
| `DEBUG` | Enable debug mode and detailed logging | No | `true` or `false` (default: `false`) |
| `DEFAULT_FACE_DATASET_PATH` | Path to default face recognition dataset | No | `./dataset/facial_recognition` |
| `DATASET_PATH` | Alternative dataset path | No | `./backend/dataset/facial_recognition` |

### Environment Setup Notes:
- **MONGO_DB_URL**: Get this from your MongoDB Atlas dashboard or use a local MongoDB connection string
- **SECRET_KEY**: Generate a secure random string for JWT token signing (minimum 32 characters recommended)
- **DEBUG**: Set to `true` during development for detailed logging and error traces
- **Dataset Paths**: Ensure these directories exist and contain your test datasets

## 🚀 Running the Complete Project

### Quick Start (Development)

1. **Start the Backend:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   pip install -r requirements.txt
   python app.py
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Access the Application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

### Production Deployment

1. **Backend:** Use a WSGI server like Gunicorn
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Frontend:** Build and serve the React application
   ```bash
   npm run build
   # Serve with nginx, Apache, or any static file server
   ```

3. **Database:** Use MongoDB Atlas for production
   - Create a MongoDB Atlas cluster
   - Update `MONGO_DB_URL` with production connection string
   - Configure IP whitelist and database users

4. **Environment:** Set production environment variables
   ```env
   DEBUG=false
   MONGO_DB_URL=your_production_mongodb_url
   SECRET_KEY=your_very_secure_production_secret_key
   ```

5. **Security Considerations:**
   - Use HTTPS in production
   - Set strong JWT secret keys
   - Configure proper CORS origins
   - Enable MongoDB authentication
   - Use environment-specific configuration files

## 🛠️ Technology Stack

### Backend
- **Framework:** Flask with CORS support
- **Database:** MongoDB with PyMongo
- **Authentication:** JWT with bcrypt password hashing
- **ML Libraries:** PyTorch, ONNX Runtime, scikit-learn, TensorFlow
- **Fairness Libraries:** Fairlearn, AIF360
- **Computer Vision:** OpenCV, Pillow, FaceNet-PyTorch
- **Visualization:** Matplotlib, Seaborn, Plotly

### Frontend
- **Framework:** React 18.2.0
- **Styling:** Tailwind CSS with custom components
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **UI Components:** React Icons, Framer Motion
- **Notifications:** React Hot Toast
- **Data Processing:** PapaParse for CSV handling

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ✉️ Contact

For questions or feedback, please open an issue on our [GitHub repository](https://github.com/Yuvanraj-K-S/FairAi/issues).

## � ATroubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify your `MONGO_DB_URL` is correct
   - Check if your IP is whitelisted in MongoDB Atlas
   - Ensure MongoDB service is running (for local installations)

2. **Frontend Can't Connect to Backend**
   - Verify backend is running on port 5000
   - Check CORS configuration in `app.py`
   - Ensure frontend is configured for port 3001

3. **Model Upload Fails**
   - Check file format is supported (.pkl, .joblib, .onnx, .pt, .h5)
   - Verify file size is within limits
   - Ensure required dependencies are installed (torch, onnxruntime, tensorflow)

4. **JWT Token Issues**
   - Clear browser localStorage and re-login
   - Verify `SECRET_KEY` is set in environment variables
   - Check token expiration settings

### Debug Mode

Enable debug mode for detailed logging:
```env
DEBUG=true
```

This will:
- Enable detailed error traces
- Log all API requests and responses
- Save debug information to `debug.log` and `app.log`

## 📊 Performance Notes

- **Model Evaluation**: Large models may take several minutes to process
- **File Uploads**: Maximum file size is typically 100MB
- **Concurrent Users**: Backend supports multiple concurrent evaluations
- **Memory Usage**: Face recognition models require significant RAM (2GB+ recommended)

## 🔒 Security Features

- **Authentication**: JWT-based with bcrypt password hashing
- **CORS Protection**: Configured for localhost development and production origins
- **Input Validation**: File type and size validation for uploads
- **Error Handling**: Sanitized error messages to prevent information leakage
- **Session Management**: Automatic token expiration and refresh

## 🙏 Acknowledgments

- [Flask](https://flask.palletsprojects.com/) - Web framework
- [React](https://reactjs.org/) - Frontend library
- [MongoDB](https://www.mongodb.com/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [scikit-learn](https://scikit-learn.org/) - Machine learning library
- [PyTorch](https://pytorch.org/) - Deep learning framework
- [ONNX Runtime](https://onnxruntime.ai/) - Model inference
- [Fairlearn](https://fairlearn.org/) - Fairness assessment tools
- [AIF360](https://aif360.mybluemix.net/) - AI Fairness 360 toolkit
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [React Hot Toast](https://react-hot-toast.com/) - Notification system
