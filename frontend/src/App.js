import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import UploadModelPage from './pages/UploadModelPage';
import LoanFormPage from './pages/LoanFormPage';
import ResultsPage from './pages/ResultsPage';
import FacialUploadPage from './pages/FacialUploadPage';
import MainLayout from './components/layout/MainLayout';
import './App.css';

function App() {
  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
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
        
        <MainLayout>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<UploadModelPage />} />
              <Route path="/loan" element={<LoanFormPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/facial-upload" element={<FacialUploadPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </MainLayout>
      </div>
    </Router>
  );
}

export default App;