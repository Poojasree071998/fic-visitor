import React, { useState } from 'react';
import { useVisitors } from '../../context/VisitorContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, Clock, Search, Filter } from 'lucide-react';
import ApprovalModal from '../../components/approvals/ApprovalModal';

const ApprovalList = () => {
  const { allVisitors, updateVisitorStatus } = useVisitors();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState('Approve'); // 'Approve' | 'Reject'
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': 
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><Clock size={12}/> Pending</span>;
      case 'Approved': 
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><CheckCircle size={12}/> Approved</span>;
      case 'Rejected': 
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><XCircle size={12}/> Rejected</span>;
      case 'Inside': 
        return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><CheckCircle size={12}/> Inside</span>;
      case 'Exited': 
        return <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><CheckCircle size={12}/> Exited</span>;
      default: 
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold w-max">{status}</span>;
    }
  };

  // Show all visitors but prioritize Pending ones at the top for action
  const approvalPipelineVisitors = allVisitors
    .filter(v => 
      v.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.hostName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      // Secondary sort by date (newest first)
      return new Date(b.createdAt || b.visitDate) - new Date(a.createdAt || a.visitDate);
    });

  const openModal = (visitor, action) => {
    setSelectedVisitor(visitor);
    setModalAction(action);
    setIsModalOpen(true);
  };

  const handleConfirmAction = (remarks) => {
    if (selectedVisitor) {
      const newStatus = modalAction === 'Approve' ? 'Approved' : 'Rejected';
      updateVisitorStatus(selectedVisitor.id, newStatus, {
        remarks,
        approvedBy: user?.name || 'System Admin'
      });
    }
    setIsModalOpen(false);
    setSelectedVisitor(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Approvals</h1>
          <p className="text-gray-500 mt-1">Review and manage pending visitor requests.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by visitor or host name..."
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Visitor</th>
                <th className="px-6 py-4 font-medium">Host</th>
                <th className="px-6 py-4 font-medium">Purpose & Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                {user?.role !== 'HR' && <th className="px-6 py-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvalPipelineVisitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{visitor.visitorName}</p>
                    <p className="text-xs text-gray-500">{visitor.companyName}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{visitor.hostName}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{visitor.purpose}</p>
                    <p className="text-xs text-gray-500">{visitor.visitDate}</p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(visitor.status)}
                    {visitor.approvedBy && (
                      <p className="text-[10px] text-gray-400 mt-1">by {visitor.approvedBy}</p>
                    )}
                  </td>
                  {user?.role !== 'HR' && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        
                        {['Pending', 'Hold'].includes(visitor.status) && (
                          <>
                            <button 
                              onClick={() => openModal(visitor, 'Approve')}
                              className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => openModal(visitor, 'Hold')}
                              className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors"
                            >
                              Hold
                            </button>
                            <button 
                              onClick={() => openModal(visitor, 'Reject')}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              {approvalPipelineVisitors.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No approval requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ApprovalModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAction}
        actionType={modalAction}
        visitorName={selectedVisitor?.visitorName || ''}
      />
    </div>
  );
};

export default ApprovalList;
