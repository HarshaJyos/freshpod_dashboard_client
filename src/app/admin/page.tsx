'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useResizableColumns } from '../../hooks/useResizableColumns';
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
  dailyTrend: any[];
  alerts: any[];
  monthName: string;
  avgDailyTaps: number;
  projectedRevenue: number;
}

export default function AdminDashboard() {
  const { machines, loading, error } = useData();
  const [mounted, setMounted] = useState(false);

  // S.No, ID / Owner, Taps (Month), Efficiency, Revenue, Status
  const { widths, startResize } = useResizableColumns([60, 180, 130, 130, 130, 110]);
  const [rowPadding, setRowPadding] = useState('py-2');

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

      {/* Stats Cards - Flat PowerBI Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Machines", val: stats.totalMachines, sub: "Active Fleet", icon: <FiActivity /> },
          { label: "Active Machines", val: stats.activeCount, sub: `${stats.uptime.toFixed(1)}% uptime`, icon: <FiCheckCircle /> },
          { label: "Total Taps (Month)", val: stats.totalTapsMonth.toLocaleString(), sub: `Avg ${stats.avgDailyTaps}/day`, icon: <FiMousePointer /> },
          { label: "Total Revenue", val: `₹${(stats.totalRevenue/1000).toFixed(1)}k`, sub: "This Month", icon: <FiDollarSign /> },
          { label: "Projected Revenue", val: `₹${(stats.projectedRevenue/1000).toFixed(1)}k`, sub: "+15% Growth", icon: <FiTrendingUp /> }
        ].map((item, i) => (
          <div key={i} className="bg-white p-4 border border-gray-200">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
              <span className="text-gray-400 text-sm">{item.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2 font-mono">{item.val}</p>
            <div className="mt-1 inline-block px-1.5 py-0.5 bg-gray-50 border border-gray-200 text-[9px] font-bold text-gray-500">
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">
              Daily Tap Trends (Last 7 Days)
            </h3>
            <span className="text-[10px] text-blue-500 font-medium font-mono">
              {stats.monthName}
            </span>
          </div>

          {mounted && stats.dailyTrend.length > 0 && stats.dailyTrend.some(d => d.taps > 0) ? (
            <div className="w-full h-64">
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
                    strokeWidth={2}
                    dot={{ r: 3, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#fff' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
              No tap data available for this month
            </div>
          )}
        </div>

        <div className="bg-white p-4 border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-4">Target Progress</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-600 font-mono">
                  <span>Current Revenue</span>
                  <span>₹{(stats.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.projectedRevenue || 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-600 font-mono">
                  <span>Target Progress</span>
                  <span>{Math.min(100, Math.round((stats.totalRevenue / (stats.projectedRevenue || 1)) * 100))}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.projectedRevenue || 1)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200 mt-4">
            <p className="text-[10px] text-gray-500 leading-relaxed font-semibold">
              Based on current telemetry cycles and user interactions, projected revenue targets are on course to maintain a +15% growth trajectory.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts and Machine Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Registered Machines Overview</h3>
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
            <table className="w-full text-left border-collapse table-fixed min-w-[650px]">
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
                    ID / Owner
                    <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                    Taps (Month)
                    <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                    Efficiency
                    <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                    Revenue
                    <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                  <th className="py-2.5 px-4 text-center relative">
                    Status
                    <div onMouseDown={(e) => startResize(5, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.unitList.length > 0 ? (
                  stats.unitList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-xs">
                      <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                        {idx + 1}
                      </td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 whitespace-normal break-words select-text`}>
                        <p className="font-bold text-gray-800 font-mono">{m.id}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{m.owner}</p>
                      </td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-medium whitespace-normal break-words select-text`}>{m.monthTaps}</td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-medium whitespace-normal break-words select-text`}>{m.efficiency}</td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-semibold text-gray-900 whitespace-normal break-words select-text`}>₹{m.revenue.toLocaleString()}</td>
                      <td className={`${rowPadding} px-4 text-center whitespace-normal break-words select-text`}>
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                          m.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No machines registered in the network
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 border border-gray-200">
          <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-4">System Alerts</h3>
          <div className="space-y-2.5">
            {stats.alerts.length > 0 ? (
              stats.alerts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex gap-2.5 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                  <FiAlertCircle className="text-sm shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold font-mono">Machine {a.id.slice(-6)} Idle</p>
                    <p className="text-yellow-600 mt-0.5">{a.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FiCheckCircle className="text-2xl text-green-500 mb-2" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">All Systems Operational</p>
                <p className="text-[10px] text-gray-400 mt-0.5">No network warning signals active.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
