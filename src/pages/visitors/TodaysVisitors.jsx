import React, { useState, useEffect } from 'react';
import { Users, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

const API_URL = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/visitors`;

const TodaysVisitors = () => {
  const { user: currentUser } = useAuth();
  const { activeBranch } = useBranch();
  
  const [data, setData] = useState({ totalVisitorsToday: 0, teamBreakdown: [] });
  const [loading, setLoading] = useState(true);

  // Determine which branch to query based on user role
  const queryBranch = currentUser && !['Super Admin'].includes(currentUser.role) 
    ? currentUser.branch 
    : activeBranch;

  const fetchData = async () => {
    try {
      let fetchUrl = `${API_URL}/todays-summary`;
      if (queryBranch && queryBranch !== 'All Branches') {
        fetchUrl += `?branchId=${encodeURIComponent(queryBranch)}`;
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
    // Auto refresh every 5 seconds to show real-time count
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [queryBranch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Visitors</h1>
          <p className="text-gray-500 mt-1">Live tracking of visitors registered today</p>
        </div>
      </div>

      <div className="bg-[var(--color-brand-indigo)] rounded-xl p-5 text-white shadow-md flex items-center justify-between">
        <div>
          <p className="text-indigo-100 text-sm font-medium mb-1">Total Visitors Today</p>
          <h2 className="text-3xl font-extrabold flex items-center gap-3">
            <Users size={28} className="text-indigo-300 opacity-80" />
            {loading ? '...' : data.totalVisitorsToday}
          </h2>
        </div>
        <div className="hidden sm:block">
          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-xs font-semibold">
            Registered Today
          </div>
        </div>
      </div>

      {loading && data.teamBreakdown.length === 0 ? (
        <div className="flex justify-center p-12 text-gray-400">Loading live data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {data.teamBreakdown.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              No visitors have been registered yet today.
            </div>
          ) : (
            data.teamBreakdown.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-[var(--color-brand-indigo)] flex items-center justify-center font-bold text-lg">
                    {item.hostName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {item.count}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{item.hostName}</h3>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <UserCheck size={14} /> Registered Visitors
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TodaysVisitors;
