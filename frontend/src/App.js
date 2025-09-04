import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import UploadModelPage from './pages/UploadModelPage';
import LoanFormPage from './pages/LoanFormPage';
import ResultsPage from './pages/ResultsPage';
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

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="container">
            <h1 className="app-title">FairAI</h1>
            <nav className="main-nav">
              <NavLink to="/">Upload Model</NavLink>
              <NavLink to="/loan">Loan Form</NavLink>
              <NavLink to="/results">Results</NavLink>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="container">
            <Routes>
              <Route path="/" element={<UploadModelPage />} />
              <Route path="/loan" element={<LoanFormPage />} />
              <Route path="/results" element={<ResultsPage />} />
            </Routes>
          </div>
        </main>

        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} FairAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;