import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import UploadModelPage from './pages/UploadModelPage';
import LoanFormPage from './pages/LoanFormPage';
import ResultsPage from './pages/ResultsPage';
import Auth from './components/Auth/Auth';
import './App.css';

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  );
}

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    // Redirect to /login and remember the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Navigation component
const Navigation = () => {
  const { user, logout } = useAuth();
  
  return (
    <nav className="main-nav">
      <NavLink to="/">Upload Model</NavLink>
      <NavLink to="/loan">Loan Form</NavLink>
      <NavLink to="/results">Results</NavLink>
      {user ? (
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      ) : (
        <NavLink to="/login">Login</NavLink>
      )}
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <header className="app-header">
            <div className="container">
              <h1 className="app-title">
                <Link to="/" className="logo-link">FairAI</Link>
              </h1>
              <Navigation />
            </div>
          </header>

          <main className="app-main">
            <div className="container">
              <Routes>
                <Route path="/login" element={<Auth />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <UploadModelPage />
                  </ProtectedRoute>
                } />
                <Route path="/loan" element={
                  <ProtectedRoute>
                    <LoanFormPage />
                  </ProtectedRoute>
                } />
                <Route path="/results" element={
                  <ProtectedRoute>
                    <ResultsPage />
                  </ProtectedRoute>
                } />
                
                {/* Redirect to home if no match */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          <footer className="app-footer">
            <div className="container">
              <p> {new Date().getFullYear()} FairAI. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;