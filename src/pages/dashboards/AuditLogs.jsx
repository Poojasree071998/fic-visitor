import React, { useState, useEffect } from 'react';
import { Shield, Search, Activity, User, Monitor, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('All');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = `${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')}/api/audit-logs`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Company-Id': user?.companyId
        }
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = filterModule === 'All' || log.module === filterModule;

    return matchesSearch && matchesModule;
  });

  const getModuleColor = (module) => {
    switch(module) {
      case 'Authentication': return 'bg-purple-100 text-purple-700';
      case 'Visitor': return 'bg-green-100 text-green-700';
      case 'User Management': return 'bg-blue-100 text-blue-700';
      case 'Tenant Management': return 'bg-indigo-100 text-indigo-700';
      case 'Subscription': return 'bg-orange-100 text-orange-700';
      case 'Settings': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-[#1E1B6E]" size={28} />
            Security Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">Monitor all administrative and security actions in your company workspace</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-[#1E1B6E] focus:border-[#1E1B6E] sm:text-sm transition-colors bg-slate-50"
            placeholder="Search by user or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-[#1E1B6E] focus:border-[#1E1B6E] bg-slate-50 font-medium"
          >
            <option value="All">All Modules</option>
            <option value="Authentication">Authentication</option>
            <option value="Visitor">Visitor</option>
            <option value="User Management">User Management</option>
            <option value="Settings">Settings</option>
          </select>
          <button 
            onClick={fetchLogs}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-lg font-medium transition-colors border border-slate-200 text-sm"
          >
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-100">
            Error loading logs: {error}
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Module</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E1B6E] mx-auto"></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium bg-slate-50/50">
                    No audit logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span>{new Date(log.createdAt).toLocaleString('en-US', { 
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                        })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <div>
                          <div>{log.userName}</div>
                          <div className="text-[10px] text-gray-500 font-normal uppercase tracking-wider">{log.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getModuleColor(log.module)}`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-[#1E1B6E]" />
                        <span>{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Monitor size={12} className="text-gray-400" />
                        {log.ipAddress || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
