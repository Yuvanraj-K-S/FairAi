/**
 * UploadModelPage Component
 * 
 * This component provides an interface for uploading and managing AI models.
 * It includes a tabbed interface with two main sections:
 * 1. Upload Model: For uploading new AI models with metadata
 * 2. My Models: For viewing and managing previously uploaded models
 * 
 * Features:
 * - Drag and drop file upload
 * - Upload progress tracking
 * - Model metadata collection
 * - Responsive design
 * - Animated UI transitions
 * - Toast notifications
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MainLayout from '../components/layout/MainLayout';
import UploadModelForm from '../components/upload/UploadModelForm';
import { FaUpload, FaRobot, FaHistory } from 'react-icons/fa';
import Button from '../components/ui/Button';
import { toast } from 'react-hot-toast';

const UploadModelPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [modelType, setModelType] = useState('classification');
  const [modelFramework, setModelFramework] = useState('tensorflow');
  const [uploadedModels, setUploadedModels] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Handles the model upload process
   * @param {Event} e - Form submit event
   */
  const handleUpload = (e) => {
    e.preventDefault();
    if (!modelFile) {
      toast.error('Please select a model file to upload');
      return;
    }
    
    setIsUploading(true);
    setLogs(prev => [...prev, 'Starting upload...']);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      
      if (progress === 25) setLogs(prev => [...prev, 'Validating model...']);
      if (progress === 50) setLogs(prev => [...prev, 'Processing model architecture...']);
      if (progress === 75) setLogs(prev => [...prev, 'Finalizing upload...']);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const newModel = {
            id: Date.now(),
            name: e.target.elements['model-name']?.value || 'Untitled Model',
            type: modelType,
            framework: modelFramework,
            description: e.target.elements['model-description']?.value || '',
            fileName: modelFile.name,
            size: (modelFile.size / (1024 * 1024)).toFixed(2) + ' MB',
            uploadDate: new Date().toISOString(),
            status: 'active'
          };
          
          setUploadedModels(prev => [newModel, ...prev]);
          setLogs(prev => [...prev, 'Upload completed successfully!']);
          setIsUploading(false);
          setModelFile(null);
          setUploadProgress(0);
          
          // Show success toast
          toast.success('Model uploaded successfully!');
        }, 500);
      }
    }, 100);
  };

  // Animation variants for the page container
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

  // Animation variants for individual items
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

  // Animation variants for tab transitions
  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: {
        duration: 0.2
      }
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'upload', name: 'Upload New Model', icon: FaUpload },
    { id: 'models', name: 'My Models', icon: FaRobot, count: uploadedModels.length }
  ];
  
  // Handle model actions
  const handleModelAction = (modelId, action) => {
    switch(action) {
      case 'view':
        toast.success(`Viewing model ${modelId}`);
        break;
      case 'edit':
        toast.info(`Editing model ${modelId}`);
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this model?')) {
          setUploadedModels(prev => prev.filter(m => m.id !== modelId));
          toast.success('Model deleted successfully');
        }
        break;
      default:
        break;
    }
  };

  /**
   * Renders the content for the active tab
   * @returns {JSX.Element} The component for the active tab
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <UploadModelForm
            modelFile={modelFile}
            setModelFile={setModelFile}
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            logs={logs}
            modelType={modelType}
            setModelType={setModelType}
            modelFramework={modelFramework}
            setModelFramework={setModelFramework}
          />
        );
      case 'models':
        return (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {uploadedModels.length === 0 ? (
              <div className="text-center py-12">
                <FaRobot className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No models yet</h3>
                <p className="mt-1 text-sm text-gray-500">Upload your first model to get started</p>
                <div className="mt-6">
                  <Button
                    onClick={() => setActiveTab('upload')}
                    variant="primary"
                    size="md"
                    icon={FaUpload}
                  >
                    Upload Model
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {uploadedModels.map((model) => (
                  <li key={model.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-lg">
                          <FaRobot className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">{model.name}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              model.status === 'Active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {model.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {model.type} • {model.framework} • {model.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleModelAction(model.id, 'view')}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          View
                        </Button>
                        <Button
                          onClick={() => handleModelAction(model.id, 'edit')}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleModelAction(model.id, 'delete')}
                          variant="danger"
                          size="sm"
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {model.description && (
                      <div className="mt-3 pl-14">
                        <p className="text-sm text-gray-600">{model.description}</p>
                      </div>
                    )}
                    <div className="mt-2 pl-14 text-xs text-gray-500">
                      Uploaded: {new Date(model.uploadDate).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-white text-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              AI Model Management
            </h1>
            <p className="text-lg text-gray-600">Upload and manage your AI models with ease</p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="sm:hidden">
              <label htmlFor="tabs" className="sr-only">Select a tab</label>
              <select
                id="tabs"
                name="tabs"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="upload">Upload New Model</option>
                <option value="models">
                  My Models {uploadedModels.length > 0 && `(${uploadedModels.length})`}
                </option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="mr-2 h-5 w-5" />
                      {tab.name}
                      {tab.count > 0 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Add prop type validation if needed
// UploadModelPage.propTypes = {
//   // Add prop types here
// };

export default UploadModelPage;
