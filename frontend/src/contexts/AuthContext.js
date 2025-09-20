import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Add a response interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // If we get a 401, the token is invalid or expired
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          
          // Only redirect if not already on the login page
          if (!window.location.pathname.includes('/login')) {
            navigate('/login', { 
              state: { 
                from: window.location.pathname,
                message: 'Your session has expired. Please log in again.'
              } 
            });
          }
          
          return Promise.reject({ ...error, isTokenExpired: true });
        }
        return Promise.reject(error);
      }
    );
    
    // Check if user is logged in on initial load
    const token = localStorage.getItem('token');
    if (token) {
      // Set the token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user data
      const fetchUser = async () => {
        try {
          const response = await axios.get('http://localhost:5000/api/auth/me');
          if (response.data && response.data.status === 'success') {
            setUser(response.data.user);
          } else {
            console.error('Error fetching user:', response.data?.message || 'Unknown error');
            handleLogout();
          }
        } catch (err) {
          console.error('Error fetching user:', err);
          handleLogout();
        } finally {
          setLoading(false);
        }
      };
      
      fetchUser();
    } else {
      setLoading(false);
    }
    
    // Cleanup interceptor on component unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Login attempt with email:', email);
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      console.log('Login response:', response.data);
      
      // Check for successful response with token and user data
      if (response.data && response.data.status === 'success') {
        const { token, user } = response.data;
        
        if (!token) {
          console.error('No token received in login response');
          return {
            success: false,
            error: 'Authentication error: No token received'
          };
        }
        
        // Save token to localStorage
        localStorage.setItem('token', token);
        
        // Set axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update user state with user data from response
        console.log('Setting user state:', user);
        setUser(user);
        
        return { 
          success: true,
          user // Return user data for immediate use
        };
      } else {
        // Handle case where response indicates failure
        const errorMsg = response.data?.message || 'Login failed. Please try again.';
        console.error('Login failed:', errorMsg);
        return { 
          success: false, 
          error: errorMsg
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const signup = async (name, email, password) => {
    try {
      console.log('Signup attempt with:', { name, email });
      const response = await axios.post('http://localhost:5000/api/auth/signup', { 
        name, 
        email, 
        password 
      });
      
      console.log('Signup response:', response.data);
      
      // Check for successful response with token and user data
      if (response.data && response.data.status === 'success') {
        const { token, user } = response.data;
        
        if (!token) {
          console.error('No token received in signup response');
          return {
            success: false,
            error: 'Authentication error: No token received after signup'
          };
        }
        
        // Save token to localStorage
        localStorage.setItem('token', token);
        
        // Set axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update user state with user data from response
        console.log('Setting user state after signup:', user);
        setUser(user);
        
        return { 
          success: true,
          user // Return user data for immediate use
        };
      } else {
        // Handle case where response indicates failure
        const errorMsg = response.data?.message || 'Signup failed. Please try again.';
        console.error('Signup failed:', errorMsg);
        return { 
          success: false, 
          error: errorMsg
        };
      }
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || 'Signup failed. Please try again.';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const handleLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove auth header
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear user state
    setUser(null);
    
    // Navigate to login page
    navigate('/login');
  };
  
  // Alias for backward compatibility
  const logout = handleLogout;

  // Create the context value with all the required properties
  const contextValue = {
    currentUser: user,
    loading,
    login,
    signup,
    logout: handleLogout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading ? children : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
