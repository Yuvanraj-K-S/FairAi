import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation, 
  Outlet,
  Link
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Auth from './components/Auth/Auth';
import HomePage from './pages/HomePage';
import LoanFormPage from './pages/LoanFormPage';
import FacialUploadPage from './pages/FacialRecognitionPage';
import LoanResultsPage from './pages/LoanResultsPage';
import FacialRecognitionResultsPage from './pages/FacialRecognitionResultsPage';
import UploadModelPage from './pages/UploadModelPage';
import { FiSun, FiMoon, FiLogOut } from 'react-icons/fi';
import './App.css';
import './Animations.css';

// ProtectedRoute component to handle authentication and redirection
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Add debug logging
  console.log('ProtectedRoute - currentUser:', currentUser);
  console.log('ProtectedRoute - loading:', loading);
  console.log('ProtectedRoute - location state:', location.state);

  // Show loading state while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login with the current location
  if (!currentUser) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated, render the protected content
  console.log('User authenticated, rendering protected content');
  return children;
};

// Simple MainLayout component if it doesn't exist
const MainLayout = ({ children }) => {
  return <div className="min-h-screen flex flex-col">{children}</div>;
};

function AppContent() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Successfully logged out');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            color: 'var(--gray-800)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            fontSize: '0.9375rem',
            lineHeight: '1.5',
            maxWidth: '400px',
            width: '100%',
          },
          success: {
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'white',
            },
            style: {
              borderLeft: '4px solid var(--success)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--error)',
              secondary: 'white',
            },
            style: {
              borderLeft: '4px solid var(--error)',
            },
          },
          loading: {
            iconTheme: {
              primary: 'var(--primary)',
              secondary: 'white',
            },
            style: {
              borderLeft: '4px solid var(--primary)',
            },
          },
          className: 'toast-message',
        }}
        containerStyle={{
          top: '1.5rem',
          right: '1.5rem',
        }}
      />
      
      <header className="app-header glass">
        <div className="container">
          <div className="flex items-center">
            <h1 className="app-title mr-8">FairAI</h1>
            
            {/* Navigation Links - Only show when user is logged in */}
            {currentUser && (
              <nav className="hidden md:flex space-x-6 mr-8">
                <Link 
                  to="/loan" 
                  className={`nav-link ${location.pathname === '/loan' ? 'text-primary-600 font-medium' : 'text-gray-700 hover:text-primary-600'}`}
                >
                  Loan Model
                </Link>
                <Link 
                  to="/facial-upload" 
                  className={`nav-link ${location.pathname === '/facial-upload' ? 'text-primary-600 font-medium' : 'text-gray-700 hover:text-primary-600'}`}
                >
                  Facial Recognition
                </Link>
              </nav>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <FiSun className="w-5 h-5 text-yellow-400" />
              ) : (
                <FiMoon className="w-5 h-5 text-gray-700" />
              )}
            </button>
            
            <nav className="main-nav">
              {currentUser ? (
                <button 
                  onClick={handleLogout} 
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiLogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              ) : (
                <div className="flex space-x-4">
                  <Link to="/login" className="nav-link hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors">
                    Login
                  </Link>
                  <Link 
                    to="/signup" 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="page-content"
              >
                <Auth />
              </motion.div>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="page-content"
              >
                <Auth isSignUp />
              </motion.div>
            } 
          />
          
          {/* Protected Routes */}
          <Route element={
            <ProtectedRoute>
              <MainLayout>
                <motion.div
                  key={location.pathname}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={{
                    initial: { opacity: 0, y: 20 },
                    animate: { 
                      opacity: 1, 
                      y: 0,
                      transition: { 
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1],
                        staggerChildren: 0.1
                      } 
                    },
                    exit: { 
                      opacity: 0, 
                      y: -20,
                      transition: { 
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1]
                      } 
                    }
                  }}
                  className="page-content"
                >
                  <Outlet />
                </motion.div>
              </MainLayout>
            </ProtectedRoute>
          }>
            <Route index element={<HomePage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/loan" element={<LoanFormPage />} />
            <Route path="/facial-upload" element={<FacialUploadPage />} />
            <Route path="/results/loan" element={<LoanResultsPage />} />
            <Route path="/results/facial-recognition" element={<FacialRecognitionResultsPage />} />
            <Route path="/upload-model" element={<UploadModelPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;