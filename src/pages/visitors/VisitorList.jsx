import React, { useState } from 'react';
import { useVisitors } from '../../context/VisitorContext';
import { useZones } from '../../context/ZoneContext';
import { useBranch } from '../../context/BranchContext';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, QrCode, X, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const VisitorList = () => {
  const { visitors, allVisitors, updateVisitorStatus, updateVisitorTracking, networkIp } = useVisitors();
  const { zones } = useZones();
  const { activeBranch } = useBranch();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitorQR, setSelectedVisitorQR] = useState(null);
  const [selectedVisitorHistory, setSelectedVisitorHistory] = useState(null);
  const [selectedVisitorUpdateZone, setSelectedVisitorUpdateZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-700';
      case 'Approved': return 'bg-blue-100 text-blue-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Inside': return 'bg-green-100 text-green-700';
      case 'Exited': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredVisitors = visitors.filter(v => 
    (v.visitorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isReturningVisitor = (visitor) => {
    if (!allVisitors || allVisitors.length === 0) return false;
    // Check if there is any visit for this profile that occurred BEFORE this specific visit
    return allVisitors.some(v => 
      v.profileId === visitor.profileId && 
      new Date(v.createdAt) < new Date(visitor.createdAt)
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitors Management</h1>
          <p className="text-gray-500 mt-1">Manage and track all visitors across zones.</p>
        </div>
        <button 
          onClick={() => navigate('/visitors/new')}
          className="bg-[var(--color-brand-indigo)] hover:bg-[var(--color-brand-indigo-light)] text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 font-medium transition-colors shadow-md"
        >
          <Plus size={20} />
          <span>Add Visitor</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search visitors or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-transparent outline-none text-sm"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
            <Filter size={18} />
            <span>Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px] w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Visitor</th>
                <th className="px-6 py-4 font-medium">Company</th>
                <th className="px-6 py-4 font-medium">Host</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Current Zone</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVisitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-[var(--color-brand-indigo)] flex items-center justify-center font-bold mr-3">
                        {(visitor.visitorName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{visitor.visitorName || 'Unknown'}</p>
                          {isReturningVisitor(visitor) ? (
                            <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Returning</span>
                          ) : (
                            <span className="text-[9px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">New</span>
                          )}
                        </div>
                        <div className="flex flex-col items-start mt-0.5 gap-1">
                          <p className="text-xs text-gray-500">{visitor.mobileNumber}</p>
                          {activeBranch === 'All Branches' && visitor.branch && (
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200 uppercase tracking-wider font-semibold shadow-sm">
                              📍 {visitor.branch}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{visitor.companyName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{visitor.hostName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{visitor.visitDate}</td>
                  <td className="px-6 py-4">
                    {visitor.status === 'Exited' ? (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200 flex items-center gap-1 w-max">
                        <span className="text-[10px]">🚪</span> Checked Out
                      </span>
                    ) : visitor.currentZone ? (
                      <span className="px-3 py-1 bg-indigo-100 text-[var(--color-brand-indigo)] rounded-full text-xs font-bold border border-indigo-200 flex items-center gap-1 w-max">
                        <span className="text-[10px]">📍</span> {visitor.currentZone}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(visitor.status)}`}>
                      {visitor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.nativeEvent.stopImmediatePropagation();
                          setOpenDropdownId(openDropdownId === visitor.id ? null : visitor.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {openDropdownId === visitor.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-50">
                          <div className="py-1">
                            <button onClick={() => { updateVisitorStatus(visitor.id, 'Inside'); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50">Mark as Inside</button>
                            <button onClick={() => { updateVisitorStatus(visitor.id, 'Exited'); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50">Mark as Exited</button>
                            <button onClick={() => { setSelectedVisitorUpdateZone(visitor); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium hover:bg-slate-50 border-t border-gray-100">Update Zone</button>
                            <button onClick={() => { updateVisitorStatus(visitor.id, 'Approved'); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-slate-50 border-t border-gray-100">Approve</button>
                            <button onClick={() => { updateVisitorStatus(visitor.id, 'Rejected'); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50">Reject</button>
                            {visitor.qrCode && (
                              <>
                                <button onClick={() => { setSelectedVisitorHistory(visitor); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 border-t border-gray-100">
                                  View Zone History
                                </button>
                                <button onClick={() => { setSelectedVisitorQR(visitor); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-slate-50">
                                  View QR Pass
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredVisitors.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No visitors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedVisitorQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <button 
              onClick={() => setSelectedVisitorQR(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-4 text-[var(--color-brand-indigo)] flex justify-center">
              <QrCode size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Visitor Pass</h2>
            <p className="text-gray-500 text-sm mb-6">Scan with any phone camera</p>
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm inline-block mb-6">
              <QRCodeSVG 
                value={`http://${networkIp}:${window.location.port ? window.location.port : ''}/pass/${selectedVisitorQR.visitId || selectedVisitorQR.id}`} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-2">
              <p className="font-bold text-[var(--color-brand-indigo)]">{selectedVisitorQR.visitorName}</p>
              <p className="text-sm text-indigo-700 font-mono mt-1">{selectedVisitorQR.visitId}</p>
            </div>
            <p className="text-xs text-gray-400">Status: {selectedVisitorQR.status}</p>
          </div>
        </div>
      )}

      {/* Zone History Modal */}
      {selectedVisitorHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedVisitorHistory(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-1">Zone Movement History</h2>
            <p className="text-gray-500 text-sm mb-6">Tracking log for {selectedVisitorHistory.visitorName} ({selectedVisitorHistory.visitId})</p>
            
            <div className="overflow-x-auto bg-slate-50 rounded-xl border border-gray-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Zone</th>
                    <th className="px-4 py-3 font-medium">Entry Time</th>
                    <th className="px-4 py-3 font-medium">Exit Time</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedVisitorHistory.zoneLogs && selectedVisitorHistory.zoneLogs.length > 0 ? (
                    selectedVisitorHistory.zoneLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{log.zoneName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.exitTime ? new Date(log.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-semibold">Active</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.durationMinutes !== undefined ? `${log.durationMinutes} min` : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                        No movement history recorded for this visitor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Checkout Notes Section */}
            {selectedVisitorHistory.remarks && selectedVisitorHistory.status === 'Exited' && (
              <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-orange-600" />
                  Visitor Checkout Notes
                </h3>
                <p className="text-sm text-orange-800 bg-white p-3 rounded border border-orange-100 whitespace-pre-wrap">
                  {selectedVisitorHistory.remarks}
                </p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedVisitorHistory(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Zone Modal */}
      {selectedVisitorUpdateZone && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden relative">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Update Visitor Zone</h3>
              <button 
                onClick={() => setSelectedVisitorUpdateZone(null)} 
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Visitor: <strong className="text-gray-900">{selectedVisitorUpdateZone.visitorName}</strong></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Zone</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-brand-indigo)] focus:border-transparent bg-white shadow-sm"
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                >
                  <option value="" disabled>▼ Select Zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.name}>▼ {zone.name}</option>
                  ))}
                  <option value="Exit" className="text-red-600 font-bold">▼ Exit (Check Out)</option>
                </select>
              </div>
              <button 
                onClick={() => {
                  if (selectedZone) {
                    if (selectedZone === 'Exit') {
                      updateVisitorStatus(selectedVisitorUpdateZone.id, 'Exited');
                    } else {
                      updateVisitorTracking(selectedVisitorUpdateZone.id, {
                        status: 'Inside',
                        currentZone: selectedZone
                      });
                    }
                    setSelectedVisitorUpdateZone(null);
                    setSelectedZone('');
                  } else {
                    addNotification('Action Required', 'Please select a zone first.', 'warning');
                  }
                }}
                className="w-full mt-4 bg-[var(--color-brand-indigo)] hover:bg-[var(--color-brand-indigo-light)] text-white font-medium py-3 rounded-lg shadow-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorList;
