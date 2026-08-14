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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Helmet Disinfection Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name || 'Operator'}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
            <FiShield /> Manage and monitor local physical helmet hygiene disinfection
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl shadow-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <FiRefreshCw /> Refresh status
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Kiosks</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalMachines}</p>
            <p className="text-[10px] text-green-600 font-semibold mt-1">{stats.activeMachines} active status</p>
          </div>
          <span className="p-3 rounded-xl bg-blue-50 text-blue-600 text-xl"><FiShield /></span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Cycles Completed Today</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalCyclesToday}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Disinfections logged</p>
          </div>
          <span className="p-3 rounded-xl bg-green-50 text-green-600 text-xl"><FiZap /></span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider font-mono">Today's Revenue</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₹{stats.totalRevenueToday}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Kiosk checkouts</p>
          </div>
          <span className="p-3 rounded-xl bg-purple-50 text-purple-600 text-xl"><FiDollarSign /></span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Utilization Rate</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats.totalMachines > 0 ? Math.round((stats.activeMachines / stats.totalMachines) * 100) : 0}%
            </p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Operational yield</p>
          </div>
          <span className="p-3 rounded-xl bg-orange-50 text-orange-600 text-xl"><FiTrendingUp /></span>
        </div>
      </div>

      {/* Grid of machines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {machines.map((machine) => {
          const isRunning = activeSessions[machine._id]?.running;
          const startTime = activeSessions[machine._id]?.startTime;
          const progress = startTime ? getProgressPercentage(startTime) : 0;
          const countdownEnd = countdowns[machine._id];

          return (
            <div 
              key={machine._id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between p-5 ${
                isRunning ? 'border-green-300 shadow-lg shadow-green-50' : 'border-gray-100 shadow-sm'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base font-mono flex items-center gap-1.5">
                      <FiShield className={isRunning ? 'text-green-500' : 'text-gray-400'} /> {machine.machineId}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <FiMapPin /> {machine.location}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    isRunning ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {isRunning ? 'Disinfecting' : 'Ready'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold">Cycles Today</p>
                    <p className="text-base font-bold text-gray-800 mt-0.5">{machine.todaysCycles || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold">Cost / Cycle</p>
                    <p className="text-base font-bold text-blue-600 mt-0.5">₹{machine.costPerCycle || 0}</p>
                  </div>
                </div>

                {isRunning && countdownEnd && (
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 mb-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Remaining Time</span>
                      <span className="text-base font-mono font-bold">{formatCountdown(countdownEnd)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5 mt-3">
                      <div className="bg-white rounded-full h-1.5 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                {isRunning ? (
                  <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <FiCheckCircle /> Disinfection Running...
                  </button>
                ) : (
                  <button 
                    onClick={() => { setSelectedMachine(machine); setShowStartModal(true); }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FiPlay /> Start Disinfection
                  </button>
                )}
                
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-[9px] text-gray-400 font-semibold">
                  <FiClock />
                  <span>Last Cycle: {machine.lastActive ? new Date(machine.lastActive).toLocaleString() : 'Never'}</span>
                </div>
              </div>
            </div>
          );
        })}

        {machines.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100">
            <FiShield className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No kiosks assigned to your operator account.</p>
          </div>
        )}
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
