import { useState, useCallback } from 'react';
import { FiUpload, FiFile, FiSettings, FiDatabase, FiPlay, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

const API_URL = 'http://localhost:5000/api/face/evaluate';

const FacialUploadPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [configFile, setConfigFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfigDragging, setIsConfigDragging] = useState(false);
  const [isDatasetDragging, setIsDatasetDragging] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [usingDefault, setUsingDefault] = useState(false);
  const [results, setResults] = useState(null);
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
    setResults(null);

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
      setResults(json);
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
    setResults(null);

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
      setResults(json);
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

        {/* Results */}
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

        {results && results.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Status Card */}
            <div className="card p-8">
              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900 text-success-600 dark:text-success-400">
                    <FiCheckCircle className="h-8 w-8" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Evaluation Complete
                  </h2>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Your facial recognition model has been successfully evaluated for bias and performance metrics.
                  </p>
                </div>
                <div className="px-4 py-2 rounded-full text-sm font-semibold bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200 border border-success-200 dark:border-success-700">
                  ✓ ANALYSIS COMPLETE
                </div>
              </div>
            </div>

            {/* Overall Metrics */}
            <div className="card p-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <div className="w-1 h-6 bg-purple-500 rounded-full mr-3"></div>
                Overall Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy</p>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {results.metrics.overall?.accuracy !== undefined 
                      ? (results.metrics.overall.accuracy * 100).toFixed(2) + '%' 
                      : 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Overall model accuracy</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">False Match Rate</p>
                    <div className="w-3 h-3 bg-error-500 rounded-full"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {results.metrics.overall?.FMR !== undefined 
                      ? (results.metrics.overall.FMR * 100).toFixed(2) + '%' 
                      : 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Lower is better</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">False Non-Match Rate</p>
                    <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {results.metrics.overall?.FNMR !== undefined 
                      ? (results.metrics.overall.FNMR * 100).toFixed(2) + '%' 
                      : 'N/A'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Lower is better</p>
                </div>
              </div>
            </div>

            {/* Group Metrics */}
            {results.metrics.by_group && (
              <div className="card p-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <div className="w-1 h-6 bg-success-500 rounded-full mr-3"></div>
                  Performance by Demographic Group
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Group</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Accuracy</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">FMR</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">FNMR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {Object.entries(results.metrics.by_group).map(([group, metrics]) => (
                        <tr key={group} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {group}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {(metrics.accuracy * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {(metrics.FMR * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {(metrics.FNMR * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Augmentation Metrics */}
            {results.metrics.by_augmentation && (
              <div className="card p-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <div className="w-1 h-6 bg-warning-500 rounded-full mr-3"></div>
                  Performance by Data Augmentation
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Augmentation</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Accuracy</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">FMR</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">FNMR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {Object.entries(results.metrics.by_augmentation).map(([augmentation, metrics]) => (
                        <tr key={augmentation} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {augmentation}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {(metrics.accuracy * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {(metrics.FMR * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {(metrics.FNMR * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visualizations */}
            {results.visualizations && Object.keys(results.visualizations).length > 0 && (
              <div className="card p-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <div className="w-1 h-6 bg-purple-500 rounded-full mr-3"></div>
                  Visual Analysis
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(results.visualizations).map(([name, dataUrl]) => {
                    const displayName = name
                      .replace(/_/g, ' ')
                      .replace(/\.(png|jpg|jpeg)$/i, '')
                      .replace(/\b\w/g, l => l.toUpperCase());
                    
                    return (
                      <div key={name} className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {displayName}
                          </h4>
                        </div>
                        <div className="p-6">
                          <img 
                            src={dataUrl} 
                            alt={displayName} 
                            className="w-full h-64 object-contain mx-auto rounded-lg"
                            onError={(e) => {
                              console.error(`Failed to load image: ${name}`, e);
                              e.target.alt = `Could not load visualization: ${name}`;
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {results && results.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-warning-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                  Evaluation Error
                </h3>
                <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
                  {results.message || 'An unknown error occurred during evaluation.'}
                </p>
                {results.traceback && (
                  <details className="mt-3">
                    <summary className="text-xs text-warning-600 dark:text-warning-400 cursor-pointer hover:text-warning-700 dark:hover:text-warning-300">
                      Show technical details
                    </summary>
                    <pre className="mt-2 p-3 bg-warning-100 dark:bg-warning-900/40 text-xs text-warning-800 dark:text-warning-200 rounded-lg overflow-auto max-h-40 font-mono">
                      {results.traceback}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FacialUploadPage;