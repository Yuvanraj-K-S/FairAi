import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFile, FiSettings, FiDatabase, FiPlay, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

const API_URL = 'http://localhost:5000/api/face/evaluate';

const FacialUploadPage = () => {
  const navigate = useNavigate();
  const [modelFile, setModelFile] = useState(null);
  const [configFile, setConfigFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfigDragging, setIsConfigDragging] = useState(false);
  const [isDatasetDragging, setIsDatasetDragging] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [usingDefault, setUsingDefault] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleDragOver = useCallback((e, isConfig = false, isDataset = false) => {
    e.preventDefault();
    if (isConfig) setIsConfigDragging(true);
    else if (isDataset) setIsDatasetDragging(true);
    else setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e, isConfig = false, isDataset = false) => {
    e.preventDefault();
    if (isConfig) setIsConfigDragging(false);
    else if (isDataset) setIsDatasetDragging(false);
    else setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e, isConfig = false, isDataset = false) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (isConfig) {
        if (
          file.size <= 5 * 1024 * 1024 &&
          (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml'))
        ) setConfigFile(file);
      } else if (isDataset) {
        if (file.name.endsWith('.zip')) setDatasetFile(file);
      } else {
        const validExtensions = ['.h5', '.pt', '.pkl', '.onnx'];
        if (file.size <= 200 * 1024 * 1024 && validExtensions.some((ext) => file.name.endsWith(ext))) {
          setModelFile(file);
        }
      }
    }
    if (isConfig) setIsConfigDragging(false);
    else if (isDataset) setIsDatasetDragging(false);
    else setIsDragging(false);
  }, []);

  const handleFileChange = (e, isConfig = false, isDataset = false) => {
    const file = e.target.files[0];
    if (file) {
      if (isConfig) setConfigFile(file);
      else if (isDataset) setDatasetFile(file);
      else setModelFile(file);
    }
  };

  // Upload & Continue -> use custom model (modelFile required)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modelFile) {
      alert('Please select a model file to upload (custom model).');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please login.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('threshold', 0.5);
      formData.append('augment', 'flip,rotation,brightness,blur');
      formData.append('use_default_model', 'false');
      formData.append('model_file', modelFile);
      if (configFile) formData.append('config_file', configFile);
      // optional: if user uploaded dataset, send it; else backend will use server dataset
      if (datasetFile) formData.append('dataset_zip', datasetFile);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const json = await res.json();
      
      // Redirect to results page with evaluation data
      navigate('/results/facial-recognition', {
        state: { evaluationData: json }
      });
    } catch (err) {
      console.error('Custom model evaluation failed:', err);
      setErrorMsg(err.message || String(err));
    } finally {
      setIsUploading(false);
    }
  };

  // Continue with Default Model -> DO NOT require dataset upload here
  const handleDefaultModel = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please login.');
      return;
    }

    setUsingDefault(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('threshold', 0.5);
      formData.append('augment', 'flip,rotation,brightness,blur');
      formData.append('use_default_model', 'true');
      // note: not appending dataset_zip => backend will use server dataset
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const json = await res.json();
      
      // Redirect to results page with evaluation data
      navigate('/results/facial-recognition', {
        state: { evaluationData: json }
      });
    } catch (err) {
      console.error('Default model evaluation failed:', err);
      setErrorMsg(err.message || String(err));
    } finally {
      setUsingDefault(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Facial Recognition{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Bias Evaluation
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload your custom model or use our default model to evaluate bias in facial recognition systems
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Custom Model Upload */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <FiUpload className="mr-2 text-purple-600 dark:text-purple-400" />
                Custom Model Upload
              </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Model File */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Model File
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : modelFile
                      ? 'border-success-400 bg-success-50 dark:bg-success-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e)}
                  onDragLeave={(e) => handleDragLeave(e)}
                  onDrop={(e) => handleDrop(e)}
                >
                  {modelFile ? (
                    <div className="space-y-3">
                      <FiCheckCircle className="mx-auto h-8 w-8 text-success-600" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{modelFile.name}</p>
                      <p className="text-xs text-gray-500">{(modelFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FiFile className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Drag & drop model file or click to browse
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports: .pt, .onnx, .h5, .pkl
                      </p>
                    </div>
                  )}
                  <label className="mt-4 btn-secondary cursor-pointer text-sm">
                    <FiUpload className="mr-2 h-4 w-4" />
                    {modelFile ? 'Change File' : 'Choose File'}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pt,.pth,.onnx,.h5,.pb,.pkl" 
                      onChange={(e) => handleFileChange(e)} 
                    />
                  </label>
                </div>
              </div>

              {/* Config File */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Configuration File (Optional)
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
                    isConfigDragging
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : configFile
                      ? 'border-success-400 bg-success-50 dark:bg-success-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, true)}
                  onDragLeave={(e) => handleDragLeave(e, true)}
                  onDrop={(e) => handleDrop(e, true)}
                >
                  <FiSettings className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  {configFile ? (
                    <p className="text-sm font-medium text-success-600">{configFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-500">JSON/YAML configuration</p>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".json,.yaml,.yml" 
                    onChange={(e) => handleFileChange(e, true)} 
                  />
                </div>
              </div>

              {/* Dataset File */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Dataset ZIP (Optional)
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
                    isDatasetDragging
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : datasetFile
                      ? 'border-success-400 bg-success-50 dark:bg-success-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, false, true)}
                  onDragLeave={(e) => handleDragLeave(e, false, true)}
                  onDrop={(e) => handleDrop(e, false, true)}
                >
                  <FiDatabase className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  {datasetFile ? (
                    <p className="text-sm font-medium text-success-600">{datasetFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Server dataset used by default</p>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".zip" 
                    onChange={(e) => handleFileChange(e, false, true)} 
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading || !modelFile}
                  className="btn-primary px-8 py-3 text-base font-semibold"
                >
                  {isUploading ? (
                    <>
                      <div className="loading-spinner mr-2" />
                      Evaluating Model...
                    </>
                  ) : (
                    <>
                      <FiUpload className="mr-2" />
                      Start Evaluation
                    </>
                  )}
                </button>
              </div>
            </form>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            {/* Default Model Option */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card p-6 h-fit"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FiPlay className="mr-2 text-purple-600" />
                Quick Start
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      Pre-trained Model
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Industry-standard facial recognition model
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-success-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      Benchmark Dataset
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Curated dataset for bias evaluation
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-warning-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      Instant Results
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      No file uploads required
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-error-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      Bias Analysis
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Comprehensive fairness metrics
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  <strong>Tip:</strong> Use the default model to quickly understand bias evaluation 
                  before uploading your custom model.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDefaultModel}
                disabled={usingDefault}
                className="w-full btn-success py-3 font-semibold mt-6"
              >
                {usingDefault ? (
                  <>
                    <div className="loading-spinner mr-2" />
                    Running Default Model...
                  </>
                ) : (
                  <>
                    <FiPlay className="mr-2" />
                    Start with Default Model
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </div>

        {/* Error Display */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-error-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                  Evaluation Error
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">{errorMsg}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FacialUploadPage;