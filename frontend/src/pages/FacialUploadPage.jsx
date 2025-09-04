import React, { useState, useCallback } from 'react';
import { FaUpload, FaFileAlt, FaSpinner } from 'react-icons/fa';

const FacialUploadPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [configFile, setConfigFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfigDragging, setIsConfigDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e, isConfig = false) => {
    e.preventDefault();
    isConfig ? setIsConfigDragging(true) : setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e, isConfig = false) => {
    e.preventDefault();
    isConfig ? setIsConfigDragging(false) : setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e, isConfig = false) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (isConfig) {
        if (file.size <= 5 * 1024 * 1024 && (file.name.endsWith('.json') || file.name.endsWith('.yaml'))) {
          setConfigFile(file);
        }
      } else {
        const validExtensions = ['.h5', '.pt', '.pkl', '.onnx'];
        if (file.size <= 100 * 1024 * 1024 && validExtensions.some(ext => file.name.endsWith(ext))) {
          setModelFile(file);
        }
      }
    }
    isConfig ? setIsConfigDragging(false) : setIsDragging(false);
  }, []);

  const handleFileChange = (e, isConfig = false) => {
    const file = e.target.files[0];
    if (file) {
      if (isConfig) {
        setConfigFile(file);
      } else {
        setModelFile(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modelFile) return;
    
    setIsUploading(true);
    // TODO: Implement file upload logic
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Upload successful', { modelFile, configFile });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Facial Recognition Model Upload</h1>
          <p className="text-lg text-blue-400">Upload your model and configuration files</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Model File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Model File <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                }`}
                onDragOver={(e) => handleDragOver(e, false)}
                onDragLeave={(e) => handleDragLeave(e, false)}
                onDrop={(e) => handleDrop(e, false)}
              >
                <FaFileAlt className="mx-auto h-12 w-12 text-blue-400 mb-4" />
                <div className="text-sm">
                  {modelFile ? (
                    <p className="text-blue-400 font-medium">{modelFile.name}</p>
                  ) : (
                    <div>
                      <p>Drag and drop your model file here, or click to browse</p>
                      <p className="text-xs text-gray-500 mt-1">Supported formats: .h5, .pt, .pkl, .onnx (max 100MB)</p>
                    </div>
                  )}
                </div>
                <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200">
                  <FaUpload className="mr-2 h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".h5,.pt,.pkl,.onnx"
                    onChange={(e) => handleFileChange(e, false)}
                  />
                </label>
              </div>
            </div>

            {/* Config File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Configuration File (Optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isConfigDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                }`}
                onDragOver={(e) => handleDragOver(e, true)}
                onDragLeave={(e) => handleDragLeave(e, true)}
                onDrop={(e) => handleDrop(e, true)}
              >
                <FaFileAlt className="mx-auto h-12 w-12 text-blue-400 mb-4" />
                <div className="text-sm">
                  {configFile ? (
                    <p className="text-blue-400 font-medium">{configFile.name}</p>
                  ) : (
                    <div>
                      <p>Drag and drop your config file here, or click to browse</p>
                      <p className="text-xs text-gray-500 mt-1">Supported formats: .json, .yaml (max 5MB)</p>
                    </div>
                  )}
                </div>
                <label className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200">
                  <FaUpload className="mr-2 h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".json,.yaml,.yml"
                    onChange={(e) => handleFileChange(e, true)}
                  />
                </label>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!modelFile || isUploading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  !modelFile || isUploading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isUploading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2 h-5 w-5" />
                    Uploading...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default FacialUploadPage;
