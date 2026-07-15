import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, CheckCircle, Eye, EyeOff, Building, User, Phone, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.svg';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [plan, setPlan] = useState('Basic');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCode, setSuccessCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://zone-monitor.onrender.com');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    if (mode === 'login') {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        setIsLoading(false);
        setIsSuccess(true);
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            navigate('/');
          }, 500);
        }, 1000);
      } else {
        setIsLoading(false);
        setErrorMsg(result.message || 'Login failed. Please try again.');
        setShakeKey(prev => prev + 1);
      }
    } else {
      // Register company
      try {
        const response = await fetch(`${API_BASE}/api/auth/register-company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            adminName,
            email,
            mobileNumber,
            password,
            plan
          })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        setSuccessCode(data.company.code);
        setIsSuccess(true);
        setIsLoading(false);
        
        setTimeout(() => {
          setMode('login');
          setIsSuccess(false);
          setErrorMsg('');
        }, 6000);
      } catch (err) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Registration failed');
        setShakeKey(prev => prev + 1);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 bg-grid-pattern relative overflow-y-auto overflow-x-hidden py-6 px-4">
      {/* White background overlay */}
      <div className="absolute inset-0 bg-white/80 pointer-events-none"></div>

      {/* Decorative blobs */}
      <div className="fixed top-[5%] left-[5%] w-64 h-64 bg-indigo-200 rounded-full blur-[80px] opacity-60 pointer-events-none animate-float-bg"></div>
      <div className="fixed bottom-[5%] right-[5%] w-72 h-72 bg-blue-200 rounded-full blur-[80px] opacity-40 pointer-events-none animate-float-bg"></div>

      <div key={shakeKey} className={`w-full max-w-md p-6 sm:p-8 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl z-10 border border-white animate-slide-up-fade ${isExiting ? 'animate-fade-out' : ''} ${errorMsg ? 'animate-shake' : ''}`}>
        <div className="text-center mb-6">
          <div className="mx-auto w-56 h-24 flex items-center justify-center mb-2">
            <img src={logoImg} alt="Forge India Connect Logo" className="w-full h-full object-contain animate-logo-zoom" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">FIC VMS</h1>
          <p className="text-gray-500 text-sm">{mode === 'login' ? 'Zone Monitoring & Visitor Management' : 'SaaS Company Registration'}</p>
        </div>

        {isSuccess && mode === 'register' ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Tenant Registered Successfully!</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Your Company Code</p>
              <p className="text-2xl font-extrabold text-[#1E1B6E] tracking-widest">{successCode}</p>
            </div>
            <p className="text-xs text-gray-500">
              Use this company code to log in. Proceeding to login screen...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 outline-none bg-gray-50/50"
                      placeholder="e.g. Acme Corp"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Admin User Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 outline-none bg-gray-50/50"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 outline-none bg-gray-50/50"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Plan</label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 outline-none bg-gray-50/50 font-medium text-gray-700"
                    >
                      <option value="Basic">Basic (Free Trial)</option>
                      <option value="Standard">Standard ($29/mo)</option>
                      <option value="Enterprise">Enterprise ($99/mo)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 outline-none bg-gray-50/50"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-indigo-400 outline-none bg-gray-50/50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[var(--color-brand-indigo)] focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-500 text-xs py-2 px-3 rounded-lg text-center border border-red-100 font-medium">
                {errorMsg}
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded text-[var(--color-brand-indigo)] focus:ring-[var(--color-brand-indigo)]" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-[var(--color-brand-indigo)] hover:text-indigo-800 font-semibold transition-colors">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`w-full text-white font-semibold py-2.5 rounded-lg transition-all duration-300 transform shadow-md flex items-center justify-center space-x-2 ${
                isSuccess 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-[var(--color-brand-indigo)] hover:bg-[var(--color-brand-indigo-light)] hover:-translate-y-0.5 hover:shadow-indigo-500/20 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{mode === 'login' ? 'Authenticating...' : 'Registering...'}</span>
                </>
              ) : isSuccess && mode === 'login' ? (
                <>
                  <CheckCircle size={18} className="text-white" />
                  <span>Login Successful</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Register Company & Get Code'}</span>
              )}
            </button>

            <div className="mt-4 text-center text-xs text-gray-500 border-t border-slate-100 pt-4">
              {mode === 'login' ? (
                <>
                  Want to use this for your company?{' '}
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                    }} 
                    className="text-[var(--color-brand-indigo)] hover:text-indigo-800 font-bold underline transition-colors"
                  >
                    Register Company
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }} 
                    className="text-[var(--color-brand-indigo)] hover:text-indigo-800 font-bold underline transition-colors"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
