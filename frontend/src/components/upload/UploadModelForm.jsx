import React, { useCallback } from 'react';

export default function UploadModelForm({ modelFile, setModelFile }) {
  const allowed = ['.pkl', '.joblib', '.onnx', '.pt', '.pth', '.h5'];

  const onChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    const fileExt = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(fileExt)) {
      alert(`Unsupported model format. Allowed formats: ${allowed.join(', ')}`);
      return;
    }
    
    if (f.size > 100 * 1024 * 1024) {
      alert('Model file too large. Maximum size is 100MB');
      return;
    }
    
    setModelFile(f);
  }, [setModelFile]);

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Model</h2>
      
      <div className="mb-4">
        <label 
          className={`flex flex-col items-center px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors duration-200 ${
            modelFile 
              ? 'border-green-300 bg-green-50' 
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <svg 
            className={`w-10 h-10 mb-2 ${modelFile ? 'text-green-500' : 'text-blue-500'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          
          <div className="text-center">
            <p className={`text-sm font-medium ${modelFile ? 'text-green-700' : 'text-blue-700'}`}>
              {modelFile ? 'Model Selected' : 'Choose a model file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {modelFile 
                ? modelFile.name
                : `Supported formats: ${allowed.join(', ')}`}
            </p>
            {modelFile && (
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(modelFile.size / 1024)} KB
              </p>
            )}
          </div>
          
          <input 
            type="file" 
            accept={allowed.join(',')}
            onChange={onChange} 
            className="hidden" 
          />
        </label>
      </div>
      
      <div className="text-xs text-gray-500">
        <p>Maximum file size: 100MB</p>
      </div>
      
      {modelFile && (
        <button
          type="button"
          onClick={() => setModelFile(null)}
          className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Remove File
        </button>
      )}
    </div>
  );
}
