import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Phone, Mail, Building, MapPin, Calendar, Clock, LogIn, LogOut, ShieldCheck, AlertCircle, Clock3, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const VisitorPass = () => {
  const { visitId } = useParams();
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    fetchVisitor();
  }, [visitId]);

  const fetchVisitor = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/visitors/pass/${visitId}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Visitor pass not found or invalid QR code.');
      }
      const data = await response.json();
      setVisitor(data);
      setPurpose(data.purpose || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (action) => {
    try {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      let updatePayload = {};
      
      if (action === 'checkIn') {
        updatePayload = {
          status: 'Inside',
          currentZone: 'Reception',
          entryTime: timeString,
          purpose: purpose // Send updated purpose to backend
        };
      } else if (action === 'checkOut') {
        updatePayload = {
          status: 'Exited',
          exitTime: timeString,
          remarks: notes, // Send notes to backend
          purpose: purpose // Send updated purpose to backend
        };
      }

      const apiUrl = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/visitors/${visitor.id}/zone`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Company-Id': visitor.companyId || 'FIC001'
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const updatedVisitor = await response.json();
        setVisitor(updatedVisitor);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-[var(--color-brand-indigo)] border-t-transparent rounded-full animate-spin"></div></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><AlertCircle size={48} className="text-red-500 mb-4" /><h1 className="text-xl font-bold text-gray-900">Invalid Pass</h1><p className="text-gray-500">{error}</p></div>;
  if (!visitor) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Inside': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Exited': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderTimeline = () => {
    const steps = ['Pending', 'Approved', 'Inside', 'Exited'];
    let currentIndex = steps.indexOf(visitor.status);
    if (visitor.status === 'Rejected') currentIndex = -1;

    return (
      <div className="flex justify-between items-center w-full px-4 mb-6 mt-2 relative z-0">
        <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-gray-200 -z-10 -translate-y-1/2"></div>
        <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-[var(--color-brand-indigo)] -z-10 -translate-y-1/2 transition-all duration-500" 
             style={{ width: currentIndex >= 0 ? `${(currentIndex / 3) * 100}%` : '0%' }}></div>
        
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={step} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isCompleted ? 'bg-[var(--color-brand-indigo)] text-white shadow-md' : 'bg-gray-100 text-gray-400'
              } ${isCurrent ? 'ring-4 ring-indigo-100' : ''}`}>
                {index + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex justify-center pb-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #eef4ff 0%, #f8fbff 50%, #ffffff 100%)' }}>
      <style>
        {`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .pass-card-animate {
            animation: fadeUp 0.8s ease forwards;
          }
        `}
      </style>
      
      {/* Decorative Circles */}
      <div className="fixed w-[250px] h-[250px] bg-indigo-500/15 rounded-full -top-20 -left-20 blur-[80px] pointer-events-none"></div>
      <div className="fixed w-[250px] h-[250px] bg-emerald-500/12 rounded-full -bottom-20 -right-20 blur-[80px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-4 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6 relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center p-2 mb-3">
             <img src="/logo.svg" alt="FIC Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-[var(--color-brand-indigo)] tracking-tight">FIC VMS</h1>
          <p className="mt-1 text-sm font-bold text-gray-500 uppercase tracking-widest">Digital Visitor Pass</p>
        </div>

        {/* Timeline */}
        {renderTimeline()}

        {/* Main Pass Card */}
        <div className="bg-white/80 backdrop-blur-[15px] rounded-[20px] shadow-xl overflow-hidden border border-white/50 relative pass-card-animate">
          
          {/* Top Header Background */}
          <div className="h-32 bg-gradient-to-br from-[var(--color-brand-indigo)] to-indigo-900 relative">
            <div className="absolute top-4 right-4">
               <span className={`font-bold px-3 py-1 rounded-full text-xs shadow-sm flex items-center gap-1 ${getStatusColor(visitor.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${visitor.status === 'Approved' ? 'bg-green-500 animate-pulse' : visitor.status === 'Inside' ? 'bg-blue-500' : 'bg-current'}`}></div>
                  {visitor.status}
                </span>
            </div>
          </div>

          {/* Hero Photo (Overlapping) */}
          <div className="flex flex-col items-center -mt-16 px-6">
            <div className="w-32 h-32 bg-white rounded-3xl p-1.5 shadow-lg relative z-10">
              <div className="w-full h-full bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
                {visitor.photoUrl ? (
                  <img src={visitor.photoUrl} alt="Visitor" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-gray-400" />
                )}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4 tracking-tight">{visitor.visitorName}</h2>
            <p className="text-sm text-gray-500 font-medium">{visitor.companyName || 'Independent Visitor'}</p>
          </div>

          {/* 2-Column Details Grid */}
          <div className="p-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                
                {/* ID Info */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                    <User size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Visitor ID</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--color-brand-indigo)]">{visitor.profileId}</p>
                </div>
                
                <div className="col-span-1">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                    <MapPin size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Visit ID</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{visitor.visitId}</p>
                </div>

                {/* Logistics */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                    <Building size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Branch</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 truncate">{visitor.branch}</p>
                </div>

                <div className="col-span-1">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                    <Calendar size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{visitor.visitDate}</p>
                </div>

                {/* Host & Purpose */}
                <div className="col-span-2 border-t border-gray-200 pt-4 mt-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                        <User size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Visiting Host</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{visitor.hostName}</p>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Purpose</span>
                      </div>
                      {visitor.status === 'Pending' || visitor.status === 'Approved' || visitor.status === 'Inside' ? (
                        <select 
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="text-xs font-bold text-purple-700 bg-purple-100 border-none rounded-full py-1 px-3 outline-none focus:ring-2 focus:ring-purple-300 transition-shadow cursor-pointer text-right appearance-none"
                        >
                          <option value="Interview">Interview</option>
                          <option value="Follow up">Follow up</option>
                          <option value="Job consulting">Job consulting</option>
                          <option value="Banking">Banking</option>
                          <option value="CEO meeting">CEO meeting</option>
                          <option value="Visitors">Visitors</option>
                          <option value="Guest">Guest</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">{purpose}</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
        
        {/* Notes Section */}
        {visitor.status === 'Inside' && (
          <div className="bg-white p-6 shadow-md border border-gray-100 rounded-3xl animate-in slide-in-from-bottom-4 duration-300">
            <label className="font-semibold text-[var(--color-brand-indigo)] uppercase text-xs tracking-wider block mb-3 flex items-center gap-2">
              <FileText size={14} /> Checkout Notes (Required)
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please enter any remarks or meeting outcomes before checking out..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:bg-white resize-none transition-all"
              rows="3"
              required
            ></textarea>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          {visitor.status === 'Approved' && !visitor.entryTime && (
            <button 
              onClick={() => updateStatus('checkIn')}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 active:shadow-sm"
            >
              <LogIn size={24} /> Swipe / Tap to Check In
            </button>
          )}

          {visitor.status === 'Inside' && !visitor.exitTime && (
            <button 
              onClick={() => updateStatus('checkOut')}
              disabled={notes.trim().length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                notes.trim().length === 0 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 active:shadow-sm'
              }`}
            >
              <LogOut size={24} /> {notes.trim().length === 0 ? 'Fill Notes to Check Out' : 'Tap to Check Out'}
            </button>
          )}

          {visitor.status === 'Pending' && (
            <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 py-4 rounded-2xl font-medium text-center shadow-sm flex flex-col items-center justify-center gap-2">
              <Clock3 size={24} className="text-yellow-600" />
              <span>Pass is awaiting approval</span>
            </div>
          )}

          {visitor.status === 'Rejected' && (
            <div className="w-full bg-red-50 border border-red-200 text-red-800 py-4 rounded-2xl font-medium text-center shadow-sm flex flex-col items-center justify-center gap-2">
              <AlertCircle size={24} className="text-red-600" />
              <span>This pass has been rejected</span>
            </div>
          )}
          
          {visitor.status === 'Exited' && (
            <div className="w-full bg-gray-100 border border-gray-200 text-gray-600 py-4 rounded-2xl font-medium text-center shadow-sm flex flex-col items-center justify-center gap-2">
              <ShieldCheck size={24} className="text-green-600" />
              <span>Visit Completed Successfully</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default VisitorPass;
