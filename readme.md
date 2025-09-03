# FairAI - Model Fairness Evaluation Toolkit

A comprehensive toolkit for evaluating and mitigating bias in machine learning models, with a focus on face recognition and loan approval systems.

## Features

- **Face Recognition Bias Evaluation**
  - Supports ONNX, PyTorch, and TensorFlow models
  - Demographic parity and equal opportunity metrics
  - Visual reports and fairness metrics

- **Loan Approval Fairness Analysis**
  - Comprehensive bias metrics (disparate impact, equalized odds, etc.)
  - Group-wise performance analysis
  - Interactive visualizations

- **Model Support**
  - Multiple model formats (ONNX, PyTorch, TensorFlow, scikit-learn)
  - Batch processing capabilities
  - API and CLI interfaces

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Yuvanraj-K-S/FairAi.git
   cd FairAi/backend
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Quick Start

### Face Recognition Bias Evaluation

```bash
python bias/face-recognition-bias.py \
    --model path/to/model.onnx \
    --dataset path/to/face_dataset/ \
    --config path/to/config.json
```

### Loan Approval Fairness Analysis

```bash
python bias/loan_approval.py \
    --model path/to/model.pkl \
    --data path/to/loan_data.csv \
    --config path/to/config.json
```

## Project Structure

```
FairAi/
├── backend/
│   ├── bias/
│   │   ├── face-recognition-bias.py  # Face recognition bias evaluation
│   │   └── loan_approval.py          # Loan approval fairness analysis
│   ├── requirements.txt              # Python dependencies
│   └── README.md                     # Project documentation
└── README.md                         # Main project documentation
```

## Configuration

Example configuration file (`config.json`):

```json
{
    "features": ["age", "income", "credit_score"],
    "label": "approved",
    "sensitive_attribute": "gender",
    "positive_label": 1,
    "id_column": "customer_id"
}
```

## API Usage

Start the API server:

```bash
python bias/loan_approval.py --serve --port 5000
```

### Endpoints

- `POST /api/loan/evaluate` - Evaluate model fairness
- `GET /health` - Health check

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or feedback, please open an issue on our [GitHub repository](https://github.com/Yuvanraj-K-S/FairAi/issues).
