import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import UploadModelPage from './pages/UploadModelPage';
import LoanFormPage from './pages/LoanFormPage';
import ResultsPage from './pages/ResultsPage.jsx';
import FacialUploadPage from './pages/FacialUploadPage';
import MainLayout from './components/layout/MainLayout';
import Auth from './components/Auth/Auth';
import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function AppContent() {
  return (
    <div className="min-h-screen bg-white">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '0.5rem',
            padding: '1rem',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth isSignUp />} />
          
          {/* Protected Routes */}
          <Route element={
            <ProtectedRoute>
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }>
            <Route index element={<HomePage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/loan" element={<LoanFormPage />} />
            <Route path="/facial-upload" element={<FacialUploadPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;