'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { 
  FiCpu, FiMapPin, FiPlus, FiEye, 
  FiEdit2, FiTrash2, FiRefreshCw, FiUser, FiActivity,
  FiCheckCircle, FiX, FiSearch, FiFilter
} from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface Machine {
  _id: string;
  machineId: string;
  qrId?: string;
  location: string;
  state?: string;
  country?: string;
  costPerTap: number;
  machineCost?: number;
  status: string;
  assignedTo?: any;
  dealership?: any;
  operatorId?: any;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedMachines?: any[];
}

export default function MachineManagement() {
  const { accessToken } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Selection
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    machineId: '',
    qrId: '',
    location: '',
    state: '',
    country: 'India',
    costPerTap: 70.00,
    machineCost: 50000,
    status: 'active',
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const machinesResponse = await axiosInstance.get('/admin/machine/data', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMachines(Array.isArray(machinesResponse.data) ? machinesResponse.data : []);

      const usersResponse = await axiosInstance.get('/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUsers(usersResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching machine page data:', error);
      toast.error('Failed to load fleet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/admin/machine', formData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.status === 201 || response.status === 200) {
        toast.success('Machine created successfully!');
        setShowCreateModal(false);
        fetchData();
        resetForm();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create machine.');
    }
  };

  const handleUpdateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    
    try {
      const response = await axiosInstance.put(`/admin/machine/${selectedMachine._id}`, formData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.status === 200) {
        toast.success('Machine updated successfully!');
        setShowEditModal(false);
        fetchData();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update machine.');
    }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machine? This action is irreversible.')) return;
    
    try {
      const response = await axiosInstance.delete(`/admin/machine/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.status === 200 || response.status === 204) {
        toast.success('Machine deleted successfully!');
        fetchData();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete machine.');
    }
  };

  const handleAssignMachine = async () => {
    if (!selectedMachine || !selectedUser) return;
    
    try {
      const currentMachineIds = selectedUser.assignedMachines?.map(m => m._id || m) || [];
      const newMachineIds = [...currentMachineIds, selectedMachine._id];

      const response = await axiosInstance.put(
        `/admin/user/${selectedUser._id}`,
        { assignedMachineIds: newMachineIds },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.status === 200) {
        toast.success(`Machine successfully assigned to ${selectedUser.name}!`);
        setShowAssignModal(false);
        setSelectedMachine(null);
        setSelectedUser(null);
        fetchData();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to assign machine.');
    }
  };

  const handleUnassignMachine = async (machineId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this machine assignment?')) return;

    try {
      const targetUser = users.find(u => u._id === userId);
      if (!targetUser) return;
      const currentMachineIds = targetUser.assignedMachines?.map(m => m._id || m) || [];
      const newMachineIds = currentMachineIds.filter(id => id !== machineId);

      const response = await axiosInstance.put(
        `/admin/user/${userId}`,
        { assignedMachineIds: newMachineIds },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.status === 200) {
        toast.success('Machine unassigned successfully!');
        fetchData();
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to unassign machine.');
    }
  };

  const resetForm = () => {
    setFormData({
      machineId: '',
      qrId: '',
      location: '',
      state: '',
      country: 'India',
      costPerTap: 70.00,
      machineCost: 50000,
      status: 'active',
      razorpayKeyId: '',
      razorpayKeySecret: ''
    });
  };

  const openEditModal = (machine: Machine) => {
    setSelectedMachine(machine);
    setFormData({
      machineId: machine.machineId,
      qrId: machine.qrId || '',
      location: machine.location,
      state: machine.state || '',
      country: machine.country || 'India',
      costPerTap: machine.costPerTap,
      machineCost: machine.machineCost || 50000,
      status: machine.status || 'active',
      razorpayKeyId: machine.razorpayKeyId || '',
      razorpayKeySecret: machine.razorpayKeySecret || ''
    });
    setShowEditModal(true);
  };

  const getAssignedCustomer = (machine: Machine) => {
    if (!machine.assignedTo) return null;
    const customerId = typeof machine.assignedTo === 'object' ? machine.assignedTo.id : machine.assignedTo;
    return users.find(u => u._id === customerId) || (typeof machine.assignedTo === 'object' ? machine.assignedTo : null);
  };

  const getDealership = (machine: Machine) => {
    if (!machine.dealership) return null;
    const dealershipId = typeof machine.dealership === 'object' ? machine.dealership.id : machine.dealership;
    return users.find(u => u._id === dealershipId) || (typeof machine.dealership === 'object' ? machine.dealership : null);
  };

  const getOperator = (machine: Machine) => {
    if (!machine.operatorId) return null;
    const opId = typeof machine.operatorId === 'object' ? machine.operatorId.id : machine.operatorId;
    return users.find(u => u._id === opId) || (typeof machine.operatorId === 'object' ? machine.operatorId : null);
  };

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.machineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          machine.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || machine.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Machine Fleet Registry</h1>
          <p className="text-xs text-gray-500 mt-1">Configure telemetry nodes, payment configs, and tenant allocations</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FiPlus size={12} /> Add Machine
        </button>
      </div>

      {/* Control Bar - Flat PowerBI Style */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><FiSearch size={14} /></span>
          <input
            type="text"
            placeholder="Search by ID or Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-gray-400 text-xs font-semibold"><FiFilter className="inline mr-1" /> Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-200 px-2.5 py-1.5 rounded text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Table responsive layout - High density spreadsheet */}
      <div className="bg-white border border-gray-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[180px] sm:w-[220px]" />
              <col className="w-[200px] sm:w-[240px]" />
              <col className="w-[120px]" />
              <col className="w-[240px] sm:w-[280px]" />
              <col className="w-[130px]" />
              <col className="w-[150px]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 border-r border-b border-gray-200 font-bold">Node ID</th>
                <th className="py-2.5 px-4 border-r border-b border-gray-200 font-bold">Location</th>
                <th className="py-2.5 px-4 border-r border-b border-gray-200 font-bold text-right">Cost Per Tap</th>
                <th className="py-2.5 px-4 border-r border-b border-gray-200 font-bold">Allocations</th>
                <th className="py-2.5 px-4 border-r border-b border-gray-200 font-bold text-center">Status</th>
                <th className="py-2.5 px-4 border-b border-gray-200 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-700">
              {filteredMachines.length > 0 ? (
                filteredMachines.map((m) => {
                  const customer = getAssignedCustomer(m);
                  const dealer = getDealership(m);
                  const operator = getOperator(m);
                  return (
                    <tr key={m._id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-200 last:border-b-0">
                      {/* Node ID */}
                      <td className="py-2.5 px-4 border-r border-gray-200 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-blue-50 text-blue-600 shrink-0">
                            <FiCpu size={12} />
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate font-mono">{m.machineId}</span>
                            <span className="text-[9px] text-gray-400 font-mono tracking-wider block truncate">REF: {m.qrId || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-2.5 px-4 border-r border-gray-200 align-middle text-xs">
                        <div className="flex items-center gap-1.5">
                          <FiMapPin className="text-gray-400 shrink-0" size={12} />
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-800 block truncate">{m.location}</span>
                            <span className="text-[10px] text-gray-400 block truncate">{m.state || 'N/A'}, {m.country}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cost per Tap */}
                      <td className="py-2.5 px-4 border-r border-gray-200 align-middle text-right font-mono font-bold text-gray-900">
                        <span>₹{m.costPerTap.toFixed(2)}</span>
                      </td>

                      {/* Allocations nested grid with sheet style cells */}
                      <td className="p-0 border-r border-gray-200 align-stretch">
                        <div className="flex flex-col h-full text-[10px] font-mono select-none">
                          <div className="flex items-center border-b border-gray-200 py-1.5 px-3 bg-gray-50/20 gap-2">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider w-16 shrink-0">Dealer</span>
                            <span className="text-gray-400 font-bold shrink-0">:</span>
                            <span className={`font-semibold truncate max-w-[150px] text-left ${dealer ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                              {dealer ? dealer.name : 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center border-b border-gray-200 py-1.5 px-3 bg-white gap-2">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider w-16 shrink-0">Customer</span>
                            <span className="text-gray-400 font-bold shrink-0">:</span>
                            <span className={`font-semibold truncate max-w-[150px] text-left ${customer ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                              {customer ? customer.name : 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center py-1.5 px-3 bg-gray-50/20 gap-2">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider w-16 shrink-0">Operator</span>
                            <span className="text-gray-400 font-bold shrink-0">:</span>
                            <span className={`font-semibold truncate max-w-[150px] text-left ${operator ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                              {operator ? operator.name : 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 border-r border-gray-200 align-middle text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          m.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                          m.status === 'idle' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            m.status === 'active' ? 'bg-green-500 animate-pulse' :
                            m.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></span>
                          {m.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setSelectedMachine(m); setShowDetailsModal(true); }}
                            className="p-1 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <FiEye size={12} />
                          </button>
                          <button
                            onClick={() => openEditModal(m)}
                            className="p-1 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded transition-colors cursor-pointer"
                            title="Settings"
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteMachine(m._id)}
                            className="p-1 border border-red-200 hover:bg-red-50 text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete Machine"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-xs italic">
                    No telemetry kiosks registered matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiCpu /> Add Telemetry Machine</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreateMachine} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Machine Node ID *</label>
                  <input type="text" required value={formData.machineId} onChange={(e) => setFormData({...formData, machineId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. MAC_001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location *</label>
                  <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. Bangalore Hub" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State / Province</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. Karnataka" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cost per Tap (₹) *</label>
                  <input type="number" step="0.01" required value={formData.costPerTap} onChange={(e) => setFormData({...formData, costPerTap: parseFloat(e.target.value) || 0})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Machine Cost (₹) *</label>
                  <input type="number" required value={formData.machineCost} onChange={(e) => setFormData({...formData, machineCost: parseInt(e.target.value) || 0})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Key ID</label>
                  <input type="text" value={formData.razorpayKeyId} onChange={(e) => setFormData({...formData, razorpayKeyId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="rzp_test_..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Secret</label>
                  <input type="password" value={formData.razorpayKeySecret} onChange={(e) => setFormData({...formData, razorpayKeySecret: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OTA QR Reference ID</label>
                <input type="text" value={formData.qrId} onChange={(e) => setFormData({...formData, qrId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. QR_12345" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer">
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">Save Kiosk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMachine && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiEdit2 /> Edit Kiosk {selectedMachine.machineId}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleUpdateMachine} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location *</label>
                <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cost per Tap (₹) *</label>
                  <input type="number" step="0.01" required value={formData.costPerTap} onChange={(e) => setFormData({...formData, costPerTap: parseFloat(e.target.value) || 0})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer">
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Key ID</label>
                  <input type="text" value={formData.razorpayKeyId} onChange={(e) => setFormData({...formData, razorpayKeyId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Secret</label>
                  <input type="password" value={formData.razorpayKeySecret} onChange={(e) => setFormData({...formData, razorpayKeySecret: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OTA QR Reference ID</label>
                <input type="text" value={formData.qrId} onChange={(e) => setFormData({...formData, qrId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. QR_12345" />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">Update Node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedMachine && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiCpu /> Machine details: {selectedMachine.machineId}</h3>
              <button onClick={() => { setSelectedMachine(null); setShowDetailsModal(false); }} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider mb-1">Status</span>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${
                    selectedMachine.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                  }`}>{selectedMachine.status}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider mb-1">Taps Price</span>
                  <span className="font-bold text-gray-800">₹{selectedMachine.costPerTap} / tap</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Node Location:</span>
                  <span className="font-semibold text-gray-800">{selectedMachine.location}, {selectedMachine.state || 'N/A'}, {selectedMachine.country}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Capital Cost:</span>
                  <span className="font-semibold text-gray-800">₹{(selectedMachine.machineCost || 50000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Merchant Gateway Key ID:</span>
                  <span className="font-semibold text-gray-800 font-mono text-xs">{selectedMachine.razorpayKeyId ? `${selectedMachine.razorpayKeyId.slice(0, 10)}...` : 'Using Default'}</span>
                </div>
                {selectedMachine.qrId && (
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-400">OTA QR Reference ID:</span>
                    <span className="font-semibold text-gray-800 font-mono text-xs">{selectedMachine.qrId}</span>
                  </div>
                )}
              </div>

              {/* Assignment logic */}
              <div className="pt-4 mt-2 border-t border-gray-100">
                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Partner Allocations</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="text-gray-400 font-medium">Dealership Partner</p>
                      <p className="font-bold text-gray-700 mt-0.5">{getDealership(selectedMachine)?.name || 'None Assigned'}</p>
                    </div>
                    {selectedMachine.dealership && (
                      <button onClick={() => {
                        const dlId = typeof selectedMachine.dealership === 'object' ? selectedMachine.dealership.id : selectedMachine.dealership;
                        handleUnassignMachine(selectedMachine._id, dlId);
                      }} className="text-red-500 hover:text-red-700 font-semibold cursor-pointer">Unassign</button>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-gray-400 font-medium">Customer Tenant</p>
                      <p className="font-bold text-gray-700 mt-0.5">{getAssignedCustomer(selectedMachine)?.name || 'None Assigned'}</p>
                    </div>
                    {selectedMachine.assignedTo && (
                      <button onClick={() => {
                        const custId = typeof selectedMachine.assignedTo === 'object' ? selectedMachine.assignedTo.id : selectedMachine.assignedTo;
                        handleUnassignMachine(selectedMachine._id, custId);
                      }} className="text-red-500 hover:text-red-700 font-semibold cursor-pointer">Unassign</button>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-gray-400 font-medium">Operator Staff</p>
                      <p className="font-bold text-gray-700 mt-0.5">{getOperator(selectedMachine)?.name || 'None Assigned'}</p>
                    </div>
                    {selectedMachine.operatorId && (
                      <button onClick={() => {
                        const opId = typeof selectedMachine.operatorId === 'object' ? selectedMachine.operatorId.id : selectedMachine.operatorId;
                        handleUnassignMachine(selectedMachine._id, opId);
                      }} className="text-red-500 hover:text-red-700 font-semibold cursor-pointer">Unassign</button>
                    )}
                  </div>
                </div>

                {(!selectedMachine.assignedTo || !selectedMachine.dealership) && (
                  <button 
                    onClick={() => { setShowDetailsModal(false); setShowAssignModal(true); }}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-100"
                  >
                    <FiUser /> Allocate New Assignment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedMachine && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiUser /> Allocate Node {selectedMachine.machineId}</h3>
              <button onClick={() => { setSelectedMachine(null); setSelectedUser(null); setShowAssignModal(false); }} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select User / Tenant *</label>
                <select
                  value={selectedUser?._id || ''}
                  onChange={(e) => {
                    const u = users.find(usr => usr._id === e.target.value);
                    setSelectedUser(u || null);
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose User --</option>
                  {users.map(usr => (
                    <option key={usr._id} value={usr._id}>{usr.name} ({usr.role.toUpperCase()}) - {usr.email}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => { setSelectedMachine(null); setSelectedUser(null); setShowAssignModal(false); }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="button" disabled={!selectedUser} onClick={handleAssignMachine} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold cursor-pointer">Assign Machine</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
