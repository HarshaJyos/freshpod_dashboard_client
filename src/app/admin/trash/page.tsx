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
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            Trash Recovery Console
          </h1>
          <p className="text-gray-500 text-xs mt-1">Inspect, restore, or permanently remove soft-deleted kiosks and user accounts.</p>
        </div>
        <button
          onClick={fetchTrash}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload Trash
        </button>
      </div>

      {/* Tabs - Flat PowerBI Style */}
      <div className="flex gap-1.5 p-1 bg-gray-100 rounded max-w-xs border border-gray-200">
        <button
          onClick={() => setActiveTab('machines')}
          className={`flex-1 py-1 px-2.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'machines' 
              ? 'bg-white text-gray-800 border border-gray-200' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Cpu size={13} />
          Kiosks ({machines.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-1 px-2.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'users' 
              ? 'bg-white text-gray-800 border border-gray-200' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <User size={13} />
          Users ({users.length})
        </button>
      </div>

      {/* Content - Flat Excel Table Container */}
      <div className="bg-white border border-gray-200 overflow-hidden min-h-[45vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-mono">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mb-2" />
            <p className="text-xs">SCANNING RECOVERY ARCHIVE...</p>
          </div>
        ) : activeTab === 'machines' ? (
          machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Database className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kiosk Trash Bin is Empty</p>
              <p className="text-[10px] text-gray-400 mt-0.5">No soft-deleted machines are present in the database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[25%]" />
                  <col className="w-[25%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 border-r border-gray-200">Machine Detail</th>
                    <th className="py-2.5 px-4 border-r border-gray-200">Location</th>
                    <th className="py-2.5 px-4 border-r border-gray-200">Deleted Timestamp</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {machines.map((m) => (
                    <tr key={m._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                      <td className="py-2.5 px-4 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-rose-50 text-rose-600"><Cpu size={14} /></span>
                          <div>
                            <p className="font-bold text-gray-800 font-mono">{m.machineId}</p>
                            <p className="text-[9px] text-gray-400 font-mono">QR ID: {m.qrId || 'None Assigned'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400 shrink-0" />
                          <span>{m.location}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 font-mono text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400 shrink-0" />
                          <span>{m.deletedAt ? new Date(m.deletedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleRestore(m._id, 'machine')}
                            disabled={actionLoading !== null}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleHardDelete(m._id, 'machine')}
                            disabled={actionLoading !== null}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
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
              <Database className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">User Trash Bin is Empty</p>
              <p className="text-[10px] text-gray-400 mt-0.5">No soft-deleted users are present in the database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                  <col className="w-[25%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 border-r border-gray-200">User Detail</th>
                    <th className="py-2.5 px-4 border-r border-gray-200">Contact Info</th>
                    <th className="py-2.5 px-4 border-r border-gray-200">Deleted Timestamp</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium text-gray-800">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                      <td className="py-2.5 px-4 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-indigo-50 text-indigo-600"><User size={14} /></span>
                          <div>
                            <p className="font-bold text-gray-800">{u.name}</p>
                            <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-[9px] font-bold uppercase mt-1 inline-block text-gray-500 rounded">
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-gray-600 font-mono">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1 font-semibold">
                            <Mail size={11} className="text-gray-400 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                          {u.phoneNumber && (
                            <div className="flex items-center gap-1 font-semibold text-gray-500">
                              <Phone size={11} className="text-gray-400 shrink-0" />
                              <span>{u.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 font-mono text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400 shrink-0" />
                          <span>{u.deletedAt ? new Date(u.deletedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleRestore(u._id, 'user')}
                            disabled={actionLoading !== null}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleHardDelete(u._id, 'user')}
                            disabled={actionLoading !== null}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
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
