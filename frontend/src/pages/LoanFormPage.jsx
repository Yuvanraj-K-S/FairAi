import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFile, FiCheckCircle, FiX } from 'react-icons/fi';
import apiClient from '../api/client';

function LoanFormPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a model file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('model_file', selectedFile);
      
      const response = await apiClient.post('/api/loan/evaluate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Navigate to the new loan results page with the evaluation data
      navigate('/results/loan', { state: { evaluationResults: response.data } });
    } catch (err) {
      console.error('Error uploading model:', err);
      setError('Failed to upload and evaluate model. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            Loan Model Evaluation
          </h2>
          <p className="text-gray-600">
            Upload your loan approval model for fairness and performance evaluation
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Model</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your trained loan approval model file for evaluation. Supported formats: .pkl, .joblib, .h5
            </p>
            
            <div className="mt-2 flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pkl,.joblib,.h5,.model"
                id="model-upload"
              />
              <label
                htmlFor="model-upload"
                className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center">
                  <FiUpload className="mr-2 h-4 w-4" />
                  {selectedFile ? 'Change File' : 'Select File'}
                </div>
              </label>
              
              {selectedFile && (
                <div className="ml-4 flex items-center">
                  <FiFile className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-700 truncate max-w-xs">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={resetFile}
                    className="ml-2 text-gray-400 hover:text-gray-500"
                    aria-label="Remove file"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                !selectedFile || isUploading
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Evaluating...
                </>
              ) : (
                <>
                  <FiCheckCircle className="-ml-1 mr-2 h-4 w-4" />
                  Evaluate Model
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">About Loan Model Evaluation</h3>
          <div className="prose prose-sm text-gray-500">
            <p>
              Our evaluation system will analyze your loan approval model for:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Prediction accuracy and performance metrics</li>
              <li>Fairness across different demographic groups</li>
              <li>Potential biases in loan approval rates</li>
              <li>Compliance with fair lending regulations</li>
            </ul>
            <p className="mt-3">
              After evaluation, you'll receive a detailed report with insights and recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoanFormPage;
