'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
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
  const [rowPadding, setRowPadding] = useState('py-2'); // row padding config

  // S.No, Machine ID, Location, Today's Cycles, Cost/Cycle
  const { widths, startResize } = useResizableColumns([60, 160, 260, 130, 130]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Assigned Fleet Nodes</h1>
          <p className="text-gray-500 text-xs mt-1">Audit local kiosk hardware clusters under your supervision</p>
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

      {/* Spreadsheet Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
            <colgroup>
              {widths.map((w, i) => (
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
                  Machine ID
                  <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2.5 px-4 border-r border-gray-200 relative">
                  Location
                  <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                  Today's Cycles
                  <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2.5 px-4 text-right relative">
                  Cost / Cycle
                  <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {machines.length > 0 ? (
                machines.map((machine, index) => (
                  <tr key={machine._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                      {index + 1}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono font-bold text-gray-900 flex items-center gap-1.5 whitespace-normal break-words select-text`}>
                      <FiShield className="text-blue-500 text-xs shrink-0" /> {machine.machineId}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-gray-600 whitespace-normal break-words select-text`}>
                      {machine.location}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-medium whitespace-normal break-words select-text`}>
                      {machine.todaysCycles || 0}
                    </td>
                    <td className={`${rowPadding} px-4 text-right font-mono text-blue-600 font-semibold whitespace-normal break-words select-text`}>
                      ₹{machine.costPerCycle || machine.costPerTap || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
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
