import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} FairAI - AI Fairness Evaluation Tool
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
