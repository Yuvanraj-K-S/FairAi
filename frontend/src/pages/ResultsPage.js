import React, { useEffect, useState } from 'react';
import { FiCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

export default function ResultsPage() {
  const location = useLocation();
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get evaluation data from navigation state
    if (location.state?.evaluationData) {
      setEvaluationData(location.state.evaluationData);
      setLoading(false);
    } else {
      setError('No evaluation data found. Please run an evaluation first.');
      setLoading(false);
    }
  }, [location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <FiAlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/facial-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Evaluation
          </a>
        </div>
      </div>
    );
  }

  // Log the evaluation data for debugging
  console.log("Evaluation Data in ResultsPage:", evaluationData);

  // Extract metrics from evaluation data with proper fallbacks
  const metrics = evaluationData.metrics || {};
  const recommendations = evaluationData.recommendations || [];
  const visualizations = evaluationData.visualizations || {};
  const used_augmentations = evaluationData.used_augmentations || [];
  const model_used = evaluationData.model_used || 'unknown';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter text-gray-900 sm:text-5xl">
              Facial Recognition Evaluation Results
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Analysis of your {model_used === 'default' ? 'default' : 'custom'} model's performance
            </p>
          </div>

          {/* Summary Card */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluation Summary</h2>
              
              {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Overall Accuracy */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Overall Accuracy</h3>
                    <p className="mt-1 text-3xl font-semibold text-gray-900">
                      {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
                    </p>
                  </div>

                  {/* Bias Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Bias Score</h3>
                    <p className="mt-1 text-3xl font-semibold text-gray-900">
                      {metrics.bias !== undefined ? metrics.bias.toFixed(4) : 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Lower is better (0 = no bias)
                    </p>
                  </div>

                  {/* Augmentations Used */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Augmentations Tested</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {used_augmentations.length > 0 
                        ? used_augmentations.join(', ')
                        : 'No augmentations'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visualizations */}
          {Object.keys(visualizations).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Visualizations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(visualizations).map(([title, imageData], index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                      {title.replace(/_/g, ' ')}
                    </h3>
                    <div className="flex justify-center">
                      <img 
                        src={imageData} 
                        alt={title} 
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Metrics - By Group */}
          {metrics && metrics.detailed_metrics && metrics.detailed_metrics.by_group && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance by Group</h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="border-t border-gray-200">
                  <dl>
                    {Object.entries(metrics.detailed_metrics.by_group).map(([group, groupMetrics]) => {
                      // Handle the case where groupMetrics might be an object with the metrics
                      const metrics = groupMetrics && typeof groupMetrics === 'object' ? groupMetrics : {};
                      return (
                        <div key={group} className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">{group}</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="font-medium">Accuracy: </span>
                                {metrics.accuracy !== undefined ? `${(metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">FMR: </span>
                                {metrics.FMR !== undefined ? metrics.FMR.toFixed(4) : '0.0000'}
                              </div>
                              <div>
                                <span className="font-medium">FNMR: </span>
                                {metrics.FNMR !== undefined ? metrics.FNMR.toFixed(4) : '0.0000'}
                              </div>
                            </div>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* By Augmentation */}
          {metrics && metrics.detailed_metrics && metrics.detailed_metrics.by_augmentation && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance by Augmentation</h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="border-t border-gray-200">
                  <dl>
                    {Object.entries(metrics.detailed_metrics.by_augmentation).map(([aug, augMetrics]) => {
                      // Handle the case where augMetrics might be an object with the metrics
                      const metrics = augMetrics && typeof augMetrics === 'object' ? augMetrics : {};
                      return (
                        <div key={aug} className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-gray-500">{aug}</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="font-medium">Accuracy: </span>
                                {metrics.accuracy !== undefined ? `${(metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">FMR: </span>
                                {metrics.FMR !== undefined ? metrics.FMR.toFixed(4) : '0.0000'}
                              </div>
                              <div>
                                <span className="font-medium">FNMR: </span>
                                {metrics.FNMR !== undefined ? metrics.FNMR.toFixed(4) : '0.0000'}
                              </div>
                            </div>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {recommendations.map((recommendation, index) => (
                    <li key={index} className="px-4 py-4 sm:px-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                          <FiInfo className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-700">{recommendation}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/facial-upload"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Run Another Evaluation
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Print Results
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
