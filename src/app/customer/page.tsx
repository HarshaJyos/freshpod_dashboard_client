'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import axiosInstance from '../../lib/axios';
import axios from 'axios';
import { 
  FiCpu, FiActivity, FiDollarSign, FiUsers, FiCalendar, FiUserPlus, FiUser, 
  FiTrash2, FiEdit2, FiPlus, FiX, FiCheckCircle, FiAlertCircle, FiSettings, FiZap
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Operator {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  assignedMachines?: any[];
}

export default function CustomerDashboard() {
  const { user, accessToken } = useAuth();
  const { machines, loading: dataLoading, refetch } = useData();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [customerMachines, setCustomerMachines] = useState<any[]>([]);

  // Modals
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Forms
  const [selectedMachineForSettings, setSelectedMachineForSettings] = useState<string | null>(null);
  const [selectedQRMachine, setSelectedQRMachine] = useState<any>(null);
  const [qrAmount, setQrAmount] = useState(49);
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [operatorForm, setOperatorForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    assignedMachineIds: [] as string[]
  });

  const [settingsForm, setSettingsForm] = useState({
    costPerTap: '',
    rentPerMonth: '',
    maintenanceCostPerMonth: ''
  });

  const qrAmountOptions = [49, 59, 69, 79, 89, 99, 109];

  // External QR OTA Service
  const qrService = useMemo(() => {
    return axios.create({
      baseURL: 'https://freshpod-ota-r3b9.onrender.com',
      timeout: 100000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get('/customer/dashboard', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching customer dashboard stats:', error);
    }
  };

  const fetchOperators = async () => {
    try {
      const response = await axiosInstance.get('/customer/operators', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setOperators(response.data.operators || []);
    } catch (error) {
      console.error('Error fetching operators:', error);
    }
  };

  const fetchCustomerMachines = async () => {
    try {
      const response = await axiosInstance.get('/customer/customer-machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setCustomerMachines(response.data.machines || []);
    } catch (error) {
      console.error('Error fetching customer machines list:', error);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchOperators(),
      fetchCustomerMachines()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, [accessToken]);

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorForm.phoneNumber || operatorForm.phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post('/customer/operator/create', operatorForm, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Operator created successfully!');
      setShowOperatorModal(false);
      setOperatorForm({ name: '', email: '', phoneNumber: '', assignedMachineIds: [] });
      fetchOperators();
      fetchCustomerMachines();
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create operator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOperator = async (operatorId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete operator "${name}"?`)) return;

    try {
      await axiosInstance.delete(`/customer/operator/${operatorId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Operator deleted successfully.');
      fetchOperators();
      fetchCustomerMachines();
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete operator.');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForSettings) return;

    setSubmitting(true);
    try {
      const promises = [];
      if (settingsForm.costPerTap) {
        promises.push(axiosInstance.put(`/customer/machine/${selectedMachineForSettings}/cost`, 
          { costPerTap: parseFloat(settingsForm.costPerTap) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ));
      }
      if (settingsForm.rentPerMonth) {
        promises.push(axiosInstance.put(`/customer/machine/${selectedMachineForSettings}/rent`, 
          { rentPerMonth: parseFloat(settingsForm.rentPerMonth) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ));
      }
      if (settingsForm.maintenanceCostPerMonth) {
        promises.push(axiosInstance.put(`/customer/machine/${selectedMachineForSettings}/maintenance`, 
          { maintenanceCostPerMonth: parseFloat(settingsForm.maintenanceCostPerMonth) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ));
      }

      await Promise.all(promises);
      toast.success('Machine settings updated successfully!');
      setShowSettingsModal(false);
      setSettingsForm({ costPerTap: '', rentPerMonth: '', maintenanceCostPerMonth: '' });
      refetch();
      fetchCustomerMachines();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQRUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQRMachine) {
      toast.error('Please select a kiosk unit.');
      return;
    }

    setQrSubmitting(true);
    const machineId = selectedQRMachine.machineId;
    const amountIndex = qrAmountOptions.indexOf(qrAmount);
    const qrValueToSend = amountIndex !== -1 ? amountIndex : 0;

    try {
      await qrService.put(
        `/api/machine/${machineId}/qr`,
        { qrValue: qrValueToSend },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(`QR updated successfully for machine ${machineId} to ₹${qrAmount} (Index: ${qrValueToSend})`);
      setShowQRModal(false);
      setSelectedQRMachine(null);
      refetch();
      fetchCustomerMachines();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update QR amount on OTA server.');
    } finally {
      setQrSubmitting(false);
    }
  };

  const toggleMachineSelection = (machineId: string) => {
    setOperatorForm(prev => ({
      ...prev,
      assignedMachineIds: prev.assignedMachineIds.includes(machineId)
        ? prev.assignedMachineIds.filter(id => id !== machineId)
        : [...prev.assignedMachineIds, machineId]
    }));
  };

  const openSettingsModal = (machine: any) => {
    setSelectedMachineForSettings(machine._id);
    setSettingsForm({
      costPerTap: machine.costPerTap || '',
      rentPerMonth: machine.rentPerMonth || '',
      maintenanceCostPerMonth: machine.maintenanceCostPerMonth || ''
    });
    setShowSettingsModal(true);
  };

  const openQRModal = (machine: any) => {
    setSelectedQRMachine(machine);
    setQrAmount(machine.qrAmount || 49);
    setShowQRModal(true);
  };

  const machinesArray = machines ? Object.values(machines) : [];
  const totalTaps = machinesArray.reduce((sum, m) => sum + (m.totalTaps || 0), 0);
  const totalRevenue = machinesArray.reduce((sum, m) => sum + (m.totalRevenue !== undefined ? m.totalRevenue : (m.totalTaps || 0) * (m.costPerTap || 70.00)), 0);

  if (loading || dataLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Fleet Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Audit assigned kiosks and manage operator staff credentials</p>
        </div>
        <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-medium shadow-sm">
          <FiCalendar /> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Kiosks</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{machinesArray.length}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Dispenser count</p>
          </div>
          <span className="p-3 rounded-xl bg-blue-50 text-blue-600 text-xl"><FiCpu /></span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Taps logs</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totalTaps.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Telemetry interactions</p>
          </div>
          <span className="p-3 rounded-xl bg-purple-50 text-purple-600 text-xl"><FiActivity /></span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Turnover Yield</p>
            <p className="text-2xl font-bold text-green-600 mt-1">₹{(totalRevenue).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Dispenser revenue</p>
          </div>
          <span className="p-3 rounded-xl bg-green-50 text-green-600 text-xl"><FiDollarSign /></span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Field Operators</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{operators.length}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Allocated staff profiles</p>
          </div>
          <span className="p-3 rounded-xl bg-orange-50 text-orange-600 text-xl"><FiUsers /></span>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiosks List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">Kiosks Telemetry Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-4 px-6">Kiosk Node</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Taps (Yield)</th>
                  <th className="py-4 px-6">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {machinesArray.map((m: any) => (
                  <tr key={m._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-800 font-mono">{m.machineId}</p>
                      <span className={`inline-flex px-2 py-0.5 mt-1 rounded text-[8px] font-bold uppercase ${
                        m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                      }`}>{m.status}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{m.location}</td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-gray-900">{m.totalTaps || 0} taps</p>
                      <p className="text-xs text-gray-400">₹{((m.totalRevenue !== undefined ? m.totalRevenue : (m.totalTaps || 0) * (m.costPerTap || 70.00))).toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openSettingsModal(m)}
                          className="px-2.5 py-1.5 border border-gray-100 hover:bg-gray-50 text-blue-600 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Settings
                        </button>
                        <button 
                          onClick={() => openQRModal(m)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          QR Config
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {machinesArray.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">No kiosks assigned to your account.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operators Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 text-sm sm:text-base">Field Operators</h3>
              <button 
                onClick={() => setShowOperatorModal(true)}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <FiPlus />
              </button>
            </div>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
              {operators.map((op) => (
                <div key={op._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="max-w-[70%]">
                    <p className="font-bold text-gray-800 truncate text-xs">{op.name}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{op.email}</p>
                    <p className="text-[10px] text-gray-400 truncate">{op.phoneNumber}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteOperator(op._id, op.name)}
                    className="p-2 border border-red-50 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
              {operators.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No operator staff registered</p>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 mt-6">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Operators can login using their phone numbers as initial passwords to report sanitization events and maintenance checks.
            </p>
          </div>
        </div>
      </div>

      {/* Operator Add Modal */}
      {showOperatorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiUserPlus /> Add Field Operator</h3>
              <button onClick={() => setShowOperatorModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreateOperator} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Operator Name *</label>
                <input type="text" required value={operatorForm.name} onChange={(e) => setOperatorForm({...operatorForm, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Email Address *</label>
                <input type="email" required value={operatorForm.email} onChange={(e) => setOperatorForm({...operatorForm, email: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">10-Digit Mobile Number *</label>
                <input type="tel" required pattern="[0-9]{10}" value={operatorForm.phoneNumber} onChange={(e) => setOperatorForm({...operatorForm, phoneNumber: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="99000 99000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign Kiosks (Click to Allocate)</label>
                <div className="border border-gray-200 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {customerMachines.map((m) => {
                    const isChecked = operatorForm.assignedMachineIds.includes(m._id);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => toggleMachineSelection(m._id)}
                        className={`p-2 rounded-lg text-left text-xs border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isChecked ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <FiCpu size={12} />
                        {m.machineId}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowOperatorModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">{submitting ? 'Adding...' : 'Create Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiSettings /> Kiosk Configurations</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleUpdateSettings} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Price per Tap (₹)</label>
                <input type="number" step="0.01" value={settingsForm.costPerTap} onChange={(e) => setSettingsForm({...settingsForm, costPerTap: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Monthly Rent (₹)</label>
                <input type="number" value={settingsForm.rentPerMonth} onChange={(e) => setSettingsForm({...settingsForm, rentPerMonth: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Monthly Maintenance Fee (₹)</label>
                <input type="number" value={settingsForm.maintenanceCostPerMonth} onChange={(e) => setSettingsForm({...settingsForm, maintenanceCostPerMonth: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowSettingsModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">Update Kiosk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && selectedQRMachine && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiZap /> OTA QR Price Config ({selectedQRMachine.machineId})</h3>
              <button onClick={() => setShowQRModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleQRUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Select Display Value (₹)</label>
                <div className="grid grid-cols-4 gap-2">
                  {qrAmountOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQrAmount(opt)}
                      className={`p-2 border rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        qrAmount === opt 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      ₹{opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowQRModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" disabled={qrSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">{qrSubmitting ? 'Syncing...' : 'Sync to Dispenser'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
