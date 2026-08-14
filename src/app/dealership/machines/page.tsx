'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { FiSearch, FiCheckCircle, FiClock, FiCpu } from 'react-icons/fi';

interface Machine {
  _id: string;
  machineId: string;
  qrId?: string;
  location: string;
  machineCost?: number;
  assignedTo?: string;
  createdAt: string;
  status: string;
}

export default function DealershipMachines() {
  const { accessToken } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMachines = async () => {
    try {
      const response = await axiosInstance.get('/dealership/machines', { 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      setMachines(response.data.machines || []);
    } catch (error) { 
      console.error('Error fetching dealership machines:', error); 
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchMachines(); 
  }, [accessToken]);

  const filteredMachines = machines.filter(m => 
    m.machineId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kiosk Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Audit assigned inventory stocks and distribution allocations</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by ID or Location..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none" 
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">Machine ID</th>
                <th className="px-6 py-4">QR Reference</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Dealer Cost</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMachines.length > 0 ? (
                filteredMachines.map(m => (
                  <tr key={m._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800 font-mono text-sm flex items-center gap-1.5 mt-1.5">
                      <FiCpu className="text-blue-500" /> {m.machineId}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{m.qrId || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{m.location}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">₹{(m.machineCost || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        m.assignedTo ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {m.assignedTo ? <FiCheckCircle size={10} /> : <FiClock size={10} />}
                        {m.assignedTo ? 'Sold (Allocated)' : 'Available Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No kiosks in inventory matching searches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
