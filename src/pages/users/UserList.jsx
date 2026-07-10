import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { Users, UserPlus, Search, Shield, Building, Trash2, GraduationCap, Briefcase, UserCheck } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/users`;

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [branchStats, setBranchStats] = useState({ security: 0, admins: 0, visitors: 0 });
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { activeBranch, branches } = useBranch();
  
  // Exclude 'All Branches' from the selectable list for individual users
  const assignableBranches = branches.filter(b => b !== 'All Branches');

  useEffect(() => {
    fetchUsers();
    fetchBranchSummary();
  }, [activeBranch]);

  const fetchBranchSummary = async () => {
    if (activeBranch && activeBranch !== 'All Branches') {
      try {
        const res = await fetch(`${API_URL}/branch-summary?branch=${activeBranch}`);
        if (res.ok) {
          const data = await res.json();
          setBranchStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch branch summary:', err);
      }
    } else {
      setBranchStats({ security: 0, admins: 0, visitors: 0 });
    }
  };

  const fetchUsers = async () => {
    try {
      let fetchUrl = API_URL;
      if (currentUser && !['Super Admin'].includes(currentUser.role)) {
        fetchUrl = `${API_URL}?branch=${encodeURIComponent(currentUser.branch)}`;
      } else if (activeBranch && activeBranch !== 'All Branches') {
        fetchUrl = `${API_URL}?branch=${encodeURIComponent(activeBranch)}`;
      }

      const response = await fetch(fetchUrl);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const updateUserBranch = async (id, newBranch) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: newBranch })
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => (u.id || u._id) === id ? updatedUser : u));
      }
    } catch (err) {
      console.error('Error updating user branch:', err);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.role?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.mobileNumber || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system access and dashboard roles</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/users/new')}
            className="px-4 py-2 bg-[var(--color-brand-indigo)] text-white hover:bg-[var(--color-brand-indigo-light)] font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <UserPlus size={18} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {activeBranch && activeBranch !== 'All Branches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Security</p>
              <h3 className="text-2xl font-bold text-gray-900">{branchStats.security || 0}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Admins</p>
              <h3 className="text-2xl font-bold text-gray-900">{branchStats.admins || 0}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Visitors</p>
              <h3 className="text-2xl font-bold text-gray-900">{branchStats.visitors}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, email, role, or mobile..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-transparent transition-shadow"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
            Total Users: {filteredUsers.length}
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Name & Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Branch Access</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[var(--color-brand-indigo)] font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{u.name}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                          {u.mobileNumber && <div className="text-xs text-gray-400 mt-0.5">{u.mobileNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                        ${u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : ''}
                        ${u.role === 'MD' ? 'bg-blue-100 text-blue-700' : ''}
                        ${u.role === 'Branch Admin' ? 'bg-teal-100 text-teal-700' : ''}
                        ${u.role === 'Security' ? 'bg-orange-100 text-orange-700' : ''}
                        ${u.role === 'Visitor' ? 'bg-gray-100 text-gray-700' : ''}
                      `}>
                        <Shield size={12} />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                        ${u.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                      `}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Building size={16} className="text-gray-400" />
                        <select 
                          value={u.branch || ''} 
                          onChange={(e) => updateUserBranch(u.id || u._id, e.target.value)}
                          className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer font-medium text-gray-700 hover:text-[var(--color-brand-indigo)] transition-colors p-0"
                        >
                          <option value="">Select Branch</option>
                          {assignableBranches.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteUser(u.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeBranch && activeBranch !== 'All Branches' && (
        <div className="mt-8 bg-slate-50 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building size={20} className="text-[var(--color-brand-indigo)]" />
                {activeBranch} Branch Statistics
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Overview of total user types assigned to this branch.
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Security</p>
                <p className="text-xl font-bold text-gray-900">{branchStats.security || 0}</p>
              </div>
              <div className="w-px bg-gray-200"></div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admins</p>
                <p className="text-xl font-bold text-gray-900">{branchStats.admins || 0}</p>
              </div>
              <div className="w-px bg-gray-200"></div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visitors</p>
                <p className="text-xl font-bold text-gray-900">{branchStats.visitors}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 font-medium">
              Last Updated: Today {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
