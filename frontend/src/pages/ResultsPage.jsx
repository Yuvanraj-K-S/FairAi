import React from 'react';

function ResultsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Evaluation Results</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-gray-600">
          This is a placeholder for the evaluation results. After running an evaluation,
          this page would display the fairness metrics and analysis of your model.
        </p>
      </div>
    </div>
  );
}

export default ResultsPage;
