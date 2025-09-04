import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFile, FiCheckCircle, FiX, FiChevronRight } from 'react-icons/fi';

const FacialRecognitionPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setFileName(file.name);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsUploaded(true);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileName('');
    setIsUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Facial Recognition Analysis</h1>
                <p className="mt-1 text-sm text-gray-500">Upload your facial recognition model for bias analysis</p>
              </div>
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 py-8">
            {isUploaded ? (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6">
                  <FiCheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-medium text-gray-900 mb-2">Upload Complete</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Your facial recognition model has been successfully uploaded and is being analyzed for potential biases.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Upload Another Model
                  </button>
                  <button
                    onClick={() => navigate('/results')}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Results
                    <FiChevronRight className="ml-2 -mr-1 h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="space-y-6">
                  {/* Upload Section */}
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-150">
                      {fileName ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-blue-50">
                            <FiFile className="h-8 w-8 text-blue-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs mx-auto">
                            {fileName}
                          </p>
                          <div className="flex justify-center space-x-4">
                            <button
                              type="button"
                              onClick={handleButtonClick}
                              className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={resetForm}
                              className="text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                            <FiUpload className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex flex-col items-center text-sm text-gray-600">
                            <button
                              type="button"
                              onClick={handleButtonClick}
                              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                            >
                              Click to upload
                            </button>
                            <p className="mt-1">or drag and drop</p>
                            <p className="mt-1 text-xs text-gray-500">Model files (.h5, .pb, .tflite, .pt, .pth)</p>
                          </div>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".h5,.pb,.tflite,.pt,.pth"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
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
                            Uploading...
                          </>
                        ) : (
                          'Upload Model'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionPage;