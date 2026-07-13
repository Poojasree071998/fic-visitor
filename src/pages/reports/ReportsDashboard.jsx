import React, { useState } from 'react';
import { useVisitors } from '../../context/VisitorContext';
import { useZones } from '../../context/ZoneContext';
import { useBlacklist } from '../../context/BlacklistContext';
import { Download, FileText, FileSpreadsheet, ShieldCheck, Map, Building2, Users, Clock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { calculateTimeSpent } from '../../utils/timeUtils';

const ReportsDashboard = () => {
  const { allVisitors } = useVisitors();
  const { zones } = useZones();
  const { blacklisted } = useBlacklist();
  
  const { user } = useAuth();
  
  // Apply Strict Branch Filtering
  // If the user is assigned to a specific branch, they should ONLY see that branch's data, regardless of their role.
  const filteredVisitors = user?.branch && user.branch !== 'All' && user.branch !== 'All Branches'
    ? allVisitors.filter(v => v.branch === user.branch)
    : allVisitors;

  const [activeTab, setActiveTab] = useState('visitor');

  // User-Friendly Excel (.xls) Exporter
  const exportExcel = (data, filename) => {
    if (!data || !data.length) return alert("No data to export!");
    const headers = Object.keys(data[0]);
    
    // Create an HTML table with basic styling that Excel can interpret perfectly
    let tableHTML = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
    tableHTML += '<head><meta charset="UTF-8"></head><body>';
    tableHTML += '<table border="1" style="font-family: Arial, sans-serif;">';
    
    // Header Row with Brand Colors
    tableHTML += '<tr>' + headers.map(h => `<th style="background-color:#1E1B6E; color:white; font-weight:bold; padding:10px;">${h}</th>`).join('') + '</tr>';
    
    // Data Rows
    data.forEach(row => {
      tableHTML += '<tr>' + headers.map(h => {
        const val = row[h] !== null && row[h] !== undefined ? row[h] : '';
        return `<td style="padding:5px;">${val}</td>`;
      }).join('') + '</tr>';
    });
    
    tableHTML += '</table></body></html>';
    
    // Create a Blob with the Excel MIME type
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    // Use .xls extension to force it to open in Excel instead of Notepad
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print(); // Simple browser print implementation for PDF
  };

  // 1. Visitor Report Data
  const visitorReportData = filteredVisitors.map(v => {
    const isCheckedOut = ['Exited', 'Completed'].includes(v.status);
    const displayExitTime = isCheckedOut ? (v.exitTime || 'N/A') : 'N/A';

    return {
      "Visitor": v.visitorName,
      "Branch": v.branch,
      "Purpose": v.purpose,
      "Entry": v.entryTime || 'N/A',
      "Exit": displayExitTime,
      "Time Spent": calculateTimeSpent(v.visitDate, v.entryTime, v.exitTime, v.status),
      "Status": v.status
    };
  });

  // Zone Report Data removed per request

  // 3. Branch Report Data
  const uniqueBranches = [...new Set(filteredVisitors.map(v => v.branch).filter(Boolean))];
  const branchReportData = uniqueBranches.map(branch => {
    const branchVisitors = filteredVisitors.filter(v => v.branch === branch);
    const todayStr = new Date().toISOString().split('T')[0];
    const visitorsToday = branchVisitors.filter(v => v.visitDate === todayStr).length;
    const inside = branchVisitors.filter(v => v.status === 'Inside').length;
    const completed = branchVisitors.filter(v => ['Completed', 'Exited'].includes(v.status)).length;

    return {
      "Branch": branch,
      "Visitors Today": visitorsToday,
      "Inside": inside,
      "Completed": completed
    };
  });

  const renderTable = (data) => {
    if (!data.length) return <p className="text-gray-500 py-8 text-center">No records found for this report.</p>;
    
    const headers = Object.keys(data[0]);
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-gray-500 text-xs uppercase tracking-wider">
              {headers.map(h => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                {headers.map(h => <td key={`${i}-${h}`} className="px-6 py-4 text-sm text-gray-700">{row[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'visitor': return visitorReportData;
      case 'branch': return branchReportData;
      default: return [];
    }
  };

  // Security Report Aggregates
  const totalVisitors = filteredVisitors.length;
  // Let's assume 'Approved' includes anything that progressed past Pending
  const approvedVisitors = filteredVisitors.filter(v => ['Approved', 'Inside', 'Exited', 'Completed'].includes(v.status)).length;
  const rejectedVisitors = filteredVisitors.filter(v => v.status === 'Rejected').length;
  const insideVisitors = filteredVisitors.filter(v => v.status === 'Inside').length;
  const checkedOutVisitors = filteredVisitors.filter(v => ['Exited', 'Completed'].includes(v.status)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print-friendly">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
          <p className="text-gray-500 mt-1">Generate and export data across all modules.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => exportExcel(activeTab === 'security' ? [
              { "Total Visitors": totalVisitors, "Approved": approvedVisitors, "Rejected": rejectedVisitors, "Inside": insideVisitors, "Checked Out": checkedOutVisitors }
            ] : getActiveData(), `${activeTab}_report`)}
            className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 font-medium rounded-lg transition-colors flex items-center space-x-2 border border-green-200"
          >
            <FileSpreadsheet size={18} />
            <span>Export Excel</span>
          </button>
          <button 
            onClick={exportPDF}
            className="px-4 py-2 bg-[var(--color-brand-indigo)] text-white hover:bg-[var(--color-brand-indigo-light)] font-medium rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Download size={18} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto print:hidden">
          <button 
            onClick={() => setActiveTab('visitor')}
            className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === 'visitor' ? 'border-[var(--color-brand-indigo)] text-[var(--color-brand-indigo)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Users size={16}/> Visitor Report
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === 'security' ? 'border-[var(--color-brand-indigo)] text-[var(--color-brand-indigo)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck size={16}/> Security Report
          </button>
          <button 
            onClick={() => setActiveTab('branch')}
            className={`px-6 py-4 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === 'branch' ? 'border-[var(--color-brand-indigo)] text-[var(--color-brand-indigo)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 size={16}/> Branch Report
          </button>
        </div>

        {/* Report Content */}
        {activeTab === 'security' && (
          <div className="p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-gray-900 mb-2">{totalVisitors}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Visitors</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-green-600 mb-2">{approvedVisitors}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Approved</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-red-600 mb-2">{rejectedVisitors}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Rejected</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-[var(--color-brand-indigo)] mb-2">{insideVisitors}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Inside</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-gray-700 mb-2">{checkedOutVisitors}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Checked Out</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branch' && (
          <div className="p-0">
            {renderTable(branchReportData)}
          </div>
        )}

        {activeTab === 'visitor' && (
          <div className="p-0">
            {renderTable(visitorReportData)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
