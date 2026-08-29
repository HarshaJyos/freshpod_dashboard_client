'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useWebSocket } from '../hooks/useWebSocket';
import axiosInstance from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { useResizableColumns } from '../hooks/useResizableColumns';
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
  const isAdmin = userRole === 'admin';

  // Initialize columns with width
  // Col indexes: 0: S.No, 1: Machine Node, 2: Gateway ID, 3: Method, 4: Payer Details (Admin), 5: Phone (Admin), 6: Yield, 7: Timestamp, 8: Status
  const { widths, startResize } = useResizableColumns(
    isAdmin 
      ? [60, 140, 200, 110, 200, 130, 110, 190, 110] 
      : [60, 160, 240, 120, 120, 200, 120]
  );

  const [rowPadding, setRowPadding] = useState('py-2'); // default medium
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
      const isPaid = newPayment.status?.toLowerCase() === 'paid';

      return {
        // Only count revenue if payment is confirmed paid
        totalAmount: isPaid ? prev.totalAmount + amt : prev.totalAmount,
        mqttAmount: (isPaid && isMqtt) ? prev.mqttAmount + amt : prev.mqttAmount,
        razorpayAmount: (isPaid && !isMqtt) ? prev.razorpayAmount + amt : prev.razorpayAmount,
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
      const exportData = payments.map((p) => {
        const row: any = {
          'Machine Node ID': p.machineId || 'MQTT_TRIGGER',
          'Payment Ref ID': p.paymentId || 'N/A',
          'QR ID Reference': p.qrId || p.qr_id || 'N/A',
          'Payment Method': p.method || 'N/A'
        };

        if (userRole === 'admin') {
          row['Payer Name'] = p.customerName || p.payerName || 'Anonymous';
          row['Payer Email'] = p.customerEmail || p.payerEmail || 'N/A';
          row['Payer Phone'] = p.customerPhone || p.payerPhone || 'N/A';
        }

        row['Amount (INR)'] = p.amount || 0;
        row['Status'] = p.status || 'N/A';
        row['Timestamp'] = p.timestamp ? new Date(p.timestamp).toLocaleString() : 'N/A';

        return row;
      });

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

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <CreditCard size={18} className="text-blue-600" /> Transaction Registry
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            {isAdmin 
              ? 'View all global telemetry and online payment links logs'
              : 'Audit transactions and telemetry payments for your assigned kiosks'}
          </p>
        </div>
        
        {/* Verify Action & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <form onSubmit={handleVerifyManual} className="flex gap-1.5 bg-white p-1 border border-gray-200 rounded max-w-md w-full">
            <input
              type="text"
              placeholder="Verify Link ID (e.g. qr_...)"
              value={manualQrId}
              onChange={(e) => setManualQrId(e.target.value)}
              className="px-2.5 py-1 outline-none text-xs w-full bg-transparent text-gray-700 font-mono"
              disabled={verifyLoading}
            />
            <button
              type="submit"
              disabled={verifyLoading || !manualQrId.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {verifyLoading ? 'Checking...' : 'Verify'}
            </button>
          </form>
          
          <button
            onClick={fetchPayments}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 p-2 rounded transition-all flex items-center justify-center cursor-pointer"
            title="Reload Transaction Logs"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs mb-4 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Stats - Flat PowerBI Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Collection", val: `₹${summary.totalAmount.toLocaleString()}`, sub: "Dispenser turnover", icon: <Coins size={16} /> },
          { label: "Offline (Telemetry)", val: `₹${summary.mqttAmount.toLocaleString()}`, sub: "MQTT physical runs", icon: <Wifi size={16} /> },
          { label: "Online Gateway", val: `₹${summary.razorpayAmount.toLocaleString()}`, sub: "Razorpay link checkouts", icon: <CreditCard size={16} /> },
          { label: "Total Checks", val: summary.count.toLocaleString(), sub: "Logged records", icon: <TrendingUp size={16} /> }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{item.val}</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{item.sub}</p>
            </div>
            <span className="text-gray-400">{item.icon}</span>
          </div>
        ))}
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><Search size={14} /></span>
            <input
              type="text"
              placeholder="Filter by Machine ID..."
              value={searchMachine}
              onChange={(e) => setSearchMachine(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
            <select
              value={rowPadding}
              onChange={(e) => setRowPadding(e.target.value)}
              className="bg-white border border-gray-200 px-2 py-1.5 rounded text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
              title="Row Height"
            >
              <option value="py-1">Compact Height</option>
              <option value="py-2.5">Standard Height</option>
              <option value="py-4">Tall Height</option>
            </select>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="bg-white border border-gray-200 px-2.5 py-1.5 rounded text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
            >
              <option value="All">All Methods</option>
              <option value="mqtt">MQTT Offline</option>
              <option value="razorpay">Razorpay Online</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 px-2.5 py-1.5 rounded text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
            >
              <option value="All">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="created">Created</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-white border border-gray-200 px-2.5 py-1.5 rounded text-xs focus:outline-none cursor-pointer font-semibold text-gray-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download size={12} /> Export Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider select-none">
                <th className="py-2 px-4 border-r border-gray-200 relative">
                  S.No
                  <div onMouseDown={(e) => startResize(0, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2 px-4 border-r border-gray-200 relative">
                  Machine Node
                  <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2 px-4 border-r border-gray-200 relative">
                  Gateway ID / Ref
                  <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2 px-4 border-r border-gray-200 relative">
                  Method
                  <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                {isAdmin && (
                  <th className="py-2 px-4 border-r border-gray-200 relative">
                    Payer Details
                    <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                )}
                {isAdmin && (
                  <th className="py-2 px-4 border-r border-gray-200 relative">
                    Phone
                    <div onMouseDown={(e) => startResize(5, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                )}
                <th className={`py-2 px-4 border-r border-gray-200 text-right relative`}>
                  Yield (₹)
                  <div onMouseDown={(e) => startResize(isAdmin ? 6 : 4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2 px-4 border-r border-gray-200 relative">
                  Timestamp
                  <div onMouseDown={(e) => startResize(isAdmin ? 7 : 5, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2 px-4 text-center relative">
                  Status
                  <div onMouseDown={(e) => startResize(isAdmin ? 8 : 6, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p, index) => (
                  <tr key={p._id} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                      {index + 1}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono font-bold text-gray-900 whitespace-normal break-words select-text`}>
                      {p.machineId || 'MQTT_TRIGGER'}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-[11px] text-gray-500 whitespace-normal break-words select-text`}>
                      <div>Ref: {p.paymentId || 'N/A'}</div>
                      {(p.qrId || p.qr_id) && <div className="text-[9px] text-gray-400 mt-0.5 font-semibold">QR: {p.qrId || p.qr_id}</div>}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 whitespace-normal break-words select-text`}>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        p.method?.toLowerCase() === 'razorpay' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {p.method?.toLowerCase() === 'razorpay' ? 'Online' : p.method || 'MQTT'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className={`${rowPadding} px-4 border-r border-gray-200 whitespace-normal break-words select-text`}>
                        {(p.customerName || p.payerName) && (p.customerName !== 'N/A' && p.payerName !== 'N/A') ? (
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-semibold text-gray-800 flex items-center gap-1">
                              <User size={10} /> {p.customerName || p.payerName}
                            </p>
                            {(p.customerEmail || p.payerEmail) && (p.customerEmail !== 'N/A') && (
                              <p className="text-gray-400 flex items-center gap-1"><Mail size={10} /> {p.customerEmail || p.payerEmail}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">Anonymous / Cash</span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-[11px] text-gray-600 whitespace-normal break-words select-text`}>
                        {p.customerPhone || p.payerPhone || 'N/A'}
                      </td>
                    )}
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-semibold text-gray-900 whitespace-normal break-words select-text`}>
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className={`${rowPadding} px-4 border-r border-gray-200 text-gray-500 font-mono text-[11px] whitespace-normal break-words select-text`}>
                      {new Date(p.timestamp || p.createdAt).toLocaleString()}
                    </td>
                    <td className={`${rowPadding} px-4 text-center whitespace-normal break-words select-text`}>
                      <span className={`inline-flex px-2 py-0.5 rounded uppercase text-[9px] font-bold ${
                        p.status === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                        p.status === 'created' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="py-12 text-center text-gray-400">
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
