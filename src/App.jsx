import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VisitorProvider } from './context/VisitorContext';
import { ZoneProvider } from './context/ZoneContext';
import { BlacklistProvider } from './context/BlacklistContext';
import { NotificationProvider } from './context/NotificationContext';
import { BranchProvider } from './context/BranchContext';
import { AttendanceProvider } from './context/AttendanceContext';
import ToastContainer from './components/notifications/ToastContainer';
import { ShieldAlert } from 'lucide-react';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotificationsPage from './pages/dashboards/NotificationsPage';
import VisitorList from './pages/visitors/VisitorList';
import VisitorForm from './pages/visitors/VisitorForm';
import ReturningVisitor from './pages/visitors/ReturningVisitor';
import VisitorPass from './pages/public/VisitorPass';
import ApprovalList from './pages/approvals/ApprovalList';
import ApprovalDetails from './pages/approvals/ApprovalDetails';
import ZoneList from './pages/zones/ZoneList';
import EntryExitLogs from './pages/tracking/EntryExitLogs';
import LiveMonitoring from './pages/tracking/LiveMonitoring';
import BlacklistList from './pages/blacklist/BlacklistList';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';
import AttendanceLog from './pages/tracking/AttendanceLog';
import Settings from './pages/settings/Settings';

import Subscription from './pages/settings/Subscription';

import AuditLogs from './pages/dashboards/AuditLogs';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  const isSubscriptionRoute = window.location.pathname === '/subscription';
  if (user.isExpired && !isSubscriptionRoute && user.role !== 'SaaS Super Admin') {
     return <Navigate to="/subscription" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Redirect to dashboard if unauthorized
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pass/:visitId" element={<VisitorPass />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="notifications" element={<ProtectedRoute allowedRoles={['SaaS Super Admin', 'Super Admin', 'MD', 'Admin', 'Branch Admin', 'Security', 'HR']}><NotificationsPage /></ProtectedRoute>} />
        
        {/* User Management */}
        <Route path="users" element={<ProtectedRoute allowedRoles={['Super Admin']}><UserList /></ProtectedRoute>} />
        <Route path="users/new" element={<ProtectedRoute allowedRoles={['Super Admin']}><UserForm /></ProtectedRoute>} />
        
        {/* Visitor Management */}
        <Route path="visitors" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><VisitorList /></ProtectedRoute>} />
        <Route path="visitors/new" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><VisitorForm /></ProtectedRoute>} />
        <Route path="visitors/returning" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><ReturningVisitor /></ProtectedRoute>} />
        
        {/* Approvals Module */}
        <Route path="approvals" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'HR']}><ApprovalList /></ProtectedRoute>} />
        <Route path="approvals/:id" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'HR']}><ApprovalDetails /></ProtectedRoute>} />
        
        {/* Other Modules */}
        <Route path="live-monitoring" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><LiveMonitoring /></ProtectedRoute>} />
        <Route path="zones" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><ZoneList /></ProtectedRoute>} />
        <Route path="tracking" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><EntryExitLogs /></ProtectedRoute>} />
        <Route path="attendance" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'HR']}><AttendanceLog /></ProtectedRoute>} />
        <Route path="blacklist" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security', 'HR']}><BlacklistList /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'HR']}><ReportsDashboard /></ProtectedRoute>} />
        <Route path="subscription" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'HR']}><Subscription /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'HR']}><AuditLogs /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Visitor', 'HR']}><Settings /></ProtectedRoute>} />

      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BranchProvider>
          <AttendanceProvider>
            <VisitorProvider>
              <ZoneProvider>
                <BlacklistProvider>
                  <Router>
                    <AppRoutes />
                    <ToastContainer />
                  </Router>
                </BlacklistProvider>
              </ZoneProvider>
            </VisitorProvider>
          </AttendanceProvider>
        </BranchProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
