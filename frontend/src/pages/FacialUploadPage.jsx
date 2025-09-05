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
        <div className="max-w-5xl mx-auto">
          {errorMsg && (
            <div className="bg-red-100 text-red-800 border border-red-200 p-4 rounded mb-4">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {results && results.status === 'success' && (
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-3">Evaluation Results</h2>

              <div className="mb-4">
                <h3 className="font-medium">Overall Metrics</h3>
                <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded shadow-sm">{JSON.stringify(results.metrics.overall ?? results.metrics, null, 2)}</pre>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">By Group</h3>
                <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded shadow-sm">{JSON.stringify(results.metrics.by_group, null, 2)}</pre>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">By Augmentation</h3>
                <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded shadow-sm">{JSON.stringify(results.metrics.by_augmentation, null, 2)}</pre>
              </div>

              {results.visualizations && Object.keys(results.visualizations).length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Visualizations</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(results.visualizations).map(([name, dataUrl]) => (
                      <div key={name} className="border rounded p-2 bg-white">
                        <img src={dataUrl} alt={name} className="w-full h-40 object-contain" />
                        <div className="text-xs mt-1 text-gray-600">{name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {results && results.status === 'error' && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mt-4">
              <strong>Evaluation error:</strong> {results.message || 'Unknown error'}
              {results.traceback && <pre className="text-xs mt-2">{results.traceback}</pre>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FacialUploadPage;