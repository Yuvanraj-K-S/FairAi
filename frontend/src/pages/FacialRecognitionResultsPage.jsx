import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function FacialRecognitionResultsPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.evaluationData) {
      setResults(location.state.evaluationData);
      setLoading(false);
    } else {
      setError('No evaluation results found. Please run an evaluation first.');
      setLoading(false);
    }
  }, [location.state]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => navigate('/facial-upload')}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Back to Facial Recognition
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { 
    metrics = {},
    visualizations = {},
    status = 'N/A',
    bias_analysis = {},
    performance_metrics = {}
  } = results;

  const formatMetric = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return value.toFixed(4);
    return value;
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return `${(value * 100).toFixed(2)}%`;
    return value;
  };

  const assessment = status === 'success' ? 'PASS' : 'NEEDS REVIEW';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
            Facial Recognition Model Analysis
          </h1>
          <p className="text-gray-600">
            Detailed evaluation of your facial recognition model's performance and fairness
          </p>
        </div>

        {/* Status Card */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-6 p-6 md:flex-row">
            <div className="flex-shrink-0">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                assessment === 'PASS' || assessment === 'pass' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {assessment === 'PASS' || assessment === 'pass' ? (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold text-gray-900">
                {assessment === 'PASS' || assessment === 'pass' 
                  ? 'Model Evaluation Complete' 
                  : 'Model Review Recommended'}
              </h2>
              <p className="mt-1 text-gray-600">
                {assessment === 'PASS' || assessment === 'pass'
                  ? 'Your facial recognition model has been evaluated successfully. Review the detailed metrics below.'
                  : 'Your model may have potential biases that require further review.'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              assessment === 'PASS' || assessment === 'pass' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {assessment === 'PASS' || assessment === 'pass' ? 'PASSED' : 'REVIEW NEEDED'}
            </div>
          </div>
        </div>

        {/* Overall Performance Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
            <span className="border-b-2 border-purple-500 pb-2">Model Performance</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatPercentage(metrics.accuracy || performance_metrics.accuracy)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Overall prediction accuracy</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Precision</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {metrics.detailed_metrics?.overall?.FMR !== undefined 
                  ? formatPercentage(1 - metrics.detailed_metrics.overall.FMR) 
                  : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-gray-500">True positives / (True positives + False positives)</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">True Positive Rate</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatPercentage(1 - (metrics.detailed_metrics?.overall?.FNMR || 0))}
              </p>
              <p className="mt-1 text-xs text-gray-500">True positives / (True positives + False negatives)</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatPercentage(metrics.accuracy || metrics.detailed_metrics?.overall?.accuracy || 0)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Correct predictions / Total predictions</p>
            </div>
          </div>
        </div>

        {/* Bias Analysis */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
            <span className="border-b-2 border-purple-500 pb-2">Bias Analysis</span>
          </h3>
          
          {metrics?.bias !== undefined || (metrics?.detailed_metrics?.by_group && Object.keys(metrics.detailed_metrics.by_group).length > 0) ? (
            <div className="space-y-6">
              {/* Overall Bias Score */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Overall Bias</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <p className="text-xs font-medium text-gray-500">Bias Score</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {metrics.bias !== undefined ? metrics.bias.toFixed(4) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {metrics.bias === 0 ? 'No bias detected' : 'Potential bias detected'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Group-wise Metrics */}
              {metrics?.detailed_metrics?.by_group && Object.keys(metrics.detailed_metrics.by_group).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Performance by Group</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Group
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Accuracy
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            FMR
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            FNMR
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(metrics.detailed_metrics.by_group).map(([group, groupMetrics]) => (
                          <tr key={group}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {group}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {groupMetrics.accuracy ? (groupMetrics.accuracy * 100).toFixed(2) + '%' : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {groupMetrics.FMR !== undefined ? groupMetrics.FMR.toFixed(4) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {groupMetrics.FNMR !== undefined ? groupMetrics.FNMR.toFixed(4) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bias analysis available</h3>
              <p className="mt-1 text-sm text-gray-500">The model evaluation did not include bias analysis for demographic attributes.</p>
            </div>
          )}
        </div>

        {/* Confusion Matrix */}
        {visualizations?.confusion_matrix && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
              <span className="border-b-2 border-purple-500 pb-2">Confusion Matrix</span>
            </h3>
            <div className="flex justify-center">
              <img 
                src={`data:image/png;base64,${visualizations.confusion_matrix}`}
                alt="Confusion Matrix"
                className="max-w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  console.error('Failed to load confusion matrix', e);
                  e.target.alt = 'Could not load confusion matrix';
                }}
              />
            </div>
          </div>
        )}

        {/* ROC Curve */}
        {visualizations?.roc_curve && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
              <span className="border-b-2 border-purple-500 pb-2">ROC Curve</span>
            </h3>
            <div className="flex justify-center">
              <img 
                src={`data:image/png;base64,${visualizations.roc_curve}`}
                alt="ROC Curve"
                className="max-w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  console.error('Failed to load ROC curve', e);
                  e.target.alt = 'Could not load ROC curve';
                }}
              />
            </div>
          </div>
        )}

        {/* Additional Visualizations */}
        {visualizations && Object.keys(visualizations).filter(key => 
          !['confusion_matrix', 'roc_curve'].includes(key)
        ).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
              <span className="border-b-2 border-purple-500 pb-2">Additional Visualizations</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(visualizations).map(([key, imageData]) => {
                if (['confusion_matrix', 'roc_curve'].includes(key)) return null;
                
                const displayName = key
                  .replace(/_/g, ' ')
                  .replace(/\.(png|jpg|jpeg|svg)$/i, '')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                return (
                  <div key={key} className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="p-3 bg-gray-50 border-b">
                      <h4 className="text-sm font-medium text-gray-700">
                        {displayName}
                      </h4>
                    </div>
                    <div className="p-3">
                      <img 
                        src={`data:image/png;base64,${imageData}`}
                        alt={displayName}
                        className="w-full h-auto max-h-80 object-contain mx-auto"
                        onError={(e) => {
                          console.error(`Failed to load visualization: ${key}`, e);
                          e.target.alt = `Could not load: ${key}`;
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => navigate('/facial-upload')}
            className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Back to Upload
          </button>
          <div className="space-x-3">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Print Report
            </button>
            <button
              onClick={() => {
                // In a real app, this would download a PDF or comprehensive report
                alert('Export functionality would be implemented here');
              }}
              className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Export Full Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacialRecognitionResultsPage;
