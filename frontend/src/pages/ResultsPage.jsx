import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ResultsPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Get results from location state or fetch from API if needed
        if (location.state?.evaluationResults) {
          setResults(location.state.evaluationResults);
        } else {
          // If results aren't in location state, you might want to fetch them
          // const response = await fetch('/api/loan/results');
          // const data = await response.json();
          // setResults(data);
          throw new Error('No evaluation results found. Please run an evaluation first.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [location.state]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">No evaluation results found. Please run an evaluation first.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Log the results to debug
  console.log('Results data:', results);
  
  // Destructure with defaults to prevent errors if properties are missing
  const { 
    metrics: {
      overall = {},
      fairness_metrics = {}
    } = {},
    recommendations = [],
    visualizations = {},
    status = 'N/A'
  } = results;
  
  // Format metrics for display
  const formatMetric = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return value.toFixed(4);
    return value;
  };
  
  // Get values from the nested metrics.overall object
  const totalRecords = overall?.total_records || 'N/A';
  const approvalRate = overall?.approval_rate;
  const accuracy = overall?.accuracy;
  
  // Format the values for display
  const formattedApprovalRate = approvalRate !== undefined 
    ? `${(approvalRate * 100).toFixed(2)}%` 
    : 'N/A';
    
  const formattedAccuracy = accuracy !== undefined 
    ? formatMetric(accuracy)
    : 'N/A';
    
  // Set assessment based on status
  const assessment = status === 'success' ? 'PASS' : 'FAIL';

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
            Model Evaluation Results
          </h1>
          <p className="text-gray-600">
            Detailed analysis of your loan approval model's performance
          </p>
        </div>

        {/* Status Card */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-6 p-6 md:flex-row">
            <div className="flex-shrink-0">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                assessment === 'PASS' || assessment === 'pass' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {assessment === 'PASS' || assessment === 'pass' ? (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold text-gray-900">
                {assessment === 'PASS' || assessment === 'pass' 
                  ? 'Model Evaluation Complete' 
                  : 'Model Evaluation Issues Found'}
              </h2>
              <p className="mt-1 text-gray-600">
                {assessment === 'PASS' || assessment === 'pass'
                  ? 'Your model has been evaluated successfully. Review the detailed metrics below.'
                  : 'There are some issues with your model that need attention.'}
              </p>
            </div>
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
              {assessment === 'PASS' || assessment === 'pass' ? 'PASSED' : 'ISSUES FOUND'}
            </div>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
            <span className="border-b-2 border-blue-500 pb-2">Model Performance</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Total Records</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totalRecords}</p>
              <p className="mt-1 text-xs text-gray-500">Total number of records evaluated</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Approval Rate</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formattedApprovalRate}</p>
              <p className="mt-1 text-xs text-gray-500">Overall loan approval rate</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formattedAccuracy}</p>
              <p className="mt-1 text-xs text-gray-500">Model prediction accuracy</p>
            </div>
          </div>
        </div>

        {/* Fairness Metrics */}
        {fairness_metrics && Object.keys(fairness_metrics).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
              <span className="border-b-2 border-blue-500 pb-2">Fairness Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Demographic Parity</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatMetric(fairness_metrics.demographic_parity_difference)}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Difference in approval rates between groups</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600 mr-3">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Equal Opportunity</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatMetric(fairness_metrics.equal_opportunity_difference)}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Difference in true positive rates between groups</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="p-2 rounded-full bg-green-100 text-green-600 mr-3">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Disparate Impact</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatMetric(fairness_metrics.disparate_impact)}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Ratio of approval rates between groups</p>
              </div>
            </div>
          </div>
        )}

        {/* Visualizations */}
        {visualizations && Object.keys(visualizations).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
              <span className="border-b-2 border-blue-500 pb-2">Performance Visualizations</span>
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(visualizations).map(([title, imageData]) => {
                const isDataUrl = typeof imageData === 'string' && 
                  (imageData.startsWith('data:image/') || 
                   imageData.startsWith('data:application/octet-stream'));
                
                const imageSrc = isDataUrl ? imageData : `data:image/png;base64,${imageData}`;
                const displayTitle = title
                  .replace(/_/g, ' ')
                  .replace(/\.png$/, '')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                return (
                  <div key={title} className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="p-4 bg-gray-50 border-b">
                      <h4 className="text-base font-medium text-gray-700">
                        {displayTitle}
                      </h4>
                    </div>
                    <div className="p-4">
                      <img 
                        src={imageSrc}
                        alt={displayTitle}
                        className="w-full h-auto max-h-96 object-contain mx-auto"
                        onError={(e) => {
                          console.error(`Failed to load image: ${title}`, e);
                          e.target.alt = `Could not load visualization: ${title}`;
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
              <span className="border-b-2 border-blue-500 pb-2">Recommendations</span>
            </h3>
            <ul className="space-y-4">
              {recommendations
                .filter(rec => rec && !rec.startsWith('===') && !rec.startsWith('RECOMMENDATIONS'))
                .map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex-1 border border-gray-200">
                      <p className="text-sm text-gray-700">{rec}</p>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for metric cards
function MetricCard({ title, value, description }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default ResultsPage;
