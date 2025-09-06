# FairAI - Bias Detection and Mitigation Platform

A comprehensive platform for evaluating and mitigating bias in AI models, with a focus on facial recognition and loan approval systems. The platform provides a user-friendly web interface and RESTful API for analyzing model fairness across different demographic groups.

## 🌟 Features

### Face Recognition Module
- Evaluate bias in face recognition models (ONNX, PyTorch, TensorFlow)
- Support for custom datasets and pre-loaded benchmark datasets
- Comprehensive bias metrics including:
  - Demographic parity difference
  - Equal opportunity difference
  - Statistical parity difference
- Visual reports and fairness metrics dashboard

### Loan Approval Module
- Fairness assessment for loan approval models
- Support for scikit-learn and custom models
- Multiple bias metrics:
  - Disparate impact ratio
  - Equalized odds difference
  - Average odds difference
  - Statistical parity difference
- Interactive visualizations of model performance across groups

### User Management
- Secure JWT-based authentication
- User registration and login
- Protected API endpoints
- Activity logging

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB
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
   Create a `.env` file in the backend directory with:
   ```
   MONGODB_URI=your_mongodb_connection_string
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   DEFAULT_FACE_DATASET_PATH=./dataset/facial_recognition
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
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```
   The frontend will be available at `http://localhost:3000`

## 📚 Project Structure

```
FairAi/
├── backend/
│   ├── bias/
│   │   ├── face_bias_evaluator.py  # Face recognition bias evaluation logic
│   │   └── loan_approval.py        # Loan approval fairness analysis
│   ├── dataset/                    # Default datasets
│   │   ├── facial_recognition/     # Face recognition datasets
│   │   └── loan_approval/          # Loan approval datasets
│   ├── app.py                      # Main Flask application
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Example environment variables
└── frontend/
    ├── public/                     # Static files
    └── src/
        ├── api/                    # API client and services
        ├── components/             # Reusable UI components
        ├── pages/                  # Application pages
        │   ├── FacialUploadPage.jsx  # Face recognition evaluation UI
        │   └── LoanFormPage.js     # Loan approval evaluation UI
        └── App.js                  # Main application component
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/verify` - Verify JWT token

### Face Recognition
- `POST /api/face/evaluate` - Evaluate face recognition model
  - Parameters:
    - `model_file`: Model file (h5, pt, pkl, onnx)
    - `config_file`: Configuration file (json, yaml, yml)
    - `dataset_zip`: Dataset zip file (optional)
    - `use_default_model`: Boolean to use default model
    - `threshold`: Confidence threshold
    - `augment`: Comma-separated augmentation methods

### Loan Approval
- `POST /api/loan/evaluate` - Evaluate loan approval model
  - Parameters:
    - `model_file`: Model file (pkl, joblib)
    - `test_data`: Test dataset (CSV)
    - `config`: Configuration JSON
    - `sensitive_features`: List of sensitive features

### System
- `GET /api/health` - Health check

## 🔧 Configuration

### Face Recognition Configuration
```json
{
  "model_type": "onnx",
  "confidence_threshold": 0.8,
  "demographics": ["gender", "age", "race"],
  "metrics": ["demographic_parity", "equal_opportunity"],
  "output_dir": "./results"
}
```

### Loan Approval Configuration
```json
{
  "features": ["age", "income", "credit_score"],
  "label": "approved",
  "sensitive_attribute": "gender",
  "positive_label": 1,
  "id_column": "customer_id",
  "protected_classes": {
    "gender": ["female"],
    "race": ["african_american", "hispanic"]
  }
}
```

## 🌐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | - |
| `SECRET_KEY` | Secret key for JWT tokens | 'your-secret-key-here' |
| `DEBUG` | Enable debug mode | False |
| `DEFAULT_FACE_DATASET_PATH` | Path to default face dataset | './dataset/facial_recognition' |
| `JWT_ACCESS_TOKEN_EXPIRES` | JWT token expiration time | '3600' (1 hour) |

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ✉️ Contact

For questions or feedback, please open an issue on our [GitHub repository](https://github.com/Yuvanraj-K-S/FairAi/issues).

## 🙏 Acknowledgments

- [Flask](https://flask.palletsprojects.com/)
- [React](https://reactjs.org/)
- [MongoDB](https://www.mongodb.com/)
- [scikit-learn](https://scikit-learn.org/)
- [ONNX Runtime](https://onnxruntime.ai/)
- [PyTorch](https://pytorch.org/)
- [TensorFlow](https://www.tensorflow.org/)
