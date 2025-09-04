import React, { useState, useEffect } from 'react';

export default function RunEvaluationButton({ modelFile, csvFile, paramsJson }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let interval;
    if (running) {
      interval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.floor(Math.random() * 8) + 3; // 3-10% increment
          const newProgress = Math.min(prev + increment, 100);
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setRunning(false);
              setIsComplete(true);
              setTimeout(() => setIsComplete(false), 3000); // Hide success message after 3s
            }, 500);
          }
          return newProgress;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [running]);

  const validateInputs = () => {
    if (!modelFile) {
      setError('Please upload a model file first');
      return false;
    }
    if (!csvFile) {
      setError('Please upload a dataset first');
      return false;
    }
    if (!paramsJson?.features?.length) {
      setError('Please select at least one feature');
      return false;
    }
    if (!paramsJson?.label) {
      setError('Please select a target variable');
      return false;
    }
    setError('');
    return true;
  };

  const startEvaluation = () => {
    if (!validateInputs()) return;
    
    setRunning(true);
    setProgress(0);
    setIsComplete(false);
  };

  const getButtonState = () => {
    if (isComplete) return 'complete';
    if (running) return 'running';
    return 'idle';
  };

  const buttonState = getButtonState();
  const buttonConfig = {
    idle: {
      text: 'Run Fairness Evaluation',
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      className: 'bg-blue-600 hover:bg-blue-700',
    },
    running: {
      text: 'Evaluating...',
      icon: (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ),
      className: 'bg-blue-600 cursor-not-allowed',
    },
    complete: {
      text: 'Evaluation Complete!',
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      className: 'bg-green-600 hover:bg-green-700',
    },
  };

  return (
    <div className="w-full">
      <div className="relative">
        <button
          onClick={startEvaluation}
          disabled={running || isComplete}
          className={`w-full flex items-center justify-center py-3 px-6 rounded-lg text-white font-medium transition-colors duration-200 ${buttonConfig[buttonState].className} ${isComplete ? 'animate-pulse' : ''}`}
        >
          <div className="flex items-center">
            {buttonConfig[buttonState].icon}
            {buttonConfig[buttonState].text}
          </div>
        </button>
        
        {(running || isComplete) && (
          <div className="absolute -bottom-6 right-0 text-xs text-gray-500">
            {progress}% complete
          </div>
        )}
      </div>
      
      {(running || isComplete) && (
        <div className="mt-4 bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundColor: isComplete ? '#10B981' : '#3B82F6' // Green when complete, blue when running
            }}
          />
        </div>
      )}
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {isComplete && (
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Evaluation complete! View results on the dashboard.
              </p>
              <p className="mt-1 text-sm text-green-700">
                This is a frontend-only simulation. In a real app, this would show actual evaluation results.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
