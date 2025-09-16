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
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Evaluation Results</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          assessment === 'PASS' || assessment === 'pass'
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {assessment}
        </span>
      </div>

      {/* Overall Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Records" 
            value={totalRecords}
            description="Total number of records evaluated"
          />
          <MetricCard 
            title="Approval Rate" 
            value={formattedApprovalRate}
            description="Overall loan approval rate"
          />
          <MetricCard 
            title="Accuracy" 
            value={formattedAccuracy}
            description="Model prediction accuracy"
          />
        </div>
      </div>

      {/* Group Analysis section removed as it's not in the current API response */}

      {/* Fairness Metrics */}
      {fairness_metrics && Object.keys(fairness_metrics).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fairness Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard 
              title="Demographic Parity Difference" 
              value={formatMetric(fairness_metrics.demographic_parity_difference)}
              description="Difference in approval rates between groups"
            />
            <MetricCard 
              title="Equal Opportunity Difference" 
              value={formatMetric(fairness_metrics.equal_opportunity_difference)}
              description="Difference in true positive rates between groups"
            />
            <MetricCard 
              title="Disparate Impact" 
              value={formatMetric(fairness_metrics.disparate_impact)}
              description="Ratio of approval rates between groups (closer to 1 is fairer)"
            />
          </div>
        </div>
      )}

      {/* Visualizations */}
      {visualizations && Object.keys(visualizations).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Visualizations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(visualizations).map(([title, imageData]) => {
              // Check if the image data is already a data URL
              const isDataUrl = typeof imageData === 'string' && 
                (imageData.startsWith('data:image/') || 
                 imageData.startsWith('data:application/octet-stream'));
              
              // If it's already a data URL, use it directly
              // Otherwise, assume it's a base64 string and format it as a data URL
              const imageSrc = isDataUrl ? imageData : `data:image/png;base64,${imageData}`;
              
              return (
                <div key={title} className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b">
                    <h4 className="text-sm font-medium text-gray-700 capitalize">
                      {title.replace(/_/g, ' ').replace(/\.png$/, '')}
                    </h4>
                  </div>
                  <div className="p-2">
                    <img 
                      src={imageSrc}
                      alt={title}
                      className="w-full h-auto"
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          <ul className="space-y-3">
            {recommendations.filter(rec => rec && !rec.startsWith('===') && !rec.startsWith('RECOMMENDATIONS')).map((rec, index) => (
              <li key={index} className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
