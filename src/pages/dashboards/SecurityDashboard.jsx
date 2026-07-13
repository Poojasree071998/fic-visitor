import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useVisitors } from '../../context/VisitorContext';
import { useBranch } from '../../context/BranchContext';
import { Users, UserCheck, QrCode, ShieldAlert, Ban, Search, Clock, AlertTriangle, FileText, Settings, Camera } from 'lucide-react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { calculateTimeSpent } from '../../utils/timeUtils';
import { useAttendance } from '../../context/AttendanceContext';

import TeamVisitorWidget from '../../components/dashboards/TeamVisitorWidget';

const DashboardCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-lg duration-300">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const SecurityDashboard = () => {
  const { visitors } = useVisitors();
  const { activeBranch } = useBranch();
  const { attendance, checkIn, checkOut } = useAttendance();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { addNotification } = useNotification();
  
  // Webcam and Location state
  const webcamRef = React.useRef(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [webcamAction, setWebcamAction] = useState(null); // 'checkIn' or 'checkOut'
  const [currentLocation, setCurrentLocation] = useState(null);

  // Hardcoded branch settings as requested
  const getBranchSettings = (branchName) => {
    // Only Krishnagiri has strict settings for now
    if (branchName.toUpperCase().includes('KRISHNAGIRI') || branchName.toUpperCase() === 'SALEM') { // Salem legacy mapped to Krishnagiri previously? Actually Krishnagiri is the new branch.
      return {
        branchName: 'Krishnagiri',
        latitude: 12.5269722,
        longitude: 78.2025000,
        radius: 50,
        checkInStart: '09:00',
        checkInEnd: '09:30',
        checkOutTime: '20:00'
      };
    }
    // Default fallback for other branches (no strict GPS or time if not specified)
    return null;
  };

  const branchSettings = getBranchSettings(activeBranch);

  // Haversine formula to calculate distance between two coordinates in meters
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // in metres
  };

  const handleCapture = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedPhoto(imageSrc);
  }, [webcamRef]);

  const handleConfirmPhoto = () => {
    if (webcamAction === 'checkIn') {
      checkIn(capturedPhoto, currentLocation);
    } else if (webcamAction === 'checkOut') {
      checkOut(capturedPhoto, currentLocation);
    }
    setShowWebcam(false);
    setCapturedPhoto(null);
    setWebcamAction(null);
  };

  const openWebcam = (action) => {
    if (!branchSettings) {
      // If no strict settings, just open webcam directly
      setWebcamAction(action);
      setShowWebcam(true);
      setCapturedPhoto(null);
      return;
    }

    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    // Time constraint check for Check-In
    if (action === 'checkIn') {
      if (currentTimeStr < branchSettings.checkInStart || currentTimeStr > branchSettings.checkInEnd) {
        addNotification('Check-In Closed', `Allowed time: ${branchSettings.checkInStart} - ${branchSettings.checkInEnd}`, 'error');
        return;
      }
    }

    // Geolocation check
    if (!navigator.geolocation) {
      addNotification('Error', 'Geolocation is not supported by your browser', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCurrentLocation({ lat, lng });

      const distance = getDistance(lat, lng, branchSettings.latitude, branchSettings.longitude);
      
      if (distance > branchSettings.radius) {
        addNotification('Location Error', `You are outside the allowed branch location (${Math.round(distance)}m away). Please move within ${branchSettings.radius} meters of ${activeBranch}.`, 'error');
        return;
      }

      setWebcamAction(action);
      setShowWebcam(true);
      setCapturedPhoto(null);
    }, (err) => {
      addNotification('Location Error', 'Failed to get your location. Please enable GPS permissions.', 'error');
    });
  };

  // Metrics
  const today = new Date().toISOString().split('T')[0];
  const todaysVisitors = visitors.filter(v => v.visitDate === today).length;
  const visitorsInside = visitors.filter(v => v.status === 'Inside');
  const qrScans = 0; // Simulated
  const blockedAttempts = visitors.filter(v => v.status === 'Rejected').length; // Treating rejected as blocked for security proxy
  const securityAlerts = 0; // Simulated

  // Change to recent registrations to improve UX
  // Show expected arrivals (Approved) and visitors currently Inside
  const recentRegistrations = visitors
    .filter(v => 
      ((v.visitorName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (v.mobileNumber || '').includes(searchQuery))
    )
    .reverse()
    .slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Security Checkpoint Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Live operational terminal for <span className="font-semibold text-gray-700">{activeBranch}</span></p>
        </div>
        <div className="flex w-full sm:w-auto">
          <button 
            onClick={() => navigate('/tracking')}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <ShieldAlert size={18} />
            Zone Tracker
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardCard title="Today's Visitors" value={todaysVisitors} icon={Users} colorClass="bg-blue-100 text-blue-600" />
        <DashboardCard title="Visitors Inside" value={visitorsInside.length} icon={UserCheck} colorClass="bg-green-100 text-green-600" />
        <DashboardCard title="QR Scans" value={qrScans} icon={QrCode} colorClass="bg-purple-100 text-purple-600" />
        <DashboardCard title="Security Alerts" value={securityAlerts} icon={ShieldAlert} colorClass="bg-red-100 text-red-600" />
        <DashboardCard title="Blocked Attempts" value={blockedAttempts} icon={Ban} colorClass="bg-orange-100 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Left Column: Attendance, Quick Verification, Security Tools */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Daily Attendance Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Daily Attendance</h3>
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                Date: {today.split('-').reverse().join('-')}
              </span>
            </div>
            
            <div className="space-y-4">
              {showWebcam ? (
                <div className="space-y-3">
                  {!capturedPhoto ? (
                    <>
                      <div className="rounded-lg overflow-hidden border-2 border-[var(--color-brand-indigo)] bg-black">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full h-auto"
                          videoConstraints={{ facingMode: "user" }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setShowWebcam(false);
                            setWebcamAction(null);
                          }}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleCapture}
                          className="flex-1 py-2 bg-[var(--color-brand-indigo)] hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <Camera size={16} /> Capture
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg overflow-hidden border-2 border-green-500">
                        <img src={capturedPhoto} alt="Captured" className="w-full h-auto" />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setCapturedPhoto(null)}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                        >
                          Retake
                        </button>
                        <button 
                          onClick={handleConfirmPhoto}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                        >
                          Confirm & {webcamAction === 'checkIn' ? 'Check In' : 'Check Out'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : !attendance ? (
                <>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-bold text-gray-700">Not Checked In</span>
                  </div>
                  <button 
                    onClick={() => openWebcam('checkIn')}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Open Camera to Check In
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium">
                      <span>Status:</span>
                      <span>Present</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Check In:</span>
                      <span className="font-bold text-gray-900">{attendance.checkInTime}</span>
                    </div>
                    {attendance.checkInPhoto && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1"><Camera size={14} /> Photo:</span>
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1">✔ Captured</span>
                      </div>
                    )}
                    
                    {attendance.checkOutTime && (
                      <>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-gray-500">Check Out:</span>
                          <span className="font-bold text-gray-900">{attendance.checkOutTime}</span>
                        </div>
                        {attendance.checkOutPhoto && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1"><Camera size={14} /> Photo:</span>
                            <span className="text-green-600 text-xs font-bold flex items-center gap-1">✔ Captured</span>
                          </div>
                        )}
                      </>
                    )}
                    {attendance.workingHours && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Working Hours:</span>
                        <span className="font-bold text-[var(--color-brand-indigo)]">{attendance.workingHours}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    {attendance.status === 'Completed' ? (
                      <div className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-center border border-gray-200">
                        Attendance Completed
                      </div>
                    ) : (
                      <button 
                        onClick={() => openWebcam('checkOut')}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Camera size={18} />
                        Open Camera to Check Out
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 border-t-4 border-t-[var(--color-brand-indigo)]">
            <h3 className="text-[11px] font-bold text-gray-500 mb-4 uppercase tracking-wider">Quick Operations</h3>
            
            <div className="space-y-4">
              <button 
                onClick={() => alert("Simulating QR Camera Scanner...")}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-gray-600 hover:text-gray-900 hover:border-gray-400"
              >
                <QrCode size={32} />
                <span className="font-medium">Scan QR Pass</span>
              </button>

              <button 
                onClick={() => navigate('/visitors/new')}
                className="w-full py-3 bg-[var(--color-brand-indigo)] hover:bg-[var(--color-brand-indigo-light)] text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium shadow-sm"
              >
                <UserCheck size={20} />
                Walk-in Registration
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
             <h3 className="text-[11px] font-bold text-gray-500 mb-4 uppercase tracking-wider">Security Tools</h3>
             <div className="space-y-2 text-sm">
               <button onClick={() => navigate('/blacklist')} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-gray-200 transition-all text-gray-700">
                 <div className="flex items-center gap-3"><Ban size={18} className="text-red-500" /> Blacklist Verification</div>
                 <Search size={14} className="text-gray-400" />
               </button>
               <button onClick={() => navigate('/tracking')} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-gray-200 transition-all text-gray-700">
                 <div className="flex items-center gap-3"><ShieldAlert size={18} className="text-orange-500" /> Restrict Access Flags</div>
                 <Search size={14} className="text-gray-400" />
               </button>
             </div>
          </div>
        </div>

        {/* Right Column: Expected Arrivals Feed and Team Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recent Registrations</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search name or mobile..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-indigo)] bg-white" 
              />
            </div>
          </div>
          <div className="overflow-x-auto hide-scrollbar flex-1 pb-2">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-white text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-medium">Visitor</th>
                  <th className="px-6 py-4 font-medium">Host / Purpose</th>
                  <th className="px-6 py-4 font-medium">Entry Time</th>
                  <th className="px-6 py-4 font-medium">Exit Time</th>
                  <th className="px-6 py-4 font-medium">Time Spent</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRegistrations.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{visitor.visitorName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{visitor.mobileNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{visitor.hostName || '-'}</div>
                      <div className="text-xs text-gray-500">{visitor.purpose || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {visitor.entryTime || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {visitor.exitTime || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {calculateTimeSpent(visitor.visitDate, visitor.entryTime, visitor.exitTime, visitor.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center justify-end gap-1 ${
                        visitor.status === 'Approved' ? 'bg-green-50 text-green-600' :
                        visitor.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                        visitor.status === 'Inside' ? 'bg-indigo-50 text-[var(--color-brand-indigo)]' :
                        visitor.status === 'Exited' ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {visitor.status} 
                        {visitor.status === 'Approved' && '✅'}
                        {visitor.status === 'Pending' && '⏳'}
                        {visitor.status === 'Rejected' && '❌'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentRegistrations.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No recent visitors found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <TeamVisitorWidget branch={activeBranch} />
      </div>
    </div>
    </div>
  );
};

export default SecurityDashboard;
