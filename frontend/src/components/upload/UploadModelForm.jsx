import React, { useCallback, useState, useRef, useEffect } from 'react';

export default function UploadModelForm({ modelFile, setModelFile, logs = [] }) {
  const allowed = ['.pkl', '.joblib', '.onnx', '.pt', '.pth', '.h5'];
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(fileExt)) {
      console.error(`Unsupported model format. Allowed formats: ${allowed.join(', ')}`);
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      console.error('Model file too large. Maximum size is 100MB');
      return;
    }
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setModelFile(file);
      }
      setUploadProgress(progress);
    }, 200);
    
    return () => clearInterval(interval);
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
    handleFile(file);
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
    <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h1 className="text-gray-800 text-3xl font-bold leading-tight mb-2">
          Upload Model
        </h1>
        <p className="text-gray-500 text-base">
          Upload your financial model to get started.
        </p>
      </div>

      <div 
        ref={dropAreaRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-6 rounded-lg border-2 border-dashed ${
          isDragging ? 'border-blue-500' : 'border-gray-300 hover:border-blue-400'
        } px-6 py-16 text-center transition-colors`}
      >
        <div className="flex flex-col items-center gap-2">
          <svg 
            className="text-gray-400" 
            fill="none" 
            height="48" 
            stroke="currentColor" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="1.5" 
            viewBox="0 0 24 24" 
            width="48"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" x2="12" y1="3" y2="15"></line>
          </svg>
          <p className="text-gray-800 text-lg font-semibold">
            {modelFile ? 'File Selected' : 'Drag and drop your file here'}
          </p>
          {!modelFile && <p className="text-gray-500 text-sm">or</p>}
        </div>

        {modelFile ? (
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{modelFile.name}</span>
              <span className="text-sm text-gray-500">
                {Math.round(modelFile.size / 1024)} KB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Remove File
            </button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <div className="flex items-center justify-center rounded-lg h-10 px-5 bg-blue-600 text-white text-sm font-bold tracking-wide shadow-sm hover:bg-blue-700 transition-colors">
              <span>Browse Files</span>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept={allowed.join(',')}
              onChange={handleChange} 
              className="sr-only" 
            />
          </label>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs text-gray-500 text-center">
          Supported file types: {allowed.join(', ').replace(/\./g, '')}
        </p>
      </div>

      {/* Logs Section */}
      {logs.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Upload Logs</h3>
          <div 
            ref={logContentRef}
            className="bg-gray-50 p-3 rounded-md font-mono text-xs text-gray-700 max-h-40 overflow-y-auto"
          >
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`py-1 ${log.type === 'error' ? 'text-red-600' : 'text-gray-700'}`}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
