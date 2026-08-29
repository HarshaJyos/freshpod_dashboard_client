'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { useData } from '../../../context/DataContext';
import { 
  FiCpu, FiMapPin, FiEdit2, FiSave, FiX, FiEye, 
  FiAlertCircle, FiInfo, FiRefreshCw
} from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface MachineData {
  _id: string;
  machineId: string;
  qrId?: string;
  location: string;
  state?: string;
  status: string;
  costPerTap: number;
  rentPerMonth?: number;
  maintenanceCostPerMonth?: number;
  monthlyTaps?: number;
  totalTaps?: number;
  monthlyRevenue?: number;
  totalRevenue?: number;
  monthlyExpenses?: number;
  monthlyNetProfit?: number;
  totalNetProfit?: number;
  monthlyProfitMargin?: number;
}

export default function CustomerMachines() {
  const { accessToken } = useAuth();
  const { machines, loading: dataLoading, refetch } = useData();
  const [loading, setLoading] = useState(true);
  const [machineList, setMachineList] = useState<MachineData[]>([]);
  const [editingField, setEditingField] = useState<{ machineId: string | null; field: string | null }>({ machineId: null, field: null });
  const [editValue, setEditValue] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchMachines = async () => {
    try {
      const response = await axiosInstance.get('/customer/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const processed: MachineData[] = response.data.map((machine: any) => {
        const monthlyRevenue = machine.monthlyRevenue !== undefined ? machine.monthlyRevenue : (machine.monthlyTaps || 0) * (machine.costPerTap || 0);
        const totalRevenue = machine.totalRevenue !== undefined ? machine.totalRevenue : (machine.totalTaps || 0) * (machine.costPerTap || 0);
        
        const monthlyExpenses = (machine.rentPerMonth || 0) + (machine.maintenanceCostPerMonth || 0);
        const monthlyNetProfit = monthlyRevenue - monthlyExpenses;
        const totalNetProfit = totalRevenue - monthlyExpenses;
        
        const monthlyProfitMargin = monthlyRevenue > 0 ? (monthlyNetProfit / monthlyRevenue) * 100 : 0;
        
        return {
          ...machine,
          monthlyRevenue,
          totalRevenue,
          monthlyExpenses,
          monthlyNetProfit,
          totalNetProfit,
          monthlyProfitMargin
        };
      });
      
      setMachineList(processed);
    } catch (error) {
      console.error('Failed to fetch customer machines details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchMachines();
    }
  }, [accessToken, machines]);

  const handleSaveField = async (machineId: string, field: string, value: string) => {
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue < 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setUpdating(true);
    try {
      let endpoint = '';
      let payload = {};
      
      switch(field) {
        case 'costPerTap':
          endpoint = `/customer/machine/${machineId}/cost`;
          payload = { costPerTap: parsedValue };
          break;
        case 'rentPerMonth':
          endpoint = `/customer/machine/${machineId}/rent`;
          payload = { rentPerMonth: parsedValue };
          break;
        case 'maintenanceCostPerMonth':
          endpoint = `/customer/machine/${machineId}/maintenance`;
          payload = { maintenanceCostPerMonth: parsedValue };
          break;
        default:
          endpoint = `/customer/machine/${machineId}/settings`;
          payload = { [field]: parsedValue };
      }
      
      await axiosInstance.put(endpoint, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      toast.success('Machine configuration updated successfully!');
      setEditingField({ machineId: null, field: null });
      fetchMachines();
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update machine field.');
    } finally {
      setUpdating(false);
    }
  };

  const startEditing = (machineId: string, field: string, currentValue: number) => {
    setEditingField({ machineId, field });
    setEditValue(currentValue.toString());
  };

  if (loading || dataLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  const totalMonthlyRevenue = machineList.reduce((acc, m) => acc + (m.monthlyRevenue || 0), 0);
  const totalMonthlyExpenses = machineList.reduce((acc, m) => acc + (m.rentPerMonth || 0) + (m.maintenanceCostPerMonth || 0), 0);
  const totalNetProfit = totalMonthlyRevenue - totalMonthlyExpenses;

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kiosk Inventory Statement</h1>
          <p className="text-gray-500 text-sm mt-1">Audit rentals, maintenance overheads, break-evens, and profits</p>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fleet Revenue</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">₹{totalMonthlyRevenue.toLocaleString()}</h3>
          </div>
          <span className="p-3 rounded-xl bg-blue-50 text-blue-600 text-xl font-bold">₹</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Overhead Expenses</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">₹{totalMonthlyExpenses.toLocaleString()}</h3>
          </div>
          <span className="p-3 rounded-xl bg-red-50 text-red-600 text-xl font-bold">₹</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Net Fleet Profit</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{totalNetProfit.toLocaleString()}
            </h3>
          </div>
          <span className={`p-3 rounded-xl text-xl font-bold ${totalNetProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>₹</span>
        </div>
      </div>

      {/* Table responsive layout */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[180px] sm:w-[220px]" />
              <col className="w-[200px] sm:w-[240px]" />
              <col className="w-[120px]" />
              <col className="w-[150px]" />
              <col className="w-[180px]" />
              <col className="w-[180px]" />
              <col className="w-[160px]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 border-r border-b border-gray-200 font-bold">Node ID</th>
                <th className="py-3 px-4 border-r border-b border-gray-200 font-bold">Location</th>
                <th className="py-3 px-4 border-r border-b border-gray-200 font-bold text-center">Status</th>
                <th className="py-3 px-4 border-r border-b border-gray-200 font-bold">Price/Tap</th>
                <th className="py-3 px-4 border-r border-b border-gray-200 font-bold">Maint/Month</th>
                <th className="py-3 px-4 border-r border-b border-gray-200 font-bold">Rent/Month</th>
                <th className="py-3 px-4 border-b border-gray-200 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {machineList.length > 0 ? (
                machineList.map((machine) => {
                  return (
                    <tr key={machine._id} className="hover:bg-gray-50/40 transition-colors border-b border-gray-200 last:border-b-0">
                      {/* Node ID */}
                      <td className="py-3 px-4 border-r border-gray-200 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                            <FiCpu size={14} />
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate font-mono text-sm">{machine.machineId}</span>
                            <span className="text-[10px] text-gray-400 font-mono tracking-wider block truncate">REF: {machine.qrId || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 border-r border-gray-200 align-middle">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-gray-400 shrink-0" size={14} />
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-800 block truncate text-sm">{machine.location}</span>
                            <span className="text-xs text-gray-400 block truncate">{machine.state || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 border-r border-gray-200 align-middle text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          machine.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                          'bg-yellow-50 text-yellow-700 border border-yellow-200/50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            machine.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                          }`}></span>
                          {machine.status}
                        </span>
                      </td>

                      {/* Price/Tap */}
                      <td className="py-3 px-4 border-r border-gray-200 align-middle">
                        {editingField.machineId === machine._id && editingField.field === 'costPerTap' ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)} 
                              className="w-16 px-1 py-0.5 border rounded text-xs text-center focus:outline-none" 
                              step="0.1" 
                              min="0.1"
                              disabled={updating}
                            />
                            <button onClick={() => handleSaveField(machine._id, 'costPerTap', editValue)} className="text-green-600 cursor-pointer" disabled={updating}>
                              <FiSave size={12} />
                            </button>
                            <button onClick={() => setEditingField({ machineId: null, field: null })} className="text-red-600 cursor-pointer">
                              <FiX size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono font-bold text-gray-900 text-sm">
                            <FaRupeeSign size={11} className="text-gray-400" />
                            <span>{machine.costPerTap.toFixed(2)}</span>
                            <button onClick={() => startEditing(machine._id, 'costPerTap', machine.costPerTap)} className="text-gray-400 hover:text-blue-600 cursor-pointer">
                              <FiEdit2 size={10} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Maint/Month */}
                      <td className="py-3 px-4 border-r border-gray-200 align-middle">
                        {editingField.machineId === machine._id && editingField.field === 'maintenanceCostPerMonth' ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)} 
                              className="w-20 px-1 py-0.5 border rounded text-xs text-center focus:outline-none" 
                              step="100" 
                              min="0"
                              disabled={updating}
                            />
                            <button onClick={() => handleSaveField(machine._id, 'maintenanceCostPerMonth', editValue)} className="text-green-600 cursor-pointer" disabled={updating}>
                              <FiSave size={12} />
                            </button>
                            <button onClick={() => setEditingField({ machineId: null, field: null })} className="text-red-600 cursor-pointer">
                              <FiX size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono font-bold text-gray-900 text-sm">
                            <FaRupeeSign size={11} className="text-gray-400" />
                            <span>{(machine.maintenanceCostPerMonth || 0).toFixed(2)}</span>
                            <button onClick={() => startEditing(machine._id, 'maintenanceCostPerMonth', machine.maintenanceCostPerMonth || 0)} className="text-gray-400 hover:text-blue-600 cursor-pointer">
                              <FiEdit2 size={10} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Rent/Month */}
                      <td className="py-3 px-4 border-r border-gray-200 align-middle">
                        {editingField.machineId === machine._id && editingField.field === 'rentPerMonth' ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)} 
                              className="w-20 px-1 py-0.5 border rounded text-xs text-center focus:outline-none" 
                              step="100" 
                              min="0"
                              disabled={updating}
                            />
                            <button onClick={() => handleSaveField(machine._id, 'rentPerMonth', editValue)} className="text-green-600 cursor-pointer" disabled={updating}>
                              <FiSave size={12} />
                            </button>
                            <button onClick={() => setEditingField({ machineId: null, field: null })} className="text-red-600 cursor-pointer">
                              <FiX size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono font-bold text-gray-900 text-sm">
                            <FaRupeeSign size={11} className="text-gray-400" />
                            <span>{(machine.rentPerMonth || 0).toFixed(2)}</span>
                            <button onClick={() => startEditing(machine._id, 'rentPerMonth', machine.rentPerMonth || 0)} className="text-gray-400 hover:text-blue-600 cursor-pointer">
                              <FiEdit2 size={10} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-middle text-center">
                        <button 
                          onClick={() => setSelectedMachine(machine)} 
                          className="w-full py-1.5 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-300 text-blue-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <FiEye size={13} />
                          <span>Statement</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs italic">
                    No telemetry kiosks registered under your client profile.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Financial Statement Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiCpu /> Financial statement: {selectedMachine.machineId}</h3>
              <button onClick={() => setSelectedMachine(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Node location</p>
                  <p className="font-semibold text-gray-700 mt-1">{selectedMachine.location}, {selectedMachine.state}</p>
                  {selectedMachine.qrId && <p className="text-[10px] text-gray-400 font-mono mt-1 font-semibold">QR Ref: {selectedMachine.qrId}</p>}
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Lifetime Taps logged</p>
                  <p className="font-semibold text-gray-700 mt-1">{(selectedMachine.totalTaps || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Monthly P&L Statement */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-2.5">
                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2 text-center">Monthly Profit & Loss</h4>
                <div className="flex justify-between text-sm pb-2 border-b border-gray-100">
                  <span className="text-gray-600">Dispenser Revenue (Taps × Price)</span>
                  <span className="font-bold text-green-600">₹{((selectedMachine.monthlyTaps || 0) * selectedMachine.costPerTap).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-gray-500">
                  <span>- Monthly Rental Rent</span>
                  <span className="text-red-500">₹{(selectedMachine.rentPerMonth || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-gray-500">
                  <span>- Maintenance Charge</span>
                  <span className="text-red-500">₹{(selectedMachine.maintenanceCostPerMonth || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t-2 border-gray-200 font-bold">
                  <span className="text-gray-800">Net Profit</span>
                  <span className={((selectedMachine.monthlyTaps || 0) * selectedMachine.costPerTap - (selectedMachine.rentPerMonth || 0) - (selectedMachine.maintenanceCostPerMonth || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ₹{((selectedMachine.monthlyTaps || 0) * selectedMachine.costPerTap - (selectedMachine.rentPerMonth || 0) - (selectedMachine.maintenanceCostPerMonth || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-blue-50 rounded-xl p-4 flex gap-3 text-xs text-blue-800">
                <FiInfo className="text-blue-500 text-lg shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Dispenser Break-even analysis</p>
                  <p>• Rental and maintenance overhead demands: <strong>{Math.ceil(((selectedMachine.rentPerMonth || 0) + (selectedMachine.maintenanceCostPerMonth || 0)) / selectedMachine.costPerTap)} taps/month</strong>.</p>
                  <p>• Current monthly taps: {selectedMachine.monthlyTaps || 0} taps.</p>
                  <p>• Daily Target: {Math.ceil(((selectedMachine.rentPerMonth || 0) + (selectedMachine.maintenanceCostPerMonth || 0)) / selectedMachine.costPerTap / 30)} taps/day.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
