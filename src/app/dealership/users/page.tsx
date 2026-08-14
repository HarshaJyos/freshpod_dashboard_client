'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { 
  FiUsers, FiUserPlus, FiSearch, FiMail, FiPhone, FiMapPin, FiCpu, FiX,
  FiCheckCircle, FiClock, FiAlertCircle, FiInfo
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Machine {
  _id: string;
  machineId: string;
  location: string;
  assignedTo?: string;
  createdAt: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  state?: string;
  country?: string;
  isFirstLogin?: boolean;
  assignedMachines?: any[];
}

export default function DealershipUsers() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealershipInfo, setDealershipInfo] = useState<any>(null);

  // Add customer form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
    assignedMachineIds: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/dealership/customers', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await axiosInstance.get('/dealership/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const machineList = response.data.machines || [];
      const unassignedMachines = machineList.filter((m: Machine) => !m.assignedTo);
      setMachines(unassignedMachines);
    } catch (error) {
      console.error('Failed to fetch dealership machines:', error);
    }
  };

  const fetchDealershipInfo = async () => {
    try {
      const response = await axiosInstance.get('/user/profile', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setDealershipInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch dealership profile:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMachines();
    fetchDealershipInfo();
  }, [accessToken]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    try {
      await axiosInstance.post('/dealership/create-customer', formData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Customer added successfully! Default password is their mobile number.');
      setShowAddModal(false);
      resetAddForm();
      fetchUsers();
      fetchMachines();
    } catch (error: any) {
      console.error(error);
      setModalError(error.response?.data?.message || 'Failed to add customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMachine = (machineId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedMachineIds: prev.assignedMachineIds.includes(machineId)
        ? prev.assignedMachineIds.filter(id => id !== machineId)
        : [...prev.assignedMachineIds, machineId]
    }));
  };

  const resetAddForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      location: '',
      assignedMachineIds: []
    });
    setModalError('');
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phoneNumber?.includes(searchTerm)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Directory</h1>
          <p className="text-gray-500 text-sm mt-1">Provision sub-tenant customer accounts and allocate smart hardware</p>
        </div>
        <button 
          onClick={() => { resetAddForm(); setShowAddModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <FiUserPlus /> Add Customer
        </button>
      </div>

      {/* Info Banner */}
      {dealershipInfo && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 flex items-center gap-2 text-xs text-blue-800">
          <FiInfo className="text-blue-500 text-sm shrink-0" />
          <span>
            Created accounts will inherit your geographic properties: State (<strong>{dealershipInfo.state || 'N/A'}</strong>) and Country (<strong>{dealershipInfo.country}</strong>)
          </span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Customers</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{users.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Active Customers</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{users.filter(u => !u.isFirstLogin).length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Allocated (Sold)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {users.reduce((acc, u) => acc + (u.assignedMachines?.length || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Available Stock</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{machines.length}</p>
        </div>
      </div>

      {/* Warning */}
      {machines.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiAlertCircle className="text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">No hardware stock available</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              All your assigned telemetry nodes have been allocated. Please contact Freshpod support to request more kiosk clusters.
            </p>
          </div>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((customer) => (
          <div key={customer._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base border-2 border-white shadow-sm">
                    {customer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{customer.name}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <FiMapPin size={10} /> {customer.location || 'Location not set'}
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                  !customer.isFirstLogin ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {!customer.isFirstLogin ? 'Active' : 'Pending Login'}
                </div>
              </div>

              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <p className="flex items-center gap-2"><FiMail size={12} className="text-gray-400" /> {customer.email}</p>
                {customer.phoneNumber && <p className="flex items-center gap-2"><FiPhone size={12} className="text-gray-400" /> {customer.phoneNumber}</p>}
                <p className="flex items-center gap-2"><FiMapPin size={12} className="text-gray-400" /> {customer.state || 'N/A'}, {customer.country || 'India'}</p>
              </div>
            </div>

            <div className="border-t border-gray-50 pt-4 mt-2">
              <p className="text-xs text-gray-400 mb-2 font-semibold">Assigned Hardware ({customer.assignedMachines?.length || 0})</p>
              <div className="flex flex-wrap gap-1">
                {(customer.assignedMachines || []).slice(0, 3).map((machine: any, i: number) => {
                  const machineId = typeof machine === 'object' ? machine.machineId : machine;
                  return (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-semibold">
                      <FiCpu size={10} /> {machineId}
                    </span>
                  );
                })}
                {(customer.assignedMachines?.length || 0) === 0 && (
                  <span className="text-xs text-gray-400">No telemetry machines assigned</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100">
            <FiUsers className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No customers registered in your database.</p>
            <button onClick={() => setShowAddModal(true)} className="mt-4 text-blue-600 text-xs font-semibold hover:text-blue-700 cursor-pointer">
              Add your first customer account →
            </button>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><FiUserPlus /> Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  placeholder="10-digit mobile number"
                />
                <p className="text-[10px] text-gray-400 mt-1">The customer's default password will be this phone number</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Location / Hub *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  placeholder="City, Office Hub"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Assign Stock Telemetry Kiosks ({machines.length} available)
                </label>
                <div className="border border-gray-200 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {machines.map((machine) => {
                    const isChecked = formData.assignedMachineIds.includes(machine._id);
                    return (
                      <button
                        key={machine._id}
                        type="button"
                        onClick={() => toggleMachine(machine._id)}
                        className={`p-2 rounded-lg text-left text-xs border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <FiCpu size={12} />
                        {machine.machineId}
                      </button>
                    );
                  })}
                  {machines.length === 0 && (
                    <p className="text-xs text-gray-400 py-4 text-center col-span-2">No unallocated kiosks available</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold cursor-pointer">{submitting ? 'Adding...' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
