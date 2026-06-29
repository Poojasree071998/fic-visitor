import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      alert(`Login failed: ${result.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-brand-indigo-light)] rounded-full blur-[100px] opacity-20"></div>

      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl z-10 border border-white">
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-[var(--color-brand-indigo)] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ZMVMS</h1>
          <p className="text-gray-500">Zone Monitoring & Visitor Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-transparent transition-all outline-none bg-gray-50/50"
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
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-transparent transition-all outline-none bg-gray-50/50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

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
            className="w-full bg-[var(--color-brand-indigo)] hover:bg-[var(--color-brand-indigo-light)] text-white font-medium py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30"
          >
            Sign In to Dashboard
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
