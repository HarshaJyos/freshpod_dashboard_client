'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import axiosInstance from '../../lib/axios';
import { useResizableColumns } from '../../hooks/useResizableColumns';
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

  // Columns: S.No (0), Kiosk Node (1), Location (2), Taps (3), Settings (4)
  const { widths, startResize } = useResizableColumns([60, 150, 220, 160, 160]);
  const [rowPadding, setRowPadding] = useState('py-2');

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

  // NOTE: QR amount updates go to our own backend, not an external OTA service.

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
      // Call own backend — not an external OTA server
      await axiosInstance.put(
        `/api/machine/${machineId}/qr`,
        { qrValue: qrValueToSend },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(`QR updated for machine ${machineId} to ₹${qrAmount} (Index: ${qrValueToSend}). ESP32 will receive config update via MQTT.`);
      setShowQRModal(false);
      setSelectedQRMachine(null);
      refetch();
      fetchCustomerMachines();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update QR amount.');
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
  // Use real MongoDB payment revenue from dashboard stats (not tap estimation)
  const totalRevenue = dashboardStats?.totalRevenueMonth ?? machinesArray.reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Customer Fleet Overview</h1>
          <p className="text-xs text-gray-500 mt-1">Audit assigned kiosks and manage operator staff credentials</p>
        </div>
        <div className="bg-white border border-gray-200 px-3 py-1.5 rounded text-xs flex items-center gap-2 font-medium">
          <FiCalendar /> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards - Flat PowerBI Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Kiosks", val: machinesArray.length, sub: "Dispenser count", icon: <FiCpu /> },
          { label: "Total Taps Logs", val: totalTaps.toLocaleString(), sub: "Telemetry cycles", icon: <FiActivity /> },
          { label: "Turnover Yield", val: `₹${totalRevenue.toLocaleString()}`, sub: "Dispenser revenue", icon: <FiDollarSign /> },
          { label: "Field Operators", val: operators.length, sub: "Allocated staff profiles", icon: <FiUsers /> }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{item.val}</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{item.sub}</p>
            </div>
            <span className="text-gray-400 text-lg">{item.icon}</span>
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiosks List in Spreadsheet Format */}
        <div className="lg:col-span-2 bg-white border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Kiosks Telemetry Status</h3>
            <select
              value={rowPadding}
              onChange={(e) => setRowPadding(e.target.value)}
              className="bg-white border border-gray-200 px-2 py-1 rounded text-[10px] focus:outline-none cursor-pointer font-semibold text-gray-600 shadow-sm"
              title="Row Height"
            >
              <option value="py-1">Compact Height</option>
              <option value="py-2.5">Standard Height</option>
              <option value="py-4">Tall Height</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[650px]">
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
                    Kiosk Node
                    <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 relative">
                    Location
                    <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                    Taps (Yield)
                    <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 text-center relative">
                    Settings
                    <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {machinesArray.map((m: any, index: number) => (
                  <tr key={m._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                      {index + 1}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 whitespace-normal break-words select-text`}>
                      <p className="font-bold text-gray-800 font-mono">{m.machineId}</p>
                      <span className={`inline-flex px-1.5 py-0.5 mt-1 rounded text-[8px] font-bold uppercase ${
                        m.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>{m.status}</span>
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-gray-600 whitespace-normal break-words select-text`}>
                      {m.location}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-right whitespace-normal break-words select-text`}>
                      <p className="font-semibold text-gray-900 font-mono">{m.totalTaps || 0} taps</p>
                      <p className="text-[10px] text-gray-400 font-mono">₹{((m.totalRevenue !== undefined ? m.totalRevenue : (m.totalTaps || 0) * (m.costPerTap || 70.00))).toLocaleString()}</p>
                    </td>
                    <td className={`${rowPadding} px-4 text-center whitespace-normal break-words select-text`}>
                      <div className="flex gap-1.5 justify-center">
                        <button 
                          onClick={() => openSettingsModal(m)}
                          className="px-2 py-1 border border-gray-200 hover:bg-gray-50 text-blue-600 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Settings
                        </button>
                        <button 
                          onClick={() => openQRModal(m)}
                          className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 rounded text-[10px] font-bold cursor-pointer"
                        >
                          QR Config
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {machinesArray.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">No kiosks assigned to your account.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operators Panel - Flat PowerBI Style */}
        <div className="bg-white border border-gray-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Field Operators</h3>
              <button 
                onClick={() => setShowOperatorModal(true)}
                className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <FiPlus size={12} />
              </button>
            </div>
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {operators.map((op) => (
                <div key={op._id} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200">
                  <div className="max-w-[70%]">
                    <p className="font-bold text-gray-800 truncate text-xs">{op.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5">{op.email}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{op.phoneNumber}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteOperator(op._id, op.name)}
                    className="p-1.5 border border-red-200 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))}
              {operators.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-8">No operator staff registered</p>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200 mt-4">
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
