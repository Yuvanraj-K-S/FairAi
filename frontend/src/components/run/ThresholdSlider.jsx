import React from 'react';

export default function ThresholdSlider({ value = 0.5, setValue }) {
  const getGradient = (val) => {
    const percentage = val * 100;
    return `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-800">Decision Threshold</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
          {Math.round(value * 100)}%
        </span>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Adjust the threshold for model predictions. A higher threshold makes the model more conservative.
      </p>
      
      <div className="relative pt-6">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          style={{
            background: getGradient(value),
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        />
        
        <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Current Threshold</p>
          <p className="text-2xl font-bold text-blue-600">{value.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">Prediction</p>
          <p className="text-2xl font-bold text-gray-800">
            {value >= 0.5 ? 'Positive' : 'Negative'}
          </p>
        </div>
      </div>
    </div>
  );
}
