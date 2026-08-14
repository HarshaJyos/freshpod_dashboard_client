'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  FiMousePointer, FiActivity, FiTrendingUp, 
  FiAlertCircle, FiDollarSign, FiCheckCircle, FiCalendar, FiDownload
} from 'react-icons/fi';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface Stats {
  totalTapsMonth: number;
  activeCount: number;
  unitList: any[];
  totalRevenue: number;
  totalMachines: number;
  uptime: number;
  dailyTrend: { date: string; taps: number }[];
  alerts: { id: string; message: string }[];
  monthName: string;
  avgDailyTaps: number;
  projectedRevenue: number;
}

export default function AdminDashboard() {
  const { machines, loading, error } = useData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo<Stats>(() => {
    if (!machines || Object.keys(machines).length === 0) {
      return { 
        totalTapsMonth: 0, activeCount: 0, unitList: [], 
        totalRevenue: 0, totalMachines: 0, uptime: 0,
        dailyTrend: [], alerts: [], monthName: "August 2026",
        avgDailyTaps: 0, projectedRevenue: 0
      };
    }

    const machineEntries = Object.entries(machines);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    let totalTapsMonth = 0;
    let grandTotalRevenue = 0;
    let activeMachinesCount = 0;
    const dailyMap: Record<string, number> = {};
    const alerts: { id: string; message: string }[] = [];

    const unitList = machineEntries.map(([id, data]) => {
      const logs = data?.logs || {};
      const costPerTap = data?.costPerTap || 70.00; 
      let machineMonthTaps = 0;
      let machineActiveDays = 0;
      let machineTotalTaps = 0;

      Object.entries(logs).forEach(([_, log]) => {
        const count = log?.tapCount || log?.taps || log?.count || 0;
        machineTotalTaps += count;
      });

      Object.entries(logs).forEach(([date, log]) => {
        try {
          let logDate: Date;
          if (date.includes('/')) {
            const parts = date.split('/');
            logDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
            logDate = new Date(date);
          }
          
          if (isNaN(logDate.getTime())) return;
          
          const count = log?.tapCount || log?.taps || log?.count || 0;
          
          if (logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth) {
            machineMonthTaps += count;
            
            const dateKey = `${logDate.getDate()}/${logDate.getMonth() + 1}/${logDate.getFullYear()}`;
            dailyMap[dateKey] = (dailyMap[dateKey] || 0) + count;
            
            if (count > 0) {
              machineActiveDays++;
            }
          }
        } catch (err) {
          console.warn(`Error processing log for ${id} on ${date}:`, err);
        }
      });

      const machineRevenue = data?.monthlyRevenue !== undefined ? data.monthlyRevenue : machineMonthTaps * costPerTap;
      grandTotalRevenue += machineRevenue;
      totalTapsMonth += machineMonthTaps;

      const isActive = machineMonthTaps > 0;
      if (isActive) activeMachinesCount++;

      if (!isActive && machineMonthTaps === 0) {
        alerts.push({ id, message: "No activity recorded this month" });
      }

      let efficiency = "0%";
      if (machineMonthTaps > 0 && machineActiveDays > 0) {
        const efficiencyValue = Math.min(100, (machineActiveDays / 30) * 100);
        efficiency = `${efficiencyValue.toFixed(0)}%`;
      }

      return {
        id,
        owner: data?.owner || `Owner ${id.slice(-4)}`,
        monthTaps: machineMonthTaps,
        totalTaps: machineTotalTaps,
        activeDays: machineActiveDays,
        revenue: data?.totalRevenue !== undefined ? data.totalRevenue : machineRevenue,
        costPerTap: costPerTap,
        status: isActive ? "Active" : "Idle",
        efficiency: efficiency,
        state: data?.state || 'Unknown',
        country: data?.country || 'Unknown'
      };
    });

    const dailyTrend = Object.entries(dailyMap)
      .sort((a, b) => {
        const dateA = a[0].split('/');
        const dateB = b[0].split('/');
        const dA = new Date(parseInt(dateA[2]), parseInt(dateA[1]) - 1, parseInt(dateA[0]));
        const dB = new Date(parseInt(dateB[2]), parseInt(dateB[1]) - 1, parseInt(dateB[0]));
        return dA.getTime() - dB.getTime();
      })
      .slice(-7)
      .map(([date, count]) => ({
        date: date,
        taps: count
      }));

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const avgDailyTaps = daysInMonth > 0 ? Math.round(totalTapsMonth / daysInMonth) : 0;

    return {
      totalTapsMonth,
      activeCount: activeMachinesCount,
      totalMachines: machineEntries.length,
      unitList,
      totalRevenue: grandTotalRevenue,
      dailyTrend,
      alerts,
      uptime: machineEntries.length > 0 ? (activeMachinesCount / machineEntries.length) * 100 : 0,
      monthName: `${monthNames[currentMonth]} ${currentYear}`,
      avgDailyTaps: avgDailyTaps,
      projectedRevenue: grandTotalRevenue * 1.15
    };
  }, [machines]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  if (error) return (
    <div className="p-8 text-red-500 bg-red-50 rounded-xl flex items-center gap-3">
      <FiAlertCircle /> Error loading data: {error.message || 'Unknown network error'}
    </div>
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}`;
    }
    return dateStr;
  };

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Machine Fleet Analytics</h1>
          <p className="text-gray-500 text-sm">{stats.monthName} • Monthly Performance Overview</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-medium shadow-sm">
            <FiCalendar /> {stats.monthName}
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 transition-all shadow-sm shadow-blue-100 cursor-pointer">
            <FiDownload /> Export Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Machines", val: stats.totalMachines, sub: "Active Fleet", icon: <FiActivity />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Machines", val: stats.activeCount, sub: `${stats.uptime.toFixed(1)}% uptime`, icon: <FiCheckCircle />, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Taps (Month)", val: stats.totalTapsMonth.toLocaleString(), sub: `Avg ${stats.avgDailyTaps}/day`, icon: <FiMousePointer />, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Total Revenue", val: `₹${(stats.totalRevenue/1000).toFixed(1)}k`, sub: "This Month", icon: <FiDollarSign />, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Projected Revenue", val: `₹${(stats.projectedRevenue/1000).toFixed(1)}k`, sub: "+15% Growth", icon: <FiTrendingUp />, color: "text-indigo-600", bg: "bg-indigo-50" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              <span className={`p-1.5 rounded-lg text-sm ${item.bg} ${item.color}`}>{item.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">{item.val}</p>
            <div className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold ${item.bg} ${item.color}`}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">
              Daily Tap Trends (Last 7 Days)
            </h3>
            <span className="text-xs text-blue-500 font-medium">
              {stats.monthName}
            </span>
          </div>

          {mounted && stats.dailyTrend.length > 0 && stats.dailyTrend.some(d => d.taps > 0) ? (
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} taps`, 'Taps']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="taps"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No tap data available for this month
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 mb-6 text-sm sm:text-base">Target Progress</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Current Revenue</span>
                  <span>₹{(stats.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.projectedRevenue || 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Target Progress</span>
                  <span>{Math.min(100, Math.round((stats.totalRevenue / (stats.projectedRevenue || 1)) * 100))}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.projectedRevenue || 1)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 mt-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Based on current telemetry cycles and user interactions, projected revenue targets are on course to maintain a +15% growth trajectory.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts and Machine Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">Registered Machines Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-6">ID / Owner</th>
                  <th className="py-3 px-6">Taps (Month)</th>
                  <th className="py-3 px-6">Efficiency</th>
                  <th className="py-3 px-6">Revenue</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.unitList.length > 0 ? (
                  stats.unitList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-800">{m.id}</p>
                        <p className="text-xs text-gray-400">{m.owner}</p>
                      </td>
                      <td className="py-4 px-6 font-medium">{m.monthTaps}</td>
                      <td className="py-4 px-6 font-medium">{m.efficiency}</td>
                      <td className="py-4 px-6 font-semibold text-gray-900">₹{m.revenue.toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${
                          m.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No machines registered in the network
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 text-sm sm:text-base">System Alerts</h3>
          <div className="space-y-3">
            {stats.alerts.length > 0 ? (
              stats.alerts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-xs">
                  <FiAlertCircle className="text-base shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Machine {a.id.slice(-6)} Idle</p>
                    <p className="text-yellow-600 mt-0.5">{a.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FiCheckCircle className="text-3xl text-green-500 mb-2" />
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">All Systems Operational</p>
                <p className="text-[11px] text-gray-400 mt-0.5">No network warning signals active.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
