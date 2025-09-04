import React from 'react';

export default function FeaturesSelector({ headers = [], selectedFeatures = [], setSelectedFeatures }) {
  const toggle = (col) => {
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter((c) => c !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  if (headers.length === 0) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Feature Selection</h3>
        <p className="text-sm text-gray-500">Upload a dataset to select features</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">Feature Selection</h3>
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {selectedFeatures.length} selected
        </span>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Select the columns to use as features for model evaluation
      </p>
      
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {headers.map((h) => (
          <label 
            key={h} 
            className={`flex items-center p-3 rounded-lg border transition-colors duration-200 cursor-pointer ${
              selectedFeatures.includes(h) 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
            }`}
          >
            <div className="flex items-center h-5">
              <input 
                type="checkbox" 
                checked={selectedFeatures.includes(h)} 
                onChange={() => toggle(h)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">{h}</span>
          </label>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>Select at least one feature column</p>
      </div>
    </div>
  );
}

export function LabelDropdown({ headers = [], label, setLabel }) {
  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-medium text-gray-800 mb-2">Target Variable</h3>
      <p className="text-sm text-gray-500 mb-4">
        Select the column to use as the target variable (what you want to predict)
      </p>
      
      <div className="relative">
        <select 
          value={label || ''}
          onChange={(e) => setLabel(e.target.value)}
          className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
        >
          <option value="">Select a target variable</option>
          {headers.map((h) => (
            <option 
              key={h} 
              value={h}
              className="text-gray-900"
            >
              {h}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {label && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Selected:</span> {label}
          </p>
        </div>
      )}
    </div>
  );
}
