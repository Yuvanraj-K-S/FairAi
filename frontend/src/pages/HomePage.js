import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to <span className="text-blue-600">FairAI</span>
        </h1>
        
        <p className="text-2xl text-gray-700 mb-8">
          Stopping biased AI at the gate.
        </p>
        
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
          <p className="text-lg text-gray-700 mb-6">
            FairAI is dedicated to identifying and eliminating bias in AI models, ensuring fair and 
            equitable outcomes for everyone. Our platform helps you analyze and improve your AI systems 
            to prevent discrimination and promote fairness.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/loan-approval" 
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 text-center"
            >
              Try Loan Approval Analysis
            </Link>
            <Link 
              to="/face-recognition" 
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200 text-center"
            >
              Try Face Recognition Analysis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
