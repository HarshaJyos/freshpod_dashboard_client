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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Assigned Fleet Nodes</h1>
        <p className="text-gray-500 text-xs mt-1">Audit local kiosk hardware clusters under your supervision</p>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[35%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-4 border-r border-gray-200">Machine ID</th>
                <th className="py-2.5 px-4 border-r border-gray-200">Location</th>
                <th className="py-2.5 px-4 border-r border-gray-200 text-right">Today's Cycles</th>
                <th className="py-2.5 px-4 text-right">Cost / Cycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {machines.length > 0 ? (
                machines.map((machine) => (
                  <tr key={machine._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className="py-2.5 px-4 border-r border-gray-200 font-mono font-bold text-gray-900 flex items-center gap-1.5">
                      <FiShield className="text-blue-500 text-xs" /> {machine.machineId}
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-gray-600">
                      {machine.location}
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono font-medium">
                      {machine.todaysCycles || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-blue-600 font-semibold">
                      ₹{machine.costPerCycle || machine.costPerTap || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    <FiShield className="text-3xl text-gray-300 mx-auto mb-2" />
                    <p className="text-xs">No hardware kiosks assigned to your operator account.</p>
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
