'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { FiClock, FiShield } from 'react-icons/fi';

interface OperatorMachine {
  _id: string;
  machineId: string;
  location: string;
}

interface HistoryRecord {
  date: string;
  time?: string;
  cycles: number;
  revenue?: number;
  status?: string;
  action?: string;
}

export default function OperatorHistory() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [machines, setMachines] = useState<OperatorMachine[]>([]);

  const fetchMachines = async () => {
    try {
      const response = await axiosInstance.get('/operator/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = response.data || [];
      setMachines(data);
      if (data.length > 0) {
        setSelectedMachine(data[0]._id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching machines for history filter:', error);
      setLoading(false);
    }
  };

  const fetchHistory = async (machineId: string) => {
    if (!machineId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/operator/machine/${machineId}/history`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching machine cycle history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [accessToken]);

  useEffect(() => {
    if (selectedMachine) {
      fetchHistory(selectedMachine);
    }
  }, [selectedMachine]);

  if (loading && machines.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Disinfection Logs History</h1>
        <p className="text-gray-500 text-sm mt-1">Audit cycles completed, duration logs, and revenue metrics per node</p>
      </div>

      {/* Machine Selector */}
      {machines.length > 0 && (
        <div className="mb-6 bg-white p-4 border border-gray-100 shadow-sm rounded-2xl max-w-md">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select supervising Node</label>
          <select
            value={selectedMachine || ''}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-100 bg-white font-semibold text-gray-700 cursor-pointer"
          >
            {machines.map((machine) => (
              <option key={machine._id} value={machine._id}>
                {machine.machineId} - {machine.location}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table Card */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-500"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <FiClock className="text-4xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No disinfection cycles recorded on this node.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="px-6 py-4">Logged Date</th>
                  <th className="px-6 py-4">Synced Time</th>
                  <th className="px-6 py-4">Cycles Completed</th>
                  <th className="px-6 py-4">Cycle Revenue</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{record.date}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-semibold">
                      {record.time ? new Date(record.time).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">{record.cycles}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">₹{(record.revenue || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        record.status === 'completed' || record.action === 'completed'
                          ? 'bg-green-50 text-green-700' 
                          : record.status === 'failed' || record.action === 'failed'
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {record.status || record.action || 'running'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
