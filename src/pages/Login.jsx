import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, CheckCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const result = await login(email, password);
    
    if (result.success) {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          navigate('/');
        }, 500); // Wait for fade out
      }, 1000); // Show success message for 1s
    } else {
      setIsLoading(false);
      setErrorMsg(result.message || 'Login failed. Please try again.');
      setShakeKey(prev => prev + 1); // trigger shake animation
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 bg-grid-pattern relative overflow-y-auto overflow-x-hidden py-4 px-4">
      {/* Subtle white overlay to soften the grid */}
      <div className="absolute inset-0 bg-white/80 pointer-events-none"></div>

      {/* Decorative Background Elements */}
      <div className="fixed top-[5%] left-[5%] w-64 h-64 bg-indigo-200 rounded-full blur-[80px] opacity-60 pointer-events-none animate-float-bg" style={{ animationDelay: '0s', animationDuration: '15s' }}></div>
      <div className="fixed bottom-[5%] right-[5%] w-72 h-72 bg-blue-200 rounded-full blur-[80px] opacity-40 pointer-events-none animate-float-bg" style={{ animationDelay: '-5s', animationDuration: '18s' }}></div>
      <div className="fixed top-[40%] right-[15%] w-48 h-48 bg-purple-200 rounded-full blur-[70px] opacity-30 pointer-events-none animate-float-bg" style={{ animationDelay: '-2s', animationDuration: '12s' }}></div>
      <div className="fixed bottom-[30%] left-[10%] w-56 h-56 bg-indigo-300 rounded-full blur-[80px] opacity-30 pointer-events-none animate-float-bg" style={{ animationDelay: '-7s', animationDuration: '14s' }}></div>
      <div className="fixed top-[15%] left-[40%] w-40 h-40 bg-pink-200 rounded-full blur-[60px] opacity-20 pointer-events-none animate-float-bg" style={{ animationDelay: '-10s', animationDuration: '20s' }}></div>

      <div key={shakeKey} className={`w-full max-w-md p-6 sm:p-8 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl z-10 border border-white animate-slide-up-fade ${isExiting ? 'animate-fade-out' : ''} ${errorMsg ? 'animate-shake' : ''}`}>
        <div className="text-center mb-6">
          <div className="mx-auto w-56 h-28 flex items-center justify-center mb-2">
            <img src="/logo.svg" alt="Forge India Connect Logo" className="w-full h-full object-contain animate-logo-zoom" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FIC VMS</h1>
          <p className="text-gray-500">Zone Monitoring & Visitor Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 focus:shadow-[0_0_15px_rgba(30,27,110,0.15)] transition-all duration-300 outline-none bg-gray-50/50"
                placeholder="admin@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 focus:shadow-[0_0_15px_rgba(30,27,110,0.15)] transition-all duration-300 outline-none bg-gray-50/50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-500 text-sm py-2 px-3 rounded-lg text-center border border-red-100 animate-slide-up-fade font-medium">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded text-[var(--color-brand-indigo)] focus:ring-[var(--color-brand-indigo)]" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-[var(--color-brand-indigo)] hover:text-indigo-800 font-medium transition-colors">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className={`w-full text-white font-medium py-3 rounded-lg transition-all duration-300 transform shadow-lg flex items-center justify-center space-x-2 ${
              isSuccess 
                ? 'bg-green-500 shadow-green-500/30' 
                : 'bg-[var(--color-brand-indigo)] hover:bg-[var(--color-brand-indigo-light)] hover:-translate-y-1 hover:shadow-indigo-500/40 active:scale-[0.98] shadow-indigo-500/30'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle size={20} className="text-white" />
                <span>Login Successful</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
