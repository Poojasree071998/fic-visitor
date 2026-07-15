import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('zmvms_user') || sessionStorage.getItem('zmvms_user');
    return saved ? JSON.parse(saved) : null;
  });

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
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
