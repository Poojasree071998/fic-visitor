import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('zmvms_user') || sessionStorage.getItem('zmvms_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Global API Interceptor (Phase 25)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      // Only intercept 403 Forbidden responses
      if (response.status === 403) {
        // Clone the response so the original caller can still parse it if needed
        const clone = response.clone();
        try {
          const data = await clone.json();
          // Backend returned subscription expired
          if (data.subscriptionExpired) {
            updateUser({ isExpired: true });
          }
        } catch (err) {
          // Ignore parsing errors for non-JSON 403s
        }
      }
      return response;
    };

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      const url = `${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://zone-monitor.onrender.com')}/api/auth/login`;
      console.log('Attempting login to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const userData = await response.json();

      if (response.ok) {
        setUser(userData);
        if (rememberMe) {
          localStorage.setItem('zmvms_user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('zmvms_user', JSON.stringify(userData));
        }
        return { success: true };
      }
      return { success: false, message: userData.message || `Server responded with status: ${response.status}` };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: `Network error: ${err.message}` };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zmvms_user');
    sessionStorage.removeItem('zmvms_user');
    localStorage.removeItem('zmvms_visitors');
    sessionStorage.removeItem('zmvms_visitors');
  };

  const updateUser = (updates) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...updates };
      if (localStorage.getItem('zmvms_user')) {
        localStorage.setItem('zmvms_user', JSON.stringify(updatedUser));
      } else if (sessionStorage.getItem('zmvms_user')) {
        sessionStorage.setItem('zmvms_user', JSON.stringify(updatedUser));
      }
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
