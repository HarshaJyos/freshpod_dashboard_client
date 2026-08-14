'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { FiShield, FiMapPin, FiCpu } from 'react-icons/fi';

interface OperatorMachine {
  _id: string;
  machineId: string;
  location: string;
  todaysCycles?: number;
  costPerCycle?: number;
  costPerTap?: number;
}

export default function OperatorMachines() {
  const { accessToken } = useAuth();
  const [machines, setMachines] = useState<OperatorMachine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMachines = async () => {
    try {
      const response = await axiosInstance.get('/operator/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMachines(response.data || []);
    } catch (error) {
      console.error('Error fetching operator machines list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [accessToken]);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assigned Fleet Nodes</h1>
        <p className="text-gray-500 text-sm mt-1">Audit local kiosk hardware clusters under your supervision</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map((machine) => (
          <div key={machine._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiShield className="text-blue-600 text-lg shrink-0" />
                <h3 className="font-bold text-gray-900 font-mono text-base">{machine.machineId}</h3>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                <FiMapPin size={12} className="text-gray-400" /> {machine.location}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50 text-xs">
              <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100/50">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Today's Cycles</p>
                <p className="font-bold text-gray-800 text-sm mt-0.5">{machine.todaysCycles || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100/50">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Cost / Cycle</p>
                <p className="font-bold text-blue-600 text-sm mt-0.5">₹{machine.costPerCycle || machine.costPerTap || 0}</p>
              </div>
            </div>
          </div>
        ))}

        {machines.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100">
            <FiShield className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No hardware kiosks assigned to your operator account.</p>
          </div>
        )}
      </div>
    </div>
  );
}
