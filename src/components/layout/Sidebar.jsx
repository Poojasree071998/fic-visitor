import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Map, 
  Ban, 
  FileText, 
  Settings,
  LogOut,
  Shield,
  Activity,
  X,
  Clock
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const role = user?.role || 'Visitor';

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['Super Admin', 'MD', 'Admin', 'Security', 'Visitor'] },
    { name: 'All Visitors', path: '/visitors', icon: <Users size={20} />, roles: ['Super Admin', 'MD', 'Admin', 'Security'] },
    { name: 'User Management', path: '/users', icon: <Shield size={20} />, roles: ['Super Admin'] },
    { name: 'Approvals', path: '/approvals', icon: <CheckSquare size={20} />, roles: ['Super Admin', 'MD', 'Admin'] },
    { name: 'Blacklist', path: '/blacklist', icon: <Ban size={20} />, roles: ['Super Admin', 'MD', 'Admin', 'Security'] },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} />, roles: ['Super Admin', 'MD', 'Admin'] },
    { name: 'Attendance', path: '/attendance', icon: <Clock size={20} />, roles: ['Super Admin', 'MD', 'Admin'] },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: ['Super Admin', 'MD', 'Admin', 'Visitor'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`w-64 bg-[var(--color-brand-indigo)] text-white h-screen fixed top-0 left-0 flex flex-col shadow-xl z-20 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        <h1 className="text-2xl font-bold tracking-wider">FIC VMS</h1>
        <button 
          className="md:hidden text-white/70 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsOpen(false);
              }
            }}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-white text-[var(--color-brand-indigo)] shadow-md font-medium' 
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium shadow-md"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      
      <div className="pb-4 text-xs text-indigo-200 text-center">
        &copy; 2026 FIC VMS Portal
      </div>
    </aside>
  );
};

export default Sidebar;
