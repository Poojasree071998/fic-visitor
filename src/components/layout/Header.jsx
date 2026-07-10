import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useNotification } from '../../context/NotificationContext';
import { Bell, User, MapPin, Check, Menu } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/notifications`;

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const { user } = useAuth();
  const { branches, activeBranch, setActiveBranch } = useBranch();
  const { addNotification } = useNotification();
  
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const getNormalizedRole = (role) => {
    if (!role) return 'admin';
    if (role === 'Branch Admin') return 'admin';
    return role.toLowerCase().replace(/\s/g, '');
  };

  const fetchNotifications = async () => {
    try {
      let queryBranch = user?.branch;
      if (user?.role === 'Super Admin') {
        queryBranch = activeBranch === 'All Branches' ? null : activeBranch;
      }
      const fetchUrl = queryBranch && queryBranch !== 'All Branches'
        ? `${API_URL}?branch=${encodeURIComponent(queryBranch)}` 
        : API_URL;
      
      const res = await fetch(fetchUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const normalizedRole = getNormalizedRole(user?.role);
        const relevant = data.filter(n => {
          const roles = n.roles || [];
          return roles.includes(normalizedRole) || (user?.role && roles.includes(user.role));
        });
        setNotifications(relevant);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const socket = io(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}`);
    
    socket.on('newNotification', (notification) => {
      let queryBranch = user?.branch;
      if (user?.role === 'Super Admin') {
        queryBranch = activeBranch === 'All Branches' ? null : activeBranch;
      }
      
      // Ignore notifications that don't belong to the expected branch context
      if (queryBranch && queryBranch !== 'All Branches' && notification.branch && notification.branch !== queryBranch) {
        return;
      }

      const normalizedRole = getNormalizedRole(user?.role);
      const roles = notification.roles || [];
      
      if (roles.includes(normalizedRole) || (user?.role && roles.includes(user.role))) {
        setNotifications(prev => [notification, ...prev]);
        addNotification(notification.title, notification.message, 'info');
      }
    });

    return () => socket.disconnect();
  }, [user, activeBranch, addNotification]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className={`h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-0 ${isSidebarOpen ? 'md:left-64' : ''} flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm transition-all duration-300`}>
      <div className="flex items-center space-x-2 sm:space-x-4">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-[var(--color-brand-indigo)] transition-colors mr-1 sm:mr-2"
          >
            <Menu size={24} />
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">
          Welcome back, {user?.name || 'User'}
        </h2>
        
        <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-50 px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200">
          <MapPin size={16} className="text-[var(--color-brand-indigo)] shrink-0" />
          {['Super Admin'].includes(user?.role) ? (
            <select 
              value={activeBranch} 
              onChange={(e) => setActiveBranch(e.target.value)}
              className="bg-transparent outline-none text-xs sm:text-sm font-medium text-gray-700 cursor-pointer w-24 sm:w-40"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-gray-700">{activeBranch}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 text-gray-400 hover:text-[var(--color-brand-indigo)] hover:bg-indigo-50 rounded-full transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-700">Notifications</h3>
                <span className="text-xs text-gray-500">{unreadCount} unread</span>
              </div>
              
              <div className="divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No new notifications
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification._id} 
                      onClick={() => !notification.isRead && markAsRead(notification._id)}
                      className={`p-4 transition-colors cursor-pointer ${!notification.isRead ? 'bg-indigo-50/30 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-sm mt-0.5">{!notification.isRead ? '🔴' : '⚪'}</span>
                        <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </h4>
                      </div>
                      <p className={`text-xs ml-6 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'} mb-1`}>
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-gray-400 ml-6">
                        {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-gray-200"></div>
        
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--color-brand-indigo)] text-white flex items-center justify-center font-bold">
            {user?.name?.charAt(0) || <User size={18} />}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-gray-700">{user?.name || 'Admin'}</span>
            <span className="text-xs text-gray-500">{user?.role || 'Role'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
