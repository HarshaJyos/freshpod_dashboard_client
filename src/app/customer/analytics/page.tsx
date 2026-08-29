'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { 
  FiTrendingUp, FiBarChart2, FiDollarSign, FiCalendar, FiActivity, FiAward, FiTarget, FiInfo, FiCpu, FiAlertCircle
} from 'react-icons/fi';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";

interface Machine {
  _id: string;
  machineId: string;
  location: string;
  costPerTap: number;
  rentPerMonth?: number;
  maintenanceCostPerMonth?: number;
  machineCost?: number;
  totalTaps?: number;
  monthlyTaps?: number;
}

interface DailyLog {
  machineId: string;
  tapCount: number;
  date: string;
  costPerTap?: number;
}

export default function CustomerAnalytics() {
  const { accessToken } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  // S.No, Kiosk ID, Taps, Gross Revenue, Net Profit, Location
  const { widths, startResize } = useResizableColumns([60, 140, 100, 140, 140, 220]);
  const [rowPadding, setRowPadding] = useState('py-2');

  const fetchData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const machinesResponse = await axiosInstance.get('/customer/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMachines(machinesResponse.data || []);
      
      const dashboardResponse = await axiosInstance.get('/customer/dashboard', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setDashboardStats(dashboardResponse.data);
      
      // Attempt all-logs
      try {
        const logsResponse = await axiosInstance.get('/customer/all-logs', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (logsResponse.data && logsResponse.data.length > 0) {
          setDailyLogs(logsResponse.data);
        } else {
          // Fallback to daily logs
          const dailyLogsResponse = await axiosInstance.get('/customer/daily-logs', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (dailyLogsResponse.data && dailyLogsResponse.data.length > 0) {
            setDailyLogs(dailyLogsResponse.data);
          }
        }
      } catch (logErr) {
        console.error('Failed to fetch logs, falling back:', logErr);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [accessToken]);

  const stats = useMemo(() => {
    if (!machines.length) return null;

    let totalTaps = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalMachineCost = 0;
    
    // Group logs
    const tapsByMachine: Record<string, number> = {};
    dailyLogs.forEach(log => {
      const mId = log.machineId;
      const count = log.tapCount || 0;
      tapsByMachine[mId] = (tapsByMachine[mId] || 0) + count;
    });

    const processedMachines = machines.map(m => {
      const cost = m.costPerTap || 70.00;
      const rent = m.rentPerMonth || 0;
      const maint = m.maintenanceCostPerMonth || 0;
      const hardwareCost = m.machineCost || 0;

      const taps = tapsByMachine[m.machineId] !== undefined ? tapsByMachine[m.machineId] : (m.totalTaps || 0);
      const revenue = taps * cost;
      const monthlyExpense = rent + maint;

      totalTaps += taps;
      totalRevenue += revenue;
      totalExpenses += monthlyExpense;
      totalMachineCost += hardwareCost;

      return {
        machineId: m.machineId,
        taps,
        revenue,
        netProfit: revenue - monthlyExpense,
        location: m.location
      };
    });

    const netProfit = totalRevenue - totalExpenses;
    const avgProfitPerKiosk = machines.length > 0 ? netProfit / machines.length : 0;
    const conversionRate = totalMachineCost > 0 ? (totalRevenue / totalMachineCost) * 100 : 0;

    return {
      totalTaps,
      totalRevenue,
      totalExpenses,
      totalMachineCost,
      netProfit,
      avgProfitPerKiosk,
      conversionRate,
      processedMachines
    };
  }, [machines, dailyLogs]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Telemetry Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">Audit telemetry logs, profit statements, and kiosk distributions</p>
        </div>
        <div className="bg-white border border-gray-200 px-3 py-1.5 rounded text-xs flex items-center gap-2 font-medium">
          <FiCalendar /> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs mb-4 flex items-center gap-2">
          <FiAlertCircle />
          <p>{error}</p>
        </div>
      )}

      {stats && (
        <>
          {/* Key Cards - Flat PowerBI Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 border border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Taps</p>
              <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{stats.totalTaps.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Revenue</p>
              <p className="text-xl font-bold text-green-600 mt-1 font-mono">₹{Math.round(stats.totalRevenue).toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Monthly Exp.</p>
              <p className="text-xl font-bold text-red-600 mt-1 font-mono">₹{Math.round(stats.totalExpenses).toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Net Profit</p>
              <p className="text-xl font-bold text-blue-600 mt-1 font-mono">₹{Math.round(stats.netProfit).toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">ROI Conv.</p>
              <p className="text-xl font-bold text-indigo-600 mt-1 font-mono">{stats.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-4 border border-gray-200">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Kiosks</p>
              <p className="text-xl font-bold text-purple-600 mt-1 font-mono">{machines.length}</p>
            </div>
          </div>

          {/* Chart Banners */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kiosks Profit Bar */}
            {mounted && (
              <div className="lg:col-span-2 bg-white border border-gray-200 p-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <FiBarChart2 className="text-blue-600" /> Kiosk Revenue breakdown
                </h3>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.processedMachines}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="machineId" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <Tooltip formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Performance Insights - Flat PowerBI Style */}
            <div className="bg-white border border-gray-200 p-4 space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Operations Insights</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 border border-gray-200 space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Average Profit per Kiosk</p>
                  <p className="text-lg font-bold text-blue-700 font-mono">₹{Math.round(stats.avgProfitPerKiosk).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Hardware cost conversion</p>
                  <p className="text-lg font-bold text-green-700 font-mono">{stats.conversionRate.toFixed(1)}% Yield</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 flex items-center gap-2">
                  <FiTarget className="text-blue-500 text-sm shrink-0" />
                  <div className="text-[11px]">
                    <p className="font-bold text-gray-700">Audit targets</p>
                    <p className="text-gray-500 mt-0.5">Optimize cost per tap configurations in settings to improve conversion yields.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Machine detailed summary list in Excel table format */}
          <div className="bg-white border border-gray-200 overflow-hidden mt-6">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Kiosk Margin Audit Table</h3>
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
              <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
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
                      Kiosk ID
                      <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                    </th>
                    <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                      Taps
                      <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                    </th>
                    <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                      Gross Revenue
                      <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                    </th>
                    <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                      Net Profit
                      <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                    </th>
                    <th className="py-2.5 px-4 relative">
                      Location
                      <div onMouseDown={(e) => startResize(5, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.processedMachines.map((m, index) => (
                    <tr key={m.machineId} className="hover:bg-gray-50/50 transition-colors text-xs">
                      <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                        {index + 1}
                      </td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono font-bold text-gray-800 whitespace-normal break-words select-text`}>{m.machineId}</td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-medium whitespace-normal break-words select-text`}>{m.taps}</td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono text-green-600 font-semibold whitespace-normal break-words select-text`}>₹{Math.round(m.revenue).toLocaleString()}</td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-bold ${m.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'} whitespace-normal break-words select-text`}>₹{Math.round(m.netProfit).toLocaleString()}</td>
                      <td className={`${rowPadding} px-4 text-gray-600 whitespace-normal break-words select-text`}>{m.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
