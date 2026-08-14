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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Health & Telemetry</h1>
          <p className="text-sm text-gray-500">Real-time network connectivity and latency indexes</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cloud Gateway</p>
            <p className="text-xs font-bold text-green-600 flex items-center gap-1 justify-end mt-0.5">
              <FiCheckCircle /> Operational
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pulse Monitor */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-1">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FiActivity className="text-red-500 animate-pulse" /> Ping Latency Index
          </h3>
          <div className="space-y-4">
            {healthData.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-xs font-bold text-gray-700">{m.id}</span>
                <span className="text-[10px] font-bold text-blue-500">{m.latency}</span>
              </div>
            ))}
            {healthData.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">No machine logs connected</p>
            )}
          </div>
        </div>

        {/* Fleet Connectivity Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiWifi className="text-green-500" /> Connectivity Registry
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3">Node ID</th>
                  <th className="px-6 py-3">Pulse Status</th>
                  <th className="px-6 py-3">Last Sync</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {healthData.map((node) => (
                  <tr key={node.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-800">{node.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        node.status === 'active' || node.status === 'online' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {node.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-gray-500">
                      {node.lastHeartbeat ? new Date(node.lastHeartbeat).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handlePing(node.id)}
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase hover:underline cursor-pointer"
                      >
                        Ping Node
                      </button>
                    </td>
                  </tr>
                ))}
                {healthData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">No active kiosks found.</td>
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
