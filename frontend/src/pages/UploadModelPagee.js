import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
          
          setUploadedModels(prev => [...prev, newModel]);
          setModelFile(null);
          setIsUploading(false);
          setUploadProgress(0);
          setLogs(prev => [...prev, 'Upload completed successfully!']);
          toast.success('Model uploaded successfully!');
        }, 500);
      }
    }, 100);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5 }
    }
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

  const tabs = [
    { id: 'upload', name: 'Upload Model', icon: FaUpload, count: 0 },
    { id: 'models', name: 'My Models', icon: FaRobot, count: uploadedModels.length },
  ];

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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Your Uploaded Models</h3>
              <p className="mt-1 text-sm text-gray-500">Manage your AI models and view their details.</p>
            </div>
            
            {uploadedModels.length === 0 ? (
              <div className="text-center py-12">
                <FaHistory className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No models uploaded yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by uploading your first AI model.
                </p>
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
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {uploadedModels.map((model) => (
                    <li key={model.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {model.name}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {model.status}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <span className="capitalize">{model.type}</span>
                              <span className="mx-1">•</span>
                              {model.framework}
                              <span className="mx-1">•</span>
                              {model.size}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              Uploaded <time dateTime={model.uploadDate}>
                                {new Date(model.uploadDate).toLocaleDateString()}
                              </time>
                            </p>
                          </div>
                        </div>
                        {model.description && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {model.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <motion.div 
        className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            AI Model Management
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Upload and manage your AI models with ease
          </p>
        </motion.div>

        <motion.div 
          className="bg-white shadow overflow-hidden sm:rounded-lg"
          variants={itemVariants}
        >
          <div className="border-b border-gray-200">
            <nav className="flex space-x-2 px-4 pt-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant={activeTab === tab.id ? 'primary' : 'outline'}
                  size="sm"
                  className={`rounded-b-none border-b-0 ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.name}
                    {tab.count > 0 && (
                      <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600">
                        {tab.count}
                      </span>
                    )}
                  </div>
                </Button>
              ))}
            </nav>
          </div>
          
          <motion.div
            key={activeTab}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={tabVariants}
            className="p-6"
          >
            {renderTabContent()}
          </motion.div>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

export default UploadModelPage;
