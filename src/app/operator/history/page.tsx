'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
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

  const [rowPadding, setRowPadding] = useState('py-2'); // row padding config

  // Columns: S.No (0), Logged Date (1), Synced Time (2), Cycles Completed (3), Cycle Revenue (4), Status (5)
  const { widths, startResize } = useResizableColumns([60, 160, 180, 130, 130, 120]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Disinfection Logs History</h1>
          <p className="text-gray-500 text-xs mt-1">Audit cycles completed, duration logs, and revenue metrics per node</p>
        </div>
        <div>
          <select
            value={rowPadding}
            onChange={(e) => setRowPadding(e.target.value)}
            className="bg-white border border-gray-200 px-2.5 py-1.5 rounded text-xs focus:outline-none cursor-pointer font-semibold text-gray-600 shadow-sm"
            title="Row Height"
          >
            <option value="py-1">Compact Height</option>
            <option value="py-2.5">Standard Height</option>
            <option value="py-4">Tall Height</option>
          </select>
        </div>
      </div>

      {/* Machine Selector - Flat PowerBI Style */}
      {machines.length > 0 && (
        <div className="mb-4 bg-white p-3 border border-gray-200 max-w-xs">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Select supervising Node</label>
          <select
            value={selectedMachine || ''}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white font-semibold text-gray-700 cursor-pointer"
          >
            {machines.map((machine) => (
              <option key={machine._id} value={machine._id}>
                {machine.machineId} ({machine.location})
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
        <div className="bg-white border border-gray-200 p-12 text-center">
          <FiClock className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-xs">No disinfection cycles recorded on this node.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <colgroup>
                {widths.map((w: number, i: number) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-4 border-r border-gray-200 relative">
                    S.No
                    <div onMouseDown={(e) => startResize(0, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 relative">
                    Logged Date
                    <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 relative">
                    Synced Time
                    <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                    Cycles Completed
                    <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                    Cycle Revenue
                    <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 text-center relative">
                    Status
                    <div onMouseDown={(e) => startResize(5, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                      {idx + 1}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono font-bold text-gray-800 whitespace-normal break-words select-text`}>{record.date}</td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-gray-500 font-mono text-[11px] whitespace-normal break-words select-text`}>
                      {record.time ? new Date(record.time).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-semibold text-gray-900 whitespace-normal break-words select-text`}>{record.cycles}</td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono text-gray-900 whitespace-normal break-words select-text`}>₹{(record.revenue || 0).toFixed(2)}</td>
                    <td className={`${rowPadding} px-4 text-center whitespace-normal break-words select-text`}>
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        record.status === 'completed' || record.action === 'completed'
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : record.status === 'failed' || record.action === 'failed'
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
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
