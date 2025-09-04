import React, { useCallback } from 'react';
import Papa from 'papaparse';

export default function UploadDatasetForm({ csvFile, setCsvFile, setHeaders, setPreviewRows }) {
  const onChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    if (!f.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }
    
    setCsvFile(f);

    // Parse first N rows for preview + headers
    Papa.parse(f, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];
        const headers = results.meta.fields || (rows[0] ? Object.keys(rows[0]) : []);
        setHeaders(headers);
        setPreviewRows(rows);
      },
      error: (err) => {
        console.error('CSV parse error', err);
        alert('Failed to parse CSV: ' + err.message);
      }
    });
  }, []);

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Dataset</h2>
      <div className="mb-4">
        <label 
          className="flex flex-col items-center px-4 py-6 bg-white text-blue-500 rounded-lg tracking-wide uppercase border border-blue-500 cursor-pointer hover:bg-blue-50 transition-colors duration-200"
        >
          <svg className="w-8 h-8 mb-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
          </svg>
          <span className="text-sm">Choose a CSV file</span>
          <input 
            type="file" 
            accept=".csv" 
            onChange={onChange} 
            className="hidden"
          />
        </label>
      </div>
      
      {csvFile && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            <span className="font-medium">Selected:</span> {csvFile.name}
            <span className="block text-xs text-green-600 mt-1">
              {Math.round(csvFile.size / 1024)} KB
            </span>
          </p>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        <p>Supported format: .csv</p>
      </div>
    </div>
  );
}
