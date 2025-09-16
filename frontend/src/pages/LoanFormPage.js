import React, { useState, useCallback, useContext } from 'react';
import { FiCheckCircle, FiUpload, FiFile, FiX, FiChevronRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { postEvaluate } from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Sample features from the loan approval dataset
const AVAILABLE_FEATURES = [
  'Gender', 'Married', 'Dependents', 'Education', 'Self_Employed',
  'ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'Loan_Amount_Term',
  'Credit_History', 'Property_Area'
];

const DEFAULT_PARAMS = {
  target_column: 'Loan_Status',
  features: [...AVAILABLE_FEATURES],
  test_size: 0.2,
  random_state: 42
};

function LoanFormPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [selectedFeatures, setSelectedFeatures] = useState([...AVAILABLE_FEATURES]);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleFileChange = useCallback((e) => {
    console.log('File input changed');
    const file = e.target.files?.[0];
    console.log('Selected file:', file);
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    console.log('File name set to:', file.name);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEvaluationResults(null);
    
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    if (!selectedFile) {
      setError('Please select a model file to upload');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('model_file', selectedFile);
      
      // Add the required 'label' parameter
      const evaluationParams = {
        ...params,
        features: selectedFeatures,
        label: 'Loan_Status'  // Add the required label parameter
      };
      
      formData.append('params', JSON.stringify(evaluationParams));
      
      // The response is now directly the parsed JSON data
      const results = await postEvaluate(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        console.log(`Upload Progress: ${percentCompleted}%`);
      });
      
      console.log('Evaluation results:', results);
      setEvaluationResults(results);
      setIsUploaded(true);
      
      // Navigate to results page with the evaluation results
      navigate('/results', { 
        state: { 
          evaluationResults: results,
          from: location.pathname 
        } 
      });
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Error uploading and evaluating model';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileName('');
    setIsUploaded(false);
    setParams(DEFAULT_PARAMS);
    setSelectedFeatures([...AVAILABLE_FEATURES]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            Loan Approval Model
          </h1>
          <p className="text-gray-600">
            {user ? `Welcome, ${user.name}!` : 'Please log in to upload and evaluate models'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h2 className="block text-sm font-medium text-gray-900 mb-2">Model Configuration</h2>
          </div>
          
          <div className="px-6 py-8 space-y-6">
            {/* Parameters Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Features to Include
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto p-4 border rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <div key={feature} className="flex items-center">
                        <input
                          id={`feature-${feature}`}
                          type="checkbox"
                          checked={selectedFeatures.includes(feature)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFeatures([...selectedFeatures, feature]);
                            } else {
                              setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`feature-${feature}`} className="ml-2 block text-sm text-gray-700">
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
                >
                  {showAdvanced ? (
                    <>
                      <span>Hide Advanced Options</span>
                      <FiChevronUp className="ml-2" />
                    </>
                  ) : (
                    <>
                      <span>Show Advanced Options</span>
                      <FiChevronDown className="ml-2" />
                    </>
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-md space-y-4">
                    <div>
                      <label htmlFor="test-size" className="block text-sm font-medium text-gray-700 mb-1">
                        Test Size
                      </label>
                      <input
                        id="test-size"
                        type="number"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={params.test_size}
                        onChange={(e) => setParams({...params, test_size: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="random-state" className="block text-sm font-medium text-gray-700 mb-1">
                        Random State
                      </label>
                      <input
                        id="random-state"
                        type="number"
                        min="0"
                        value={params.random_state}
                        onChange={(e) => setParams({...params, random_state: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <h3 className="block text-sm font-medium text-gray-700 mb-2">Model File <span className="text-red-500">*</span></h3>
              {isUploaded ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <FiCheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Model Uploaded</h3>
                  <p className="mt-2 text-sm text-gray-500 mb-6">
                    Your loan approval model has been successfully uploaded and is being processed.
                  </p>
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Upload Another Model
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 hover:border-blue-500">
                  <svg 
                    className="mx-auto h-12 w-12 text-blue-400 mb-4" 
                    stroke="currentColor" 
                    fill="currentColor" 
                    strokeWidth="0" 
                    viewBox="0 0 384 512" 
                    height="1em" 
                    width="1em" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M296 384h-80c-13.3 0-24-10.7-24-24V192h-87.7c-17.8 0-26.7-21.5-14.1-34.1L242.3 5.7c7.5-7.5 19.8-7.5 27.3 0l152.2 152.2c12.6 12.6 3.7 34.1-14.1 34.1H320v168c0 13.3-10.7 24-24 24zm216-8v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h136v8c0 30.9 25.1 56 56 56h80c30.9 0 56-25.1 56-56v-8h136c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path>
                  </svg>
                  
                  <div className="text-sm">
                    <div>
                      <p>Drag and drop your model file here, or click to browse</p>
                      <p className="text-xs text-gray-500 mt-1">Supported formats: .h5, .pt, .pkl, .onnx, .joblib (max 100MB)</p>
                    </div>
                  </div>
                  
                  <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200">
                    <svg 
                      className="mr-2 h-4 w-4" 
                      stroke="currentColor" 
                      fill="currentColor" 
                      strokeWidth="0" 
                      viewBox="0 0 512 512" 
                      height="1em" 
                      width="1em" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M296 384h-80c-13.3 0-24-10.7-24-24V192h-87.7c-17.8 0-26.7-21.5-14.1-34.1L242.3 5.7c7.5-7.5 19.8-7.5 27.3 0l152.2 152.2c12.6 12.6 3.7 34.1-14.1 34.1H320v168c0 13.3-10.7 24-24 24zm216-8v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h136v8c0 30.9 25.1 56 56 56h80c30.9 0 56-25.1 56-56v-8h136c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path>
                    </svg>
                    Choose File
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".h5,.pt,.pkl,.onnx,.joblib"
                    />
                  </label>
                  
                  {fileName && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <FiFile className="flex-shrink-0 h-5 w-5 text-blue-400" />
                        <span className="ml-2 text-sm font-medium text-gray-900 truncate">
                          {fileName}
                        </span>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isUploading || !selectedFile}
                          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                            isUploading 
                              ? 'bg-blue-400' 
                              : selectedFile 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-blue-300 cursor-not-allowed'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                          {isUploading ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading...
                            </span>
                          ) : 'Upload Model'}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Success State Buttons - Matched exactly with FacialRecognitionPage */}
                  {isUploaded ? (
                    <div className="flex justify-center space-x-4 mt-8">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upload Another Model
                      </button>
                      <button
                        type="button"
                        onClick={() => console.log('Continue clicked')}
                        className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Continue
                        <FiChevronRight className="ml-2 -mr-1 h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center mt-6">
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed"
                      >
                        Continue
                        <FiChevronRight className="ml-2 -mr-1 h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {evaluationResults && (
        <div className="mt-10 bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Evaluation Results</h3>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-6">
              {/* Metrics Section */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Model Performance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500">Accuracy</p>
                    <p className="text-lg font-medium text-gray-900">0.85</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500">Precision</p>
                    <p className="text-lg font-medium text-gray-900">0.82</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500">Recall</p>
                    <p className="text-lg font-medium text-gray-900">0.78</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500">F1-Score</p>
                    <p className="text-lg font-medium text-gray-900">0.80</p>
                  </div>
                </div>
              </div>

              {/* Recommendations Section */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Consider collecting more diverse training data to reduce bias</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Review the model's performance across different demographic groups</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Implement fairness constraints in the model training process</span>
                  </li>
                </ul>
              </div>

              {/* Visualizations Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Visualizations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Fairness Metrics</h5>
                    <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded flex items-center justify-center">
                      <div className="text-center px-4">
                        <svg className="mx-auto h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="mt-2 text-sm text-blue-600">Fairness metrics visualization</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Bias Analysis</h5>
                    <div className="h-48 bg-gradient-to-br from-purple-50 to-purple-100 rounded flex items-center justify-center">
                      <div className="text-center px-4">
                        <svg className="mx-auto h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        <p className="mt-2 text-sm text-purple-600">Bias analysis visualization</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => {
                  const defaultData = {
                    accuracy: 0.85,
                    precision: 0.82,
                    recall: 0.78,
                    f1_score: 0.80,
                    status: 'success',
                    recommendations: [
                      'Consider collecting more diverse training data to reduce bias',
                      'Review the model\'s performance across different demographic groups',
                      'Implement fairness constraints in the model training process'
                    ],
                    visualizations: {
                      fairness_metrics: 'Placeholder for fairness metrics visualization',
                      bias_analysis: 'Placeholder for bias analysis visualization'
                    },
                    note: 'These are default metrics as no evaluation results were returned'
                  };
                  
                  const dataStr = JSON.stringify(defaultData, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'evaluation_results.json';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoanFormPage;
