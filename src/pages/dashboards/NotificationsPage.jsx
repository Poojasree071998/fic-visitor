import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { io } from 'socket.io-client';
import { Search, Filter, Trash2, CheckCircle, BellOff } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')}/api/notifications`;

const NotificationsPage = () => {
  const { user } = useAuth();
  const { activeBranch } = useBranch();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const types = ['All', 'Tenant', 'Visitor', 'Security', 'Attendance', 'Subscription', 'System', 'Announcement', 'Branch', 'Admin'];

  const getHeaders = () => ({
    'X-Company-Id': user?.companyId || 'SYSTEM',
    'X-User-Id': user?.id || 'bootstrap',
    'X-User-Role': user?.role || 'User',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let url = new URL(API_URL);
      if (user?.role === 'Super Admin' && activeBranch !== 'All Branches') {
        url.searchParams.append('branch', activeBranch);
      }
      
      const res = await fetch(url.toString(), {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const socket = io(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')}`);
    
    socket.on('new_notification', (notification) => {
      // Basic branch check if applicable
      let queryBranch = user?.branch;
      if (user?.role === 'Super Admin') {
        queryBranch = activeBranch === 'All Branches' ? null : activeBranch;
      }
      
      if (queryBranch && queryBranch !== 'All Branches' && notification.branchId && notification.branchId !== queryBranch) {
        return;
      }
      
      // Additional client-side role filtering could go here, but since rooms aren't used, we do a basic check
      if (user?.role === 'SaaS Super Admin') {
        const saasTypes = ['Tenant', 'Subscription', 'System', 'Branch', 'Admin', 'Announcement'];
        if (!saasTypes.includes(notification.type)) {
          return;
        }
      } else if (user?.role !== 'SaaS Super Admin' && notification.companyId !== 'SYSTEM' && notification.companyId !== user?.companyId) {
        return; // Not for this company
      }

      setNotifications(prev => [notification, ...prev]);
    });

    return () => socket.disconnect();
  }, [user, activeBranch]);

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}/read`, { 
        method: 'PATCH',
        headers: getHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_URL}/read-all`, { 
        method: 'PATCH',
        headers: getHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
      const res = await fetch(API_URL, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || n.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto mt-16 md:mt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your alerts and activity logs</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-[var(--color-brand-indigo)] rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <CheckCircle size={16} /> Mark All as Read
          </button>
          <button 
            onClick={clearAllNotifications}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} /> Clear All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-transparent outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <Filter size={18} className="text-gray-400 shrink-0" />
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === t 
                    ? 'bg-[var(--color-brand-indigo)] text-white' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-indigo)]"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <BellOff size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Notifications</h3>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification._id} 
                className={`p-4 sm:p-5 flex gap-4 transition-colors relative group ${
                  !notification.isRead ? 'bg-indigo-50/40' : 'hover:bg-gray-50'
                }`}
              >
                <div className="shrink-0 mt-1">
                  {!notification.isRead ? (
                    <div className="w-2.5 h-2.5 bg-[var(--color-brand-indigo)] rounded-full mt-1.5"></div>
                  ) : (
                    <div className="w-2.5 h-2.5 bg-gray-300 rounded-full mt-1.5"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 mb-1">
                    <h4 className={`text-[15px] font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded-md w-fit">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-sm ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'} leading-relaxed`}>
                    {notification.message}
                  </p>
                  
                  <div className="mt-2 flex items-center gap-3 text-xs font-medium text-gray-500">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-md">{notification.type}</span>
                    {(notification.branchId || notification.branch) && (
                      <span className="bg-gray-100 px-2.5 py-1 rounded-md">{notification.branchId || notification.branch}</span>
                    )}
                    {notification.createdBy && (
                      <span>By: {notification.createdBy}</span>
                    )}
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 shrink-0">
                  {!notification.isRead && (
                    <button 
                      onClick={() => markAsRead(notification._id)}
                      className="p-1.5 text-[var(--color-brand-indigo)] hover:bg-indigo-100 rounded-lg transition-colors tooltip-trigger"
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notification._id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
