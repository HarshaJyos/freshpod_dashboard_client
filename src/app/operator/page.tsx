'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../lib/axios';
import { 
  FiShield, FiDollarSign, FiPlay, FiMapPin, FiRefreshCw, FiCheckCircle, FiZap, FiTrendingUp, FiX, FiClock
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Machine {
  _id: string;
  machineId: string;
  location: string;
  todaysCycles?: number;
  costPerCycle?: number;
  lastActive?: string;
}

interface Stats {
  totalMachines: number;
  activeMachines: number;
  totalCyclesToday: number;
  totalRevenueToday: number;
}

interface Session {
  running: boolean;
  cycles: number;
  startTime: number;
}

export default function OperatorDashboard() {
  const { user, accessToken } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalMachines: 0,
    activeMachines: 0,
    totalCyclesToday: 0,
    totalRevenueToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Record<string, Session>>({});
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  const CYCLE_DURATION_SECONDS = 330;

  const fetchData = async () => {
    try {
      const machinesRes = await axiosInstance.get('/operator/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMachines(machinesRes.data || []);
      
      const statsRes = await axiosInstance.get('/operator/dashboard', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStats(statsRes.data || {
        totalMachines: 0,
        activeMachines: 0,
        totalCyclesToday: 0,
        totalRevenueToday: 0
      });
    } catch (error) {
      console.error('Error fetching operator dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const updatedCountdowns: Record<string, number> = {};
      
      Object.keys(countdowns).forEach(machineId => {
        const endTime = countdowns[machineId];
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        if (remaining > 0) {
          updatedCountdowns[machineId] = endTime;
        } else {
          handleAutoComplete(machineId);
        }
      });
      
      setCountdowns(updatedCountdowns);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [countdowns, machines, activeSessions]);

  const handleAutoComplete = async (machineId: string) => {
    const machine = machines.find(m => m._id === machineId);
    if (machine && activeSessions[machineId]?.running) {
      toast.success(`Disinfection cycle completed automatically for ${machine.machineId}!`);
      
      setActiveSessions(prev => {
        const newState = { ...prev };
        delete newState[machineId];
        return newState;
      });
      
      fetchData();
    }
  };

  const handleStartCycle = async () => {
    if (!selectedMachine) return;
    
    setActionInProgress(true);
    try {
      const response = await axiosInstance.post('/operator/machine/start', 
        { machineId: selectedMachine._id },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (response.data.success) {
        const startTime = Date.now();
        const endTime = startTime + (CYCLE_DURATION_SECONDS * 1000);
        
        toast.success(`Disinfection cycle started on machine ${selectedMachine.machineId}!`);
        setShowStartModal(false);
        
        setActiveSessions(prev => ({
          ...prev,
          [selectedMachine._id]: { 
            running: true, 
            cycles: 0,
            startTime: startTime
          }
        }));
        
        setCountdowns(prev => ({
          ...prev,
          [selectedMachine._id]: endTime
        }));
        
        fetchData();
      } else {
        toast.error(response.data.message || 'Failed to start disinfection.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to start disinfection cycle.');
    } finally {
      setActionInProgress(false);
      setSelectedMachine(null);
    }
  };

  const formatCountdown = (endTime: number) => {
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (startTime: number) => {
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min(100, (elapsed / CYCLE_DURATION_SECONDS) * 100);
    return Math.max(0, progress);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Kiosk Disinfection Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">Operator: {user?.name || 'Staff'}</p>
        </div>
        <button 
          onClick={fetchData}
          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FiRefreshCw className="text-[10px]" /> Refresh Status
        </button>
      </div>

      {/* Stats Cards - Flat PowerBI Style */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Kiosks", val: stats.totalMachines, sub: `${stats.activeMachines} Active`, icon: <FiShield /> },
          { label: "Cycles Today", val: stats.totalCyclesToday, sub: "Completed runs", icon: <FiZap /> },
          { label: "Today's Revenue", val: `₹${stats.totalRevenueToday}`, sub: "Kiosk collections", icon: <FiDollarSign /> },
          { label: "Utilization Rate", val: `${stats.totalMachines > 0 ? Math.round((stats.activeMachines / stats.totalMachines) * 100) : 0}%`, sub: "Operational yield", icon: <FiTrendingUp /> }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{item.val}</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{item.sub}</p>
            </div>
            <span className="text-gray-400 text-lg">{item.icon}</span>
          </div>
        ))}
      </div>

      {/* Grid of machines in Spreadsheet format */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <FiShield className="text-gray-500" /> Kiosk Network Operations
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-4 border-r border-gray-200">Machine ID</th>
                <th className="py-2.5 px-4 border-r border-gray-200">Location</th>
                <th className="py-2.5 px-4 border-r border-gray-200 text-center">Status</th>
                <th className="py-2.5 px-4 border-r border-gray-200 text-right">Cycles Today</th>
                <th className="py-2.5 px-4 border-r border-gray-200 text-right">Cost / Cycle</th>
                <th className="py-2.5 px-4 border-r border-gray-200">Last Active</th>
                <th className="py-2.5 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {machines.length > 0 ? (
                machines.map((machine) => {
                  const isRunning = activeSessions[machine._id]?.running;
                  const startTime = activeSessions[machine._id]?.startTime;
                  const progress = startTime ? getProgressPercentage(startTime) : 0;
                  const countdownEnd = countdowns[machine._id];

                  return (
                    <tr key={machine._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                      <td className="py-2.5 px-4 border-r border-gray-200 font-mono font-bold text-gray-900">
                        {machine.machineId}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-gray-600">
                        {machine.location}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                          isRunning ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {isRunning ? 'Disinfecting' : 'Ready'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono font-medium">
                        {machine.todaysCycles || 0}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono text-blue-600 font-semibold">
                        ₹{machine.costPerCycle || 0}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-gray-500 font-mono text-[10px]">
                        {machine.lastActive ? new Date(machine.lastActive).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-2.5 px-4">
                        {isRunning ? (
                          <div className="space-y-1">
                            <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                              <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-green-700">
                              <span>DISINFECTING</span>
                              <span>{countdownEnd ? formatCountdown(countdownEnd) : ''}</span>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setSelectedMachine(machine); setShowStartModal(true); }}
                            className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <FiPlay className="text-[9px]" /> Start Disinfect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <FiShield className="text-3xl text-gray-300 mx-auto mb-2" />
                    <p className="text-xs">No kiosks assigned to your operator account.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start Modal */}
      {showStartModal && selectedMachine && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-950 flex items-center gap-1.5"><FiPlay /> Start Disinfection</h3>
              <button onClick={() => setShowStartModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 font-medium">Starting hygiene cycle on node: <strong>{selectedMachine.machineId}</strong></p>
              
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 space-y-1">
                <p className="font-bold">⏱️ Estimated duration: ~5.5 minutes</p>
                <p>Cycle logs will be synced directly to the dashboard when complete.</p>
              </div>

              <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-800 space-y-1">
                <p className="font-bold">⚠️ Pre-start Checklist:</p>
                <p>• Ensure helmet is securely placed inside dispenser chamber.</p>
                <p>• Confirm the disinfection door is closed securely.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowStartModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="button" onClick={handleStartCycle} disabled={actionInProgress} className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold cursor-pointer">
                  {actionInProgress ? 'Starting...' : 'Confirm Start'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
