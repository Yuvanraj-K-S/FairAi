import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, login, signup } = useAuth();

  const { name, email, password } = formData;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Add effect to log user state changes
  React.useEffect(() => {
    console.log('Current user state in Auth:', currentUser);
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      
      if (isLogin) {
        console.log('Attempting login with:', { email });
        result = await login(email, password);
      } else {
        console.log('Attempting signup with:', { name, email });
        result = await signup(name, email, password);
      }
      
      console.log('Auth result:', result);
      
      if (result && result.success) {
        console.log(`${isLogin ? 'Login' : 'Signup'} successful, checking user state...`);
        
        // Get the intended destination or default to home
        const from = location.state?.from?.pathname || '/';
        console.log('Will redirect to:', from);
        
        // Force a small delay to ensure state updates are processed
        setTimeout(() => {
          console.log('Attempting to navigate to:', from);
          navigate(from, { replace: true });
        }, 300);
      } else {
        const errorMsg = result?.error || `${isLogin ? 'Login' : 'Signup'} failed. Please try again.`;
        console.error('Auth failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMsg = err.response?.data?.message || 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={handleChange}
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              required
              minLength="6"
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        
        <p className="toggle-auth">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button 
            type="button" 
            className="toggle-button"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
