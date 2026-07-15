import React, { useState, useEffect } from 'react';
import { UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const API_URL = `${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')}/api/visitors`;

const TodaysVisitorsCard = () => {
  const { user: currentUser } = useAuth();
  const { activeBranch } = useBranch();
  
  const [data, setData] = useState({ totalVisitorsToday: 0, teamBreakdown: [] });
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const queryBranch = currentUser && !['Super Admin'].includes(currentUser.role) 
    ? currentUser.branch 
    : activeBranch;

  const fetchData = async () => {
    try {
      let fetchUrl = `${API_URL}/todays-summary?date=${selectedDate}`;
      if (queryBranch && queryBranch !== 'All Branches') {
        fetchUrl += `&branchId=${encodeURIComponent(queryBranch)}`;
      }
      
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching todays visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [queryBranch, selectedDate]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mt-6">
      <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Visitor Count by Host</h2>
          <p className="text-xs text-gray-500 mt-1">{isToday ? "Today's Live Summary" : `Summary for ${selectedDate}`}</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
        />
      </div>

      <div className="px-6 py-4">
        {loading && data.teamBreakdown.length === 0 ? (
          <div className="text-center text-gray-400 py-6">Loading live data...</div>
        ) : data.teamBreakdown.length === 0 ? (
          <div className="text-center text-gray-500 py-6 font-medium">No visitors registered today.</div>
        ) : (
          <div className="space-y-4">
            {data.teamBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[var(--color-brand-indigo)] group-hover:bg-indigo-100 transition-colors">
                    <UserCheck size={14} />
                  </div>
                  <span className="text-gray-800 font-semibold text-sm">
                    {(item.hostName || item.team || 'Unknown').split('(')[0].trim()}
                  </span>
                </div>
                <div className="text-gray-600 font-medium text-sm">
                  <span className="text-base text-gray-900 font-bold mr-1">{item.count}</span>
                  <span className="text-xs">Visitors</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-[var(--color-brand-indigo)] text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-indigo-100">Total Visitors:</span>
          <span className="text-xl font-black">{loading ? '...' : data.totalVisitorsToday}</span>
        </div>
      </div>
    </div>
  );
};

export default TodaysVisitorsCard;
