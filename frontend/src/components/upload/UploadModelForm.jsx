import React, { useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFileAlt, FaTimes, FaCheck, FaExclamationTriangle, FaUpload } from 'react-icons/fa';
import Button from '../ui/Button';

export default function UploadModelForm({ 
  modelFile, 
  setModelFile, 
  onUpload,
  isUploading,
  logs = [],
  modelType,
  setModelType,
  modelFramework,
  setModelFramework
}) {
  const allowed = ['.pkl', '.joblib', '.onnx', '.pt', '.pth', '.h5'];
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const formRef = useRef(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(fileExt)) {
      return { 
        valid: false, 
        error: `Unsupported file format. Allowed formats: ${allowed.join(', ')}` 
      };
    }
    
    if (file.size > 100 * 1024 * 1024) {
      return { 
        valid: false, 
        error: 'File too large. Maximum size is 100MB' 
      };
    }
    
    return { valid: true };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!modelFile || !modelName.trim()) {
      setFileError('Please provide a model name and select a file');
      return;
    }
    onUpload(e);
  };

  const handleFile = useCallback((file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error);
      return;
    }
    
    setFileError(null);
    setModelFile(file);
  }, [allowed, setModelFile]);

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setModelFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setModelFile]);

  // Auto-scroll to bottom when new logs are added
  const logContentRef = useRef(null);
  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <form ref={formRef} onSubmit={handleSubmit}>
        <motion.div 
          ref={dropAreaRef}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50' 
              : fileError 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          variants={itemVariants}
        >
          <div className="space-y-4">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="flex justify-center">
                <label htmlFor="model-file" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="md"
                    icon={FaUpload}
                    disabled={isUploading}
                  >
                    Choose a file
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="model-file"
                    name="model-file"
                    type="file"
                    className="sr-only"
                    onChange={handleChange}
                    accept=".pkl,.joblib,.onnx,.pt,.pth,.h5"
                    disabled={isUploading}
                  />
                </label>
              </div>
              
              <div className="w-full max-w-md space-y-4">
                <div>
                  <label htmlFor="model-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="model-name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., Sentiment Analysis Model"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="model-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="model-description"
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                    placeholder="Brief description of your model"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="model-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Model Type
                    </label>
                    <select
                      id="model-type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value)}
                    >
                      <option value="classification">Classification</option>
                      <option value="regression">Regression</option>
                      <option value="object-detection">Object Detection</option>
                      <option value="nlp">NLP</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="model-framework" className="block text-sm font-medium text-gray-700 mb-1">
                      Framework
                    </label>
                    <select
                      id="model-framework"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={modelFramework}
                      onChange={(e) => setModelFramework(e.target.value)}
                    >
                      <option value="tensorflow">TensorFlow</option>
                      <option value="pytorch">PyTorch</option>
                      <option value="scikit-learn">Scikit-learn</option>
                      <option value="onnx">ONNX</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {isUploading && (
          <motion.div 
            className="w-full bg-gray-200 rounded-full h-2.5 mt-6 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ 
                width: `${uploadProgress}%`,
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            ></div>
          </motion.div>
        )}

        <motion.div className="flex justify-end mt-6 space-x-3" variants={itemVariants}>
          {modelFile && !isUploading && (
            <Button
              type="button"
              onClick={() => {
                setModelFile(null);
                setModelName('');
                setModelDescription('');
                setFileError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              variant="outline"
              size="md"
              className="text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              Clear
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!modelFile || isUploading}
            className="w-full sm:w-auto"
            icon={FaUpload}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : 'Upload Model'}
          </Button>
        </motion.div>

        <AnimatePresence>
          {logs.length > 0 && (
            <motion.div 
              className="mt-6 p-4 bg-gray-50 rounded-md max-h-40 overflow-y-auto border border-gray-200"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Upload Logs
              </h3>
              <div className="text-xs font-mono space-y-1">
                {logs.map((log, index) => (
                  <motion.div 
                    key={index} 
                    className="text-gray-600 border-l-2 border-gray-300 pl-2 py-0.5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className="text-gray-400 mr-2">
                      {new Date().toLocaleTimeString()}
                    </span>
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
