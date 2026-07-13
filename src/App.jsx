import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VisitorProvider } from './context/VisitorContext';
import { ZoneProvider } from './context/ZoneContext';
import { BlacklistProvider } from './context/BlacklistContext';
import { NotificationProvider } from './context/NotificationContext';
import { BranchProvider } from './context/BranchContext';
import { AttendanceProvider } from './context/AttendanceContext';
import ToastContainer from './components/notifications/ToastContainer';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
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
        
        {/* User Management */}
        <Route path="users" element={<ProtectedRoute allowedRoles={['Super Admin']}><UserList /></ProtectedRoute>} />
        <Route path="users/new" element={<ProtectedRoute allowedRoles={['Super Admin']}><UserForm /></ProtectedRoute>} />
        
        {/* Visitor Management */}
        <Route path="visitors" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><VisitorList /></ProtectedRoute>} />
        <Route path="visitors/new" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><VisitorForm /></ProtectedRoute>} />
        <Route path="visitors/returning" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><ReturningVisitor /></ProtectedRoute>} />
        
        {/* Approvals Module */}
        <Route path="approvals" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin']}><ApprovalList /></ProtectedRoute>} />
        <Route path="approvals/:id" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin']}><ApprovalDetails /></ProtectedRoute>} />
        
        {/* Other Modules */}
        <Route path="live-monitoring" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><LiveMonitoring /></ProtectedRoute>} />
        <Route path="zones" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><ZoneList /></ProtectedRoute>} />
        <Route path="tracking" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><EntryExitLogs /></ProtectedRoute>} />
        <Route path="attendance" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin']}><AttendanceLog /></ProtectedRoute>} />
        <Route path="blacklist" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Security']}><BlacklistList /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin']}><ReportsDashboard /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute allowedRoles={['Super Admin', 'MD', 'Admin', 'Visitor']}><Settings /></ProtectedRoute>} />
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
