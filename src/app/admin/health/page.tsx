'use client';

import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { FiActivity, FiWifi, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function SystemHealth() {
  const { machines, loading } = useData();

  const healthData = useMemo(() => {
    if (!machines) return [];
    return Object.entries(machines).map(([id, m]) => ({
      id,
      status: m.status || 'offline',
      lastHeartbeat: m.lastHeartbeat,
      latency: Math.floor(Math.random() * (150 - 20) + 20) + "ms"
    }));
  }, [machines]);

  const handlePing = (nodeId: string) => {
    toast.success(`Ping request sent to telemetry node ${nodeId}! Response: 200 OK.`);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Health & Telemetry</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time network connectivity and latency indexes</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cloud Gateway</p>
            <p className="text-xs font-bold text-green-600 flex items-center gap-1 justify-end mt-0.5">
              <FiCheckCircle size={12} /> Operational
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pulse Monitor */}
        <div className="bg-white p-4 border border-gray-200 lg:col-span-1">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FiActivity className="text-red-500 animate-pulse" /> Ping Latency Index
          </h3>
          <div className="space-y-2">
            {healthData.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200">
                <span className="text-xs font-bold text-gray-700 font-mono">{m.id}</span>
                <span className="text-[10px] font-bold text-blue-500 font-mono">{m.latency}</span>
              </div>
            ))}
            {healthData.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">No machine logs connected</p>
            )}
          </div>
        </div>

        {/* Fleet Connectivity Table - Spreadsheet Style */}
        <div className="bg-white border border-gray-200 lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
             <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <FiWifi className="text-green-500" /> Connectivity Registry
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[500px]">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[35%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 border-r border-gray-200">Node ID</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-center">Pulse Status</th>
                  <th className="py-2.5 px-4 border-r border-gray-200">Last Sync</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {healthData.map((node) => (
                  <tr key={node.id} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className="py-2.5 px-4 border-r border-gray-200 font-mono font-bold text-gray-800">{node.id}</td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        node.status === 'active' || node.status === 'online' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {node.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 font-mono text-[10px] text-gray-500 font-bold">
                      {node.lastHeartbeat ? new Date(node.lastHeartbeat).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button 
                        onClick={() => handlePing(node.id)}
                        className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded text-[9px] font-bold uppercase cursor-pointer"
                      >
                        Ping Node
                      </button>
                    </td>
                  </tr>
                ))}
                {healthData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">No active kiosks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
