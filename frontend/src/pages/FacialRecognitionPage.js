import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaFileAlt, FaSpinner } from 'react-icons/fa';

const FacialRecognitionPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setModelFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modelFile) return;

    setIsUploading(true);
    
    // Simulate file upload
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Model uploaded successfully!');
      // navigate('/results'); // Uncomment to navigate after upload
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Facial Recognition Model
          </h1>
          <p className="text-lg text-gray-600">
            Upload your facial recognition model for analysis
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <FaFileAlt className="h-12 w-12 text-blue-500" />
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {modelFile ? (
                  <span className="font-medium">Selected: {modelFile.name}</span>
                ) : (
                  'Drag and drop your model file here, or click to browse'
                )}
              </div>
              <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                <FaUpload className="mr-2 h-4 w-4" />
                Choose File
                <input
                  type="file"
                  className="hidden"
                  accept=".h5,.pb,.tflite,.pt,.pth"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!modelFile || isUploading}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                  !modelFile || isUploading
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isUploading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2 h-5 w-5" />
                    Uploading...
                  </>
                ) : (
                  'Upload Model'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionPage;