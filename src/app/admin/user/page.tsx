'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { 
  FiUsers, FiUserPlus, FiEdit2, FiTrash2, FiShield, 
  FiUser, FiCpu, FiX, FiSearch,
  FiPhone, FiMapPin, FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Machine {
  _id: string;
  machineId: string;
  location: string;
  assignedTo?: string;
  dealership?: string;
  operatorId?: string;
  status: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  state?: string;
  country?: string;
  role: 'admin' | 'dealership' | 'customer' | 'operator';
  assignedMachines?: any[];
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
}

export default function UserDirective() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Selection
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
    state: '',
    country: 'India',
    role: 'customer' as User['role'],
    assignedMachineIds: [] as string[],
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUsers(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await axiosInstance.get('/admin/machine/data', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMachines(response.data || []);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMachines();
  }, [accessToken]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        state: formData.state,
        country: formData.country,
        role: formData.role,
        assignedMachineIds: formData.assignedMachineIds,
        razorpayKeyId: formData.razorpayKeyId,
        razorpayKeySecret: formData.razorpayKeySecret
      };
      
      await axiosInstance.post('/admin/createUser', userData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      toast.success('User created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchUsers();
      fetchMachines();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const userData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        assignedMachineIds: formData.assignedMachineIds,
        razorpayKeyId: formData.razorpayKeyId,
        razorpayKeySecret: formData.razorpayKeySecret
      };
      
      await axiosInstance.put(`/admin/user/${selectedUser._id}`, userData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      toast.success('User updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchUsers();
      fetchMachines();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await axiosInstance.delete(`/admin/user/${userId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        toast.success('User deleted successfully!');
        fetchUsers();
        fetchMachines();
      } catch (error: any) {
        console.error('Failed to delete user:', error);
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      location: '',
      state: '',
      country: 'India',
      role: 'customer',
      assignedMachineIds: [],
      razorpayKeyId: '',
      razorpayKeySecret: ''
    });
    setSelectedUser(null);
  };

  const openEditModal = (user: User) => {
    let userMachineIds: string[] = [];
    if (user.assignedMachines && user.assignedMachines.length > 0) {
      userMachineIds = user.assignedMachines.map(m => {
        return typeof m === 'object' ? m._id : m;
      });
    }
    
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      location: user.location || '',
      state: user.state || '',
      country: user.country || 'India',
      role: user.role,
      assignedMachineIds: userMachineIds,
      razorpayKeyId: user.razorpayKeyId || '',
      razorpayKeySecret: user.razorpayKeySecret || ''
    });
    setShowEditModal(true);
  };

  const toggleMachineAssignment = (machineId: string) => {
    setFormData(prev => {
      const isCurrentlyAssigned = prev.assignedMachineIds.includes(machineId);
      const newAssignedIds = isCurrentlyAssigned
        ? prev.assignedMachineIds.filter(id => id !== machineId)
        : [...prev.assignedMachineIds, machineId];
      
      return {
        ...prev,
        assignedMachineIds: newAssignedIds
      };
    });
  };

  const isMachineCompletelyUnassigned = (machine: Machine) => {
    const noDealership = !machine.dealership;
    const noOperator = !machine.operatorId;
    const noCustomer = !machine.assignedTo;
    return noDealership && noOperator && noCustomer;
  };

  const getAvailableMachines = () => {
    if (formData.role === 'admin') return [];
    
    return machines.filter(machine => {
      const isCompletelyUnassigned = isMachineCompletelyUnassigned(machine);
      if (showEditModal && selectedUser) {
        // Allow choosing machines already assigned to this user in edit mode
        const isCurrentlyAssignedToThisUser = 
          machine.assignedTo === selectedUser._id ||
          machine.dealership === selectedUser._id ||
          machine.operatorId === selectedUser._id;
        return isCurrentlyAssignedToThisUser || isCompletelyUnassigned;
      }
      return isCompletelyUnassigned;
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Directory & Directives</h1>
          <p className="text-gray-500 text-sm mt-1">Provision tenant users, configure merchant IDs, and assign hardware clusters</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <FiUserPlus /> Add User
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiSearch /></span>
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-semibold">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none shadow-sm cursor-pointer font-medium"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="dealership">Dealership</option>
            <option value="customer">Customer</option>
            <option value="operator">Operator</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6">User / Contact</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Assigned Machines</th>
                <th className="py-4 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-red-50 text-red-600' :
                        u.role === 'dealership' ? 'bg-indigo-50 text-indigo-600' :
                        u.role === 'customer' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {u.location ? (
                        <span className="flex items-center gap-1.5"><FiMapPin className="text-gray-400" /> {u.location}</span>
                      ) : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {u.assignedMachines && u.assignedMachines.length > 0 ? (
                          u.assignedMachines.map((m: any, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                              <FiCpu size={10} /> {typeof m === 'object' ? m.machineId : m}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">No assigned machines</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 border border-gray-100 hover:bg-gray-50 text-blue-600 rounded-lg cursor-pointer"
                          title="Edit User"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-2 border border-red-50 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer"
                          title="Delete User"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No users registered in the network
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiUserPlus /> Add New Portal User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. john@freshpod.in" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                  <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. +91 99000 99000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role *</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as User['role']})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer">
                    <option value="customer">Customer (Tenant)</option>
                    <option value="dealership">Dealership (Partner)</option>
                    <option value="operator">Operator (Sub-staff)</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hub Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. Indiranagar Office" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State / Province</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="e.g. Karnataka" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Key ID</label>
                  <input type="text" value={formData.razorpayKeyId} onChange={(e) => setFormData({...formData, razorpayKeyId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="rzp_live_..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Key Secret</label>
                  <input type="password" value={formData.razorpayKeySecret} onChange={(e) => setFormData({...formData, razorpayKeySecret: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="••••••••" />
                </div>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign Kiosks (Click to Allocate)</label>
                  <div className="border border-gray-200 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {getAvailableMachines().map((m) => {
                      const isAssigned = formData.assignedMachineIds.includes(m._id);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => toggleMachineAssignment(m._id)}
                          className={`p-2 rounded-lg text-left text-xs border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAssigned 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <FiCpu size={12} />
                          {m.machineId}
                        </button>
                      );
                    })}
                    {getAvailableMachines().length === 0 && (
                      <p className="text-xs text-gray-400 py-4 text-center col-span-2">No unassigned kiosks available</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiEdit2 /> Edit User {selectedUser.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                  <input type="email" disabled value={formData.email} className="w-full bg-gray-50 border border-gray-200 text-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                  <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hub Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Key ID</label>
                  <input type="text" value={formData.razorpayKeyId} onChange={(e) => setFormData({...formData, razorpayKeyId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razorpay Key Secret</label>
                  <input type="password" value={formData.razorpayKeySecret} onChange={(e) => setFormData({...formData, razorpayKeySecret: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="••••••••" />
                </div>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign Kiosks (Click to Allocate)</label>
                  <div className="border border-gray-200 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {getAvailableMachines().map((m) => {
                      const isAssigned = formData.assignedMachineIds.includes(m._id);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => toggleMachineAssignment(m._id)}
                          className={`p-2 rounded-lg text-left text-xs border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAssigned 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <FiCpu size={12} />
                          {m.machineId}
                        </button>
                      );
                    })}
                    {getAvailableMachines().length === 0 && (
                      <p className="text-xs text-gray-400 py-4 text-center col-span-2">No unassigned kiosks available</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer">Update User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
