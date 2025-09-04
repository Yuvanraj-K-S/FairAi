import React, { useState, useEffect, useCallback } from 'react';
import { FiUpload, FiDatabase, FiSliders, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import UploadModelForm from '../components/upload/UploadModelForm';
import UploadDatasetForm from '../components/upload/UploadDatasetForm';
import DatasetPreview from '../components/upload/DatasetPreview';
import FeaturesSelector, { LabelDropdown } from '../components/config/FeaturesSelector';
import ThresholdSlider from '../components/run/ThresholdSlider';
import RunEvaluationButton from '../components/run/RunEvaluationButton';

function UploadModelPage() {
  // State for model file
  const [modelFile, setModelFile] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // State for dataset file and preview
  const [csvFile, setCsvFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  
  // State for model configuration
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [label, setLabel] = useState('');
  const [threshold, setThreshold] = useState(0.5);
  
  // Add a log entry
  const addLog = useCallback((message, type = 'info') => {
    setLogs(prevLogs => [...prevLogs, { message, type }]);
  }, []);
  
  // Reset features and label when dataset changes
  useEffect(() => {
    setSelectedFeatures([]);
    setLabel('');
  }, [csvFile]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Model Fairness Evaluation
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Upload your model and dataset to analyze for potential biases
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center ${modelFile ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${modelFile ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {modelFile ? <FiCheckCircle className="h-5 w-5" /> : <span>1</span>}
              </div>
              <span className="ml-2 text-sm font-medium">Upload Model</span>
            </div>
            
            <div className="flex-auto border-t-2 border-gray-200 mx-4 mt-1"></div>
            
            <div className={`flex items-center ${csvFile ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${csvFile ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {csvFile ? <FiCheckCircle className="h-5 w-5" /> : <span>2</span>}
              </div>
              <span className="ml-2 text-sm font-medium">Upload Dataset</span>
            </div>
            
            <div className="flex-auto border-t-2 border-gray-200 mx-4 mt-1"></div>
            
            <div className={`flex items-center ${selectedFeatures.length > 0 && label ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${selectedFeatures.length > 0 && label ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {selectedFeatures.length > 0 && label ? <FiCheckCircle className="h-5 w-5" /> : <span>3</span>}
              </div>
              <span className="ml-2 text-sm font-medium">Configure</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload Sections */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  <FiUpload className="inline-block mr-2 text-blue-500" />
                  Upload Model
                </h3>
              </div>
              <div className="px-6 py-5">
                <UploadModelForm 
                  modelFile={modelFile}
                  setModelFile={(file) => {
                    setModelFile(file);
                    if (file) {
                      addLog(`Selected model: ${file.name} (${Math.round(file.size / 1024)} KB)`);
                    } else {
                      addLog('Model file removed');
                    }
                  }}
                  logs={logs}
                />
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  <FiDatabase className="inline-block mr-2 text-blue-500" />
                  Upload Dataset
                </h3>
              </div>
              <div className="px-6 py-5">
                <UploadDatasetForm 
                  csvFile={csvFile}
                  setCsvFile={setCsvFile}
                  setHeaders={setHeaders}
                  setPreviewRows={setPreviewRows}
                />
              </div>
            </div>
            
            {previewRows.length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Dataset Preview
                  </h3>
                </div>
                <div className="px-6 py-5">
                  <DatasetPreview previewRows={previewRows} />
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Configuration and Actions */}
          <div className="space-y-6">
            {headers.length > 0 ? (
              <>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      <FiSliders className="inline-block mr-2 text-blue-500" />
                      Configuration
                    </h3>
                  </div>
                  <div className="px-6 py-5 space-y-6">
                    <FeaturesSelector 
                      headers={headers}
                      selectedFeatures={selectedFeatures}
                      setSelectedFeatures={setSelectedFeatures}
                    />
                    
                    <LabelDropdown 
                      headers={headers}
                      label={label}
                      setLabel={setLabel}
                    />
                    
                    <ThresholdSlider 
                      value={threshold}
                      setValue={setThreshold}
                    />
                    
                    <div className="pt-4 border-t border-gray-200">
                      <RunEvaluationButton 
                        modelFile={modelFile}
                        csvFile={csvFile}
                        paramsJson={{
                          features: selectedFeatures,
                          label: label,
                          threshold: threshold
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Upload a dataset to configure the evaluation parameters.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {modelFile && !csvFile && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Now upload a dataset to evaluate your model.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadModelPage;
