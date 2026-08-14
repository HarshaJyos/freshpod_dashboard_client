'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { 
  FiCpu, FiMapPin, FiDollarSign, FiPlus, FiEye, 
  FiEdit2, FiTrash2, FiRefreshCw, FiUser, FiActivity,
  FiCheckCircle, FiX, FiSearch, FiFilter
} from 'react-icons/fi';
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
  assignedTo?: string;
  dealership?: string;
  operatorId?: string;
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
    return users.find(u => u._id === machine.assignedTo);
  };

  const getDealership = (machine: Machine) => {
    if (!machine.dealership) return null;
    return users.find(u => u._id === machine.dealership);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Machine Fleet Registry</h1>
          <p className="text-gray-500 text-sm mt-1">Configure telemetry nodes, payment configs, and tenant allocations</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <FiPlus /> Add Machine
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiSearch /></span>
          <input
            type="text"
            placeholder="Search by ID or Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-gray-400 text-xs font-semibold"><FiFilter className="inline mr-1" /> Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none shadow-sm cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMachines.length > 0 ? (
          filteredMachines.map((m) => {
            const customer = getAssignedCustomer(m);
            const dealer = getDealership(m);
            return (
              <div key={m._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><FiCpu /></span>
                      <div>
                        <h3 className="font-bold text-gray-800">{m.machineId}</h3>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Node ID</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      m.status === 'active' ? 'bg-green-50 text-green-600' :
                      m.status === 'idle' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <div className="flex gap-2 items-center">
                      <FiMapPin className="text-gray-400" />
                      <span>{m.location}, {m.state || 'N/A'}, {m.country}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <FiDollarSign className="text-gray-400" />
                      <span>Cost per Tap: <strong className="text-gray-900">₹{m.costPerTap}</strong></span>
                    </div>
                    <div className="pt-2 border-t border-gray-50 mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Dealership Partner:</span>
                        <span className="font-semibold text-gray-700">{dealer ? dealer.name : 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Customer Tenant:</span>
                        <span className="font-semibold text-gray-700">{customer ? customer.name : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-50">
                  <button 
                    onClick={() => { setSelectedMachine(m); setShowDetailsModal(true); }}
                    className="flex-1 py-2 border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiEye /> View
                  </button>
                  <button 
                    onClick={() => openEditModal(m)}
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiEdit2 /> Settings
                  </button>
                  <button 
                    onClick={() => handleDeleteMachine(m._id)}
                    className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg text-xs font-semibold cursor-pointer"
                    title="Delete Machine"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-gray-400 text-sm">
            No machines matching the search filters.
          </div>
        )}
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
                      <button onClick={() => handleUnassignMachine(selectedMachine._id, selectedMachine.dealership!)} className="text-red-500 hover:text-red-700 font-semibold cursor-pointer">Unassign</button>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-gray-400 font-medium">Customer Tenant</p>
                      <p className="font-bold text-gray-700 mt-0.5">{getAssignedCustomer(selectedMachine)?.name || 'None Assigned'}</p>
                    </div>
                    {selectedMachine.assignedTo && (
                      <button onClick={() => handleUnassignMachine(selectedMachine._id, selectedMachine.assignedTo!)} className="text-red-500 hover:text-red-700 font-semibold cursor-pointer">Unassign</button>
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
