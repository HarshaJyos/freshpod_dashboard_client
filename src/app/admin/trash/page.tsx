'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../lib/axios';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { toast } from 'react-toastify';
import { 
  Trash2, RefreshCw, ShieldAlert, Cpu, 
  User, Calendar, MapPin, Database, Mail, Phone
} from 'lucide-react';

interface TrashedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phoneNumber: string;
  deletedAt?: string;
}

interface TrashedMachine {
  _id: string;
  machineId: string;
  qrId?: string;
  location: string;
  status: string;
  deletedAt?: string;
}

export default function TrashBin() {
  const { userRole } = useAuth();
  const { refetch } = useData();
  const [activeTab, setActiveTab] = useState<'machines' | 'users'>('machines');
  const [users, setUsers] = useState<TrashedUser[]>([]);
  const [machines, setMachines] = useState<TrashedMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/admin/trash');
      if (response.data?.success) {
        setUsers(response.data.users || []);
        setMachines(response.data.machines || []);
      } else {
        toast.error('Failed to load trashed items.');
      }
    } catch (err: any) {
      console.error('Error fetching trash:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch trash bin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string, type: 'user' | 'machine') => {
    setActionLoading(id);
    try {
      const response = await axiosInstance.post(`/admin/trash/${id}/restore`, { type });
      if (response.data?.success) {
        toast.success(response.data.message || 'Item restored successfully.');
        fetchTrash();
        refetch();
      }
    } catch (err: any) {
      console.error('Error restoring:', err);
      toast.error(err.response?.data?.message || 'Failed to restore entity.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHardDelete = async (id: string, type: 'user' | 'machine') => {
    if (!confirm('WARNING: Permanent deletion is irreversible! This will permanently delete this document from the database. Are you sure you want to proceed?')) return;
    
    setActionLoading(id);
    try {
      const response = await axiosInstance.delete(`/admin/trash/${id}/hard-delete`, { data: { type } });
      if (response.data?.success) {
        toast.success(response.data.message || 'Item deleted permanently.');
        fetchTrash();
      }
    } catch (err: any) {
      console.error('Error hard-deleting:', err);
      toast.error(err.response?.data?.message || 'Failed to delete permanently.');
    } finally {
      setActionLoading(null);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white border border-gray-100 rounded-3xl shadow-sm">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500 text-sm mt-1 max-w-sm">Only authorized administrators are allowed to access and manage the trash recovery console.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            Trash Recovery Console
          </h1>
          <p className="text-gray-400 text-xs mt-1 font-medium">Inspect, restore, or permanently remove soft-deleted kiosks and user accounts.</p>
        </div>
        <button
          onClick={fetchTrash}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Trash
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-2xl max-w-xs border border-gray-200/50">
        <button
          onClick={() => setActiveTab('machines')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'machines' 
              ? 'bg-white text-gray-800 shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Kiosks ({machines.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'users' 
              ? 'bg-white text-gray-800 shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Users ({users.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[40vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
            <p className="text-xs mt-3 font-semibold uppercase tracking-wider">Scanning database...</p>
          </div>
        ) : activeTab === 'machines' ? (
          machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Database className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">Kiosk Trash Bin is Empty</p>
              <p className="text-xs text-gray-400 mt-0.5">No soft-deleted machines are present in the database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-4 px-6">Machine Detail</th>
                    <th className="py-4 px-6">Location</th>
                    <th className="py-4 px-6">Deleted Timestamp</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => (
                    <tr key={m._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-xl bg-rose-50 text-rose-600"><Cpu size={16} /></span>
                          <div>
                            <p className="font-bold text-gray-800">{m.machineId}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">QR ID: {m.qrId || 'None Assigned'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                          <MapPin size={14} className="text-gray-400" />
                          <span>{m.location}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{m.deletedAt ? new Date(m.deletedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestore(m._id, 'machine')}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/20 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleHardDelete(m._id, 'machine')}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/20 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                          >
                            Purge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Database className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">User Trash Bin is Empty</p>
              <p className="text-xs text-gray-400 mt-0.5">No soft-deleted users are present in the database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-4 px-6">User Detail</th>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Deleted Timestamp</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><User size={16} /></span>
                          <div>
                            <p className="font-bold text-gray-800">{u.name}</p>
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold text-[9px] uppercase tracking-wider mt-1 inline-block">
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-600 font-semibold text-xs">
                            <Mail size={12} className="text-gray-400" />
                            <span>{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500 font-semibold text-xs">
                            <Phone size={12} className="text-gray-400" />
                            <span>{u.phoneNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{u.deletedAt ? new Date(u.deletedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestore(u._id, 'user')}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/20 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleHardDelete(u._id, 'user')}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/20 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                          >
                            Purge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
