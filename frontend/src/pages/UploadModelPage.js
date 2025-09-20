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

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import UploadModelForm from '../components/upload/UploadModelForm';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UploadModelPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modelType, setModelType] = useState('classification');
  const [modelFramework, setModelFramework] = useState('tensorflow');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Get token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  // Set up axios defaults
  const setupAxiosAuth = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };
  
  // Initialize axios auth headers
  useEffect(() => {
    const token = getAuthToken();
    setupAxiosAuth(token);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!modelFile) {
      toast.error('Please select a model file to upload');
      return;
    }

    // Check if user is authenticated
    const token = getAuthToken();
    if (!token || !currentUser) {
      toast.error('Please log in to upload a model');
      navigate('/login', { state: { from: '/upload-model' } });
      return;
    }
    
    const formData = new FormData();
    formData.append('model_file', modelFile);
    formData.append('model_type', modelType);
    formData.append('framework', modelFramework);
    
    try {
      setIsUploading(true);
      
      // Ensure token is set in axios headers
      setupAxiosAuth(token);
      
      const response = await axios.post(
        'http://localhost:5000/api/loan/evaluate',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true,
          timeout: 60000 // 1 minute timeout
        }
      );
      
      // Check if response is valid
      if (response.data) {
        toast.success('Model uploaded and evaluated successfully!');
        
        // Check if this is a loan model evaluation
        if (response.data.hasOwnProperty('fairness_metrics') || 
            response.data.hasOwnProperty('bias_report') || 
            response.data.hasOwnProperty('loan_approval_metrics')) {
          // Navigate to loan model results page
          navigate('/results/loan', { state: { results: response.data } });
        } else {
          // Default to regular results page
          navigate('/results', { state: { results: response.data } });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with a status code outside 2xx
        if (error.response.status === 401) {
          // Unauthorized - token might be invalid or expired
          toast.error('Session expired. Please log in again.');
          logout();
          navigate('/login', { state: { from: '/upload-model' } });
        } else if (error.response.status === 400) {
          // Bad request - show validation errors
          const errorMessage = error.response.data?.message || 'Invalid request. Please check your input.';
          toast.error(errorMessage);
        } else {
          // Other server errors
          const errorMessage = error.response.data?.message || 'Failed to upload model';
          toast.error(errorMessage);
        }
      } else if (error.request) {
        // Request was made but no response received
        toast.error('No response from server. Please try again later.');
      } else {
        // Something else happened
        toast.error(error.message || 'An error occurred. Please try again.');
      }
      
      // Navigate to home page only on error if needed
      if (error.response?.status === 403 || error.response?.status === 500) {
        navigate('/');
      }
    } finally {
      setIsUploading(false);
      setModelFile(null);
    }
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
            onUpload={handleUpload}
            isUploading={isUploading}
            logs={[]}
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
