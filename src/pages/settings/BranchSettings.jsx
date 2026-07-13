import React, { useState, useEffect } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useNotification } from '../../context/NotificationContext';
import { Save, MapPin, Clock, Shield } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/branch-settings`;

const BranchSettings = () => {
  const { branches } = useBranch();
  const { addNotification } = useNotification();
  
  const [selectedBranch, setSelectedBranch] = useState(branches[0] || '');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    radius: 50,
    checkInStart: '08:30',
    checkInEnd: '09:30',
    checkOutTime: '20:00'
  });

  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'All Branches') {
      fetchBranchSettings(selectedBranch);
    }
  }, [selectedBranch]);

  const fetchBranchSettings = async (branchName) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${encodeURIComponent(branchName)}`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          radius: data.radius || 50,
          checkInStart: data.checkInStart || '08:30',
          checkInEnd: data.checkInEnd || '09:30',
          checkOutTime: data.checkOutTime || '20:00'
        });
      } else {
        // If not found, reset to defaults
        setFormData({
          latitude: '',
          longitude: '',
          radius: 50,
          checkInStart: '08:30',
          checkInEnd: '09:30',
          checkOutTime: '20:00'
        });
      }
    } catch (err) {
      console.error('Error fetching branch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedBranch || selectedBranch === 'All Branches') {
      addNotification('Error', 'Please select a valid branch', 'error');
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: selectedBranch,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseInt(formData.radius, 10),
          checkInStart: formData.checkInStart,
          checkInEnd: formData.checkInEnd,
          checkOutTime: formData.checkOutTime
        })
      });

      if (res.ok) {
        addNotification('Success', 'Branch settings saved successfully', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      addNotification('Error', err.message, 'error');
    }
  };

  const filteredBranches = branches.filter(b => b !== 'All Branches');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="text-[var(--color-brand-indigo)]" />
          Branch Security Settings
        </h1>
        <p className="text-gray-500 mt-1">Configure GPS locations and attendance time windows for each branch.</p>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-slate-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch to Configure</label>
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
          >
            {filteredBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-8">
            {/* Location Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-blue-500" />
                GPS Location Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    required
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="e.g., 12.5269722"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    required
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="e.g., 78.2025000"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Radius (meters)</label>
                  <input
                    type="number"
                    name="radius"
                    required
                    value={formData.radius}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Security guards must be within the allowed radius of these coordinates to check in.</p>
            </div>

            {/* Time Settings */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Clock size={20} className="text-orange-500" />
                Attendance Time Windows
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-In Opens</label>
                  <input
                    type="time"
                    name="checkInStart"
                    required
                    value={formData.checkInStart}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-In Closes</label>
                  <input
                    type="time"
                    name="checkInEnd"
                    required
                    value={formData.checkInEnd}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto Check-Out Time</label>
                  <input
                    type="time"
                    name="checkOutTime"
                    required
                    value={formData.checkOutTime}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-indigo)]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">The check-in button will be disabled outside of the allowed Check-In window. Users who forget to check out will be auto checked-out at the specified time.</p>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-[var(--color-brand-indigo)] hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Save size={18} />
                Save Settings
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BranchSettings;
