import React, { useState, useCallback, useEffect } from 'react';
import { FiCheckCircle, FiUpload, FiFile, FiX, FiChevronRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { postEvaluate } from '../api/client';

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
  const fileInputRef = React.useRef(null);

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
    if (!selectedFile) {
      alert('Please select a model file to upload');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('model_file', selectedFile);
      formData.append('params', JSON.stringify({
        ...params,
        features: selectedFeatures
      }));
      
      const response = await postEvaluate(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        console.log(`Upload Progress: ${percentCompleted}%`);
      });
      
      console.log('Evaluation results:', response.data);
      setIsUploaded(true);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Error uploading and evaluating model';
      alert(`Error: ${errorMessage}`);
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
          <p className="text-gray-600">Upload your loan approval model</p>
        </div>

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
                      <p className="text-xs text-gray-500 mt-1">Supported formats: .h5, .pt, .pkl, .onnx (max 100MB)</p>
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
                      accept=".h5,.pt,.pkl,.onnx"
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
    </div>
  );
}

export default LoanFormPage;
