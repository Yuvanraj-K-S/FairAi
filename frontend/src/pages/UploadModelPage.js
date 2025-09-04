/**
 * UploadModelPage Component
 * 
 * This component provides an interface for uploading AI models with metadata.
 * 
 * Features:
 * - Drag and drop file upload
 * - Model metadata collection
 * - Responsive design
 * - Toast notifications
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import UploadModelForm from '../components/upload/UploadModelForm';
import { toast } from 'react-hot-toast';

const UploadModelPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modelType, setModelType] = useState('classification');
  const [modelFramework, setModelFramework] = useState('tensorflow');

  const handleUpload = (e) => {
    e.preventDefault();
    if (!modelFile) {
      toast.error('Please select a model file to upload');
      return;
    }
    
    setIsUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      setIsUploading(false);
      setModelFile(null);
      toast.success('Model uploaded successfully!');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Upload AI Model
          </h1>
          <p className="text-gray-600">Upload your AI model for analysis</p>
        </div>

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <UploadModelForm
            modelFile={modelFile}
            setModelFile={setModelFile}
            modelType={modelType}
            setModelType={setModelType}
            modelFramework={modelFramework}
            setModelFramework={setModelFramework}
            handleUpload={handleUpload}
            isUploading={isUploading}
          />
        </motion.div>
      </div>
    </div>
  );
};

// Add prop type validation if needed
// UploadModelPage.propTypes = {
//   // Add prop types here
// };

export default UploadModelPage;
