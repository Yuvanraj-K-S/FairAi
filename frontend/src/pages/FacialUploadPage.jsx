import React, { useState, useCallback } from 'react';
import { FaUpload, FaFileAlt, FaSpinner } from 'react-icons/fa';

const API_URL = 'http://localhost:5000/api/face/evaluate'; // adjust if needed

const FacialUploadPage = () => {
  const [modelFile, setModelFile] = useState(null);
  const [configFile, setConfigFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null); // optional now
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
    <div className="min-h-screen bg-white text-gray-800">
      <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Facial Recognition Model Upload</h1>
          <p className="text-sm text-gray-600">Upload a model (custom) or run tests using the server dataset + default model.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model */}
            <div>
              <label className="block text-sm font-medium mb-2">Model File (optional for default flow)</label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={(e) => handleDragOver(e)}
                onDragLeave={(e) => handleDragLeave(e)}
                onDrop={(e) => handleDrop(e)}
              >
                <FaFileAlt className="mx-auto h-10 w-10 text-blue-400 mb-3" />
                <div className="text-sm">
                  {modelFile ? <p className="text-blue-600 font-medium">{modelFile.name}</p> : <p>Drag & drop a model file or click to choose (.pt, .onnx, .h5)</p>}
                </div>
                <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  <FaUpload className="mr-2 h-4 w-4" />
                  Choose File
                  <input type="file" className="hidden" accept=".pt,.pth,.onnx,.h5,.pb,.pkl" onChange={(e) => handleFileChange(e)} />
                </label>
              </div>
            </div>

            {/* Optional Config */}
            <div>
              <label className="block text-sm font-medium mb-2">Config File (optional)</label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  isConfigDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={(e) => handleDragOver(e, true)}
                onDragLeave={(e) => handleDragLeave(e, true)}
                onDrop={(e) => handleDrop(e, true)}
              >
                <input type="file" className="hidden" accept=".json,.yaml,.yml" onChange={(e) => handleFileChange(e, true)} />
                {configFile ? <p className="text-sm text-blue-600">{configFile.name}</p> : <p className="text-sm text-gray-500">Optional JSON/YAML config</p>}
              </div>
            </div>

            {/* Optional dataset (you said dataset is on server, but keep optional override) */}
            <div>
              <label className="block text-sm font-medium mb-2">Dataset ZIP (optional — server dataset used if not provided)</label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  isDatasetDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={(e) => handleDragOver(e, false, true)}
                onDragLeave={(e) => handleDragLeave(e, false, true)}
                onDrop={(e) => handleDrop(e, false, true)}
              >
                <input type="file" className="hidden" accept=".zip" onChange={(e) => handleFileChange(e, false, true)} />
                {datasetFile ? <p className="text-sm text-blue-600">{datasetFile.name}</p> : <p className="text-sm text-gray-500">Optional .zip (server dataset used by default)</p>}
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isUploading || (!modelFile)}
                className={`w-full py-3 rounded-md text-white font-medium ${isUploading || !modelFile ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isUploading ? (<><FaSpinner className="animate-spin mr-2 inline-block" /> Running Custom Model...</>) : 'Upload & Continue (Custom Model)'}
              </button>

              <button
                type="button"
                onClick={handleDefaultModel}
                className={`w-full py-3 rounded-md text-white font-medium ${usingDefault ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                disabled={usingDefault}
              >
                {usingDefault ? (<><FaSpinner className="animate-spin mr-2 inline-block" /> Running Default Model...</>) : 'Continue with Default Model (server dataset)'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="max-w-5xl mx-auto space-y-8">
          {errorMsg && (
            <div className="bg-red-100 text-red-800 border border-red-200 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <strong>Error:</strong>
              </div>
              <p className="mt-1 text-sm">{errorMsg}</p>
            </div>
          )}

          {results && results.status === 'success' && (
            <div className="space-y-8">
              {/* Status Card */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <div className="flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Face Recognition Evaluation Complete
                    </h2>
                    <p className="mt-1 text-gray-600">
                      Your face recognition model has been evaluated successfully. Review the detailed metrics below.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                    EVALUATION COMPLETE
                  </div>
                </div>
              </div>

              {/* Overall Metrics */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
                  <span className="border-b-2 border-blue-500 pb-2">Overall Performance</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">Accuracy</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {results.metrics.overall?.accuracy !== undefined 
                        ? (results.metrics.overall.accuracy * 100).toFixed(2) + '%' 
                        : 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Overall model accuracy</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">False Match Rate</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {results.metrics.overall?.FMR !== undefined 
                        ? (results.metrics.overall.FMR * 100).toFixed(2) + '%' 
                        : 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Lower is better</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">False Non-Match Rate</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {results.metrics.overall?.FNMR !== undefined 
                        ? (results.metrics.overall.FNMR * 100).toFixed(2) + '%' 
                        : 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Lower is better</p>
                  </div>
                </div>
              </div>

              {/* Group Metrics */}
              {results.metrics.by_group && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
                    <span className="border-b-2 border-blue-500 pb-2">Performance by Group</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FMR</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FNMR</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(results.metrics.by_group).map(([group, metrics]) => (
                          <tr key={group}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {group}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(metrics.accuracy * 100).toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(metrics.FMR * 100).toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
                    <span className="border-b-2 border-blue-500 pb-2">Performance by Augmentation</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Augmentation</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FMR</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FNMR</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(results.metrics.by_augmentation).map(([augmentation, metrics]) => (
                          <tr key={augmentation}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                              {augmentation}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(metrics.accuracy * 100).toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(metrics.FMR * 100).toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
                    <span className="border-b-2 border-blue-500 pb-2">Visualizations</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {Object.entries(results.visualizations).map(([name, dataUrl]) => {
                      const displayName = name
                        .replace(/_/g, ' ')
                        .replace(/\.(png|jpg|jpeg)$/i, '')
                        .replace(/\b\w/g, l => l.toUpperCase());
                      
                      return (
                        <div key={name} className="border rounded-lg overflow-hidden shadow-sm">
                          <div className="p-3 bg-gray-50 border-b">
                            <h4 className="text-sm font-medium text-gray-700">
                              {displayName}
                            </h4>
                          </div>
                          <div className="p-4">
                            <img 
                              src={dataUrl} 
                              alt={displayName} 
                              className="w-full h-64 object-contain mx-auto"
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
            </div>
          )}

          {results && results.status === 'error' && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <strong>Evaluation Error</strong>
              </div>
              <p className="mt-1 text-sm">{results.message || 'An unknown error occurred during evaluation.'}</p>
              {results.traceback && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">Show details</summary>
                  <pre className="mt-1 p-2 bg-gray-100 text-xs text-gray-700 rounded overflow-auto max-h-40">
                    {results.traceback}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FacialUploadPage;