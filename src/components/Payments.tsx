'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useWebSocket } from '../hooks/useWebSocket';
import axiosInstance from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, Search, Filter, Calendar, Wifi, 
  User, Mail, Phone, AlertCircle, RefreshCw,
  TrendingUp, Coins, Download
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Payment {
  _id: string;
  paymentId?: string;
  qrId?: string;
  machineId: string;
  amount: number;
  status: string;
  method: string;
  qr_id?: string;
  timestamp: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  [key: string]: any;
}

interface Summary {
  totalAmount: number;
  mqttAmount: number;
  razorpayAmount: number;
  count: number;
}

export default function PaymentsHistory() {
  const { userRole } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalAmount: 0,
    mqttAmount: 0,
    razorpayAmount: 0,
    count: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manual verify states
  const [manualQrId, setManualQrId] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  // Filters
  const [searchMachine, setSearchMachine] = useState('');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');

  // WebSocket live sync
  useWebSocket('PAYMENT_UPDATE', (newPayment: any) => {
    console.log('[WS] Received PAYMENT_UPDATE event:', newPayment);
    
    // Check if the payment already exists in the list
    setPayments((prev) => {
      const exists = prev.some((p) => p._id === newPayment._id || p.paymentId === newPayment.paymentId);
      if (exists) {
        return prev.map((p) => 
          (p._id === newPayment._id || p.paymentId === newPayment.paymentId) ? { ...p, ...newPayment } : p
        );
      }
      return [newPayment, ...prev];
    });

    // Update aggregation stats dynamically
    setSummary((prev) => {
      // Check if it already exists to avoid double counting
      const exists = payments.some((p) => p._id === newPayment._id || p.paymentId === newPayment.paymentId);
      if (exists) return prev;

      const amt = Number(newPayment.amount) || 0;
      const isMqtt = newPayment.method?.toLowerCase() === 'mqtt';
      
      return {
        totalAmount: prev.totalAmount + amt,
        mqttAmount: isMqtt ? prev.mqttAmount + amt : prev.mqttAmount,
        razorpayAmount: !isMqtt ? prev.razorpayAmount + amt : prev.razorpayAmount,
        count: prev.count + 1
      };
    });
  });

  const handleExportExcel = () => {
    if (payments.length === 0) {
      toast.warning('No payments logs to export.');
      return;
    }

    try {
      const exportData = payments.map((p) => ({
        'Machine Node ID': p.machineId || 'MQTT_TRIGGER',
        'Payment Ref ID': p.paymentId || 'N/A',
        'QR ID Reference': p.qrId || p.qr_id || 'N/A',
        'Payment Method': p.method || 'N/A',
        'Payer Name': p.customerName || p.payerName || 'Anonymous',
        'Payer Email': p.customerEmail || p.payerEmail || 'N/A',
        'Payer Phone': p.customerPhone || p.payerPhone || 'N/A',
        'Amount (INR)': p.amount || 0,
        'Status': p.status || 'N/A',
        'Timestamp': p.timestamp ? new Date(p.timestamp).toLocaleString() : 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payment Transactions');

      XLSX.writeFile(wb, `Freshpod_Payments_Export_${Date.now()}.xlsx`);
      toast.success('Excel spreadsheet generated successfully!');
    } catch (err: any) {
      console.error('[XLSX] Export Error:', err);
      toast.error('Failed to export payment history.');
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      // Endpoint depends on backend setup - defaulting to general payment history endpoint
      const response = await axiosInstance.get('/admin/payments/history');
      if (response.data?.success) {
        setPayments(response.data.payments || []);
        setSummary(response.data.summary || {
          totalAmount: 0,
          mqttAmount: 0,
          razorpayAmount: 0,
          count: 0
        });
      } else {
        setError('Failed to fetch payment history logs.');
      }
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError(err.response?.data?.message || 'Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQrId.trim()) return;

    setVerifyLoading(true);
    try {
      const response = await axiosInstance.post('/api/payment/verify-manual', { qr_id: manualQrId.trim() });
      if (response.data?.success) {
        if (response.data.status === 'paid') {
          toast.success(response.data.message || 'Payment successfully verified and logged!');
          setManualQrId('');
          fetchPayments();
        } else {
          toast.info(response.data.message || `Payment check: Status is ${response.data.status}.`);
        }
      }
    } catch (err: any) {
      console.error('Verification failed:', err);
      toast.error(err.response?.data?.error || 'Failed to verify transaction ID.');
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments
    .filter(payment => {
      const matchesMachine = payment.machineId?.toLowerCase().includes(searchMachine.toLowerCase());
      const matchesMethod = filterMethod === 'All' || payment.method === filterMethod;
      const matchesStatus = filterStatus === 'All' || payment.status === filterStatus;
      return matchesMachine && matchesMethod && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <CreditCard className="text-blue-600" /> Transaction Registry
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin 
              ? 'View all global telemetry and online payment links logs'
              : 'Audit transactions and telemetry payments for your assigned kiosks'}
          </p>
        </div>
        
        {/* Verify Action & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleVerifyManual} className="flex gap-2 bg-white p-1.5 border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500 max-w-md w-full">
            <input
              type="text"
              placeholder="Verify Link ID (e.g. qr_...)"
              value={manualQrId}
              onChange={(e) => setManualQrId(e.target.value)}
              className="px-3 py-1.5 outline-none text-sm w-full bg-transparent text-gray-700"
              disabled={verifyLoading}
            />
            <button
              type="submit"
              disabled={verifyLoading || !manualQrId.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {verifyLoading ? 'Checking...' : 'Verify Link'}
            </button>
          </form>
          
          <button
            onClick={fetchPayments}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 p-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center cursor-pointer"
            title="Reload Transaction Logs"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm mb-6">
          <AlertCircle className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Collection</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₹{(summary.totalAmount).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Dispenser turnover</p>
          </div>
          <span className="p-3 rounded-xl bg-blue-50 text-blue-600 text-xl"><Coins /></span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Offline (Telemetry)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₹{(summary.mqttAmount).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">MQTT physical triggers</p>
          </div>
          <span className="p-3 rounded-xl bg-purple-50 text-purple-600 text-xl"><Wifi /></span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Online Gateway</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">₹{(summary.razorpayAmount).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Razorpay link checkouts</p>
          </div>
          <span className="p-3 rounded-xl bg-green-50 text-green-600 text-xl"><CreditCard /></span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Checks</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary.count.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Logged records</p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-50 text-indigo-600 text-xl"><TrendingUp /></span>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Filter by Machine ID..."
              value={searchMachine}
              onChange={(e) => setSearchMachine(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto justify-end">
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
            >
              <option value="All">All Methods</option>
              <option value="mqtt">MQTT Offline</option>
              <option value="razorpay">Razorpay Online</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
            >
              <option value="All">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="created">Created</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-colors duration-200"
            >
              <Download size={12} /> Export Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6">Machine Node</th>
                <th className="py-4 px-6">Gateway ID / Ref</th>
                <th className="py-4 px-6">Method</th>
                <th className="py-4 px-6">Payer details</th>
                <th className="py-4 px-6">Yield (₹)</th>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-800">{p.machineId || 'MQTT_TRIGGER'}</td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-500">
                      <div>Ref: {p.paymentId || 'N/A'}</div>
                      {(p.qrId || p.qr_id) && <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">QR: {p.qrId || p.qr_id}</div>}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.method?.toLowerCase() === 'razorpay' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        {p.method?.toLowerCase() === 'razorpay' ? 'Online' : 'MQTT Code'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {(p.customerName || p.payerName) && (p.customerName !== 'N/A' && p.payerName !== 'N/A') ? (
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-gray-800 flex items-center gap-1">
                            <User size={10} /> {p.customerName || p.payerName}
                          </p>
                          {(p.customerEmail || p.payerEmail) && (p.customerEmail !== 'N/A') && (
                            <p className="text-gray-400 flex items-center gap-1"><Mail size={10} /> {p.customerEmail || p.payerEmail}</p>
                          )}
                          {(p.customerPhone || p.payerPhone) && (p.customerPhone !== 'N/A') && (
                            <p className="text-gray-400 flex items-center gap-1"><Phone size={10} /> {p.customerPhone || p.payerPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Anonymous / Kiosk Cash</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900">₹{p.amount.toLocaleString()}</td>
                    <td className="py-4 px-6 text-xs text-gray-500 flex items-center gap-1 mt-2.5">
                      <Calendar size={12} className="text-gray-400" />
                      {new Date(p.timestamp || p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'paid' ? 'bg-green-50 text-green-600' :
                        p.status === 'created' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No transactions matching the selected filters.
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
