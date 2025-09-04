import React, { useState, useCallback } from 'react';
import { FiCheckCircle, FiCamera } from 'react-icons/fi';

function LoanFormPage() {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [preview, setPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setSelectedApplication(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApplication) return;
    
    setIsUploading(true);
    
    try {
      // Simulate API upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Uploading application:', selectedApplication.name);
      setIsUploaded(true);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedApplication(null);
    setPreview('');
    setIsUploaded(false);
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            Loan Application
          </h1>
          <p className="text-gray-600">Upload your loan application for processing</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Upload Application</h2>
          </div>
          
          <div className="px-6 py-8">
            {isUploaded ? (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <FiCheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Application Submitted</h3>
                <p className="mt-2 text-sm text-gray-500 mb-6">
                  Your loan application has been successfully uploaded and is being processed.
                </p>
                <button
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload Another Application
                </button>
              </div>
            ) : (
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors duration-150">
                <div className="space-y-4 text-center">
                  {preview ? (
                    <div className="space-y-4">
                      <img
                        src={preview}
                        alt="Application preview"
                        className="mx-auto max-h-60 rounded-lg shadow-sm"
                      />
                      <div className="flex justify-center space-x-3">
                        <button
                          type="button"
                          onClick={() => document.getElementById('application-upload').click()}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreview('')}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-blue-50">
                          <FiCamera className="h-10 w-10 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <label
                          htmlFor="application-upload"
                          className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md px-2 py-1"
                        >
                          <span>Click to upload</span>
                          <input
                            id="application-upload"
                            name="application-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="mt-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                    </>
                  )}
                  {preview && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!selectedApplication || isUploading}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                          !selectedApplication || isUploading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        } focus:outline-none transition-colors duration-150`}
                      >
                        {isUploading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : 'Submit Application'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default LoanFormPage;
