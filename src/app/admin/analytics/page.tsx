'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { SanitizationIndicator } from '../../../components/Sanitization';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { 
  FiTrendingUp, FiPieChart, FiBarChart2, FiArrowUpRight, FiTarget,
  FiCalendar, FiCpu, FiDownload, FiFilter, FiRefreshCw,
  FiActivity, FiDollarSign, FiUsers, FiClock, FiAward,
  FiMapPin
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from "recharts";

export default function AdminAnalytics() {
  const { machines, loading, error, refetch } = useData();
  const [mounted, setMounted] = useState(false);

  // States
  const [dateRange, setDateRange] = useState('lifetime');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // S.No, ID / Location, Total Taps Logged, Fluid Capacity Remaining, Status
  const { widths, startResize } = useResizableColumns([60, 240, 160, 260, 120]);
  const [rowPadding, setRowPadding] = useState('py-2');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Unique metadata filters
  const filterOptions = useMemo(() => {
    if (!machines) return { states: [], countries: [], machineIds: [] };
    const states = new Set<string>();
    const countries = new Set<string>();
    const machineIds: string[] = [];

    Object.entries(machines).forEach(([id, machine]) => {
      machineIds.push(id);
      if (machine.state) states.add(machine.state);
      if (machine.country) countries.add(machine.country);
    });

    return {
      states: Array.from(states).sort(),
      countries: Array.from(countries).sort(),
      machineIds
    };
  }, [machines]);

  // Aggregate metrics based on filters
  const analyticsData = useMemo(() => {
    if (!machines || Object.keys(machines).length === 0) {
      return {
        totalTaps: 0,
        totalRevenue: 0,
        averageEfficiency: 0,
        activeNodes: 0,
        tapsByDate: [],
        revenueByMachine: [],
        averageTapsPerMachine: 0
      };
    }

    let filteredMachines = { ...machines };

    if (selectedState) {
      filteredMachines = Object.fromEntries(
        Object.entries(filteredMachines).filter(([_, m]) => m.state === selectedState)
      );
    }
    if (selectedCountry) {
      filteredMachines = Object.fromEntries(
        Object.entries(filteredMachines).filter(([_, m]) => m.country === selectedCountry)
      );
    }
    if (selectedMachine) {
      filteredMachines = Object.fromEntries(
        Object.entries(filteredMachines).filter(([id, _]) => id === selectedMachine)
      );
    }

    let totalTaps = 0;
    let totalRevenue = 0;
    let activeNodes = 0;
    const dateMap: Record<string, number> = {};
    const machineRevenueList: { name: string; taps: number; revenue: number }[] = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    Object.entries(filteredMachines).forEach(([id, m]) => {
      const logs = m.logs || {};
      const costPerTap = m.costPerTap || 70.00;
      let machineTaps = 0;

      Object.entries(logs).forEach(([dateStr, log]) => {
        try {
          let logDate: Date;
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            logDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
            logDate = new Date(dateStr);
          }

          if (isNaN(logDate.getTime())) return;

          const count = log.tapCount || log.taps || log.count || 0;

          // Date range filter checks
          if (dateRange === 'month') {
            if (logDate.getFullYear() !== currentYear || logDate.getMonth() !== currentMonth) {
              return;
            }
          } else if (dateRange === 'week') {
            const diffTime = Math.abs(now.getTime() - logDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 7) return;
          }

          machineTaps += count;
          const key = `${logDate.getDate()}/${logDate.getMonth() + 1}`;
          dateMap[key] = (dateMap[key] || 0) + count;
        } catch (err) {
          console.warn(err);
        }
      });

      totalTaps += machineTaps;
      const machineRevenue = m.totalRevenue !== undefined ? m.totalRevenue : machineTaps * costPerTap;
      totalRevenue += machineRevenue;

      if (machineTaps > 0) {
        activeNodes++;
      }

      machineRevenueList.push({
        name: m.machineId || id.slice(-6),
        taps: machineTaps,
        revenue: machineRevenue
      });
    });

    const tapsByDate = Object.entries(dateMap)
      .slice(-10)
      .map(([date, count]) => ({
        date,
        taps: count
      }));

    const totalMachinesCount = Object.keys(filteredMachines).length;

    return {
      totalTaps,
      totalRevenue,
      averageEfficiency: totalMachinesCount > 0 ? (activeNodes / totalMachinesCount) * 100 : 0,
      activeNodes,
      tapsByDate,
      revenueByMachine: machineRevenueList.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      averageTapsPerMachine: totalMachinesCount > 0 ? Math.round(totalTaps / totalMachinesCount) : 0
    };
  }, [machines, dateRange, selectedMachine, selectedState, selectedCountry]);

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Advanced Analytics & Telemetry</h1>
          <p className="text-gray-500 text-sm mt-1">Deep analysis on dispenser metrics, usage volumes, and regional parameters</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-800 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <FiRefreshCw />
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiFilter /> Filters
          </button>
        </div>
      </div>

      {/* Dynamic Filters Section */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 animate-in slide-in-from-top-4 duration-200">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Usage Period</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="lifetime">Lifetime</option>
              <option value="month">This Month</option>
              <option value="week">Last 7 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Node Kiosk</label>
            <select 
              value={selectedMachine} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="">All Kiosks</option>
              {filterOptions.machineIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">State / Region</label>
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="">All States</option>
              {filterOptions.states.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Country</label>
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Aggregate Stats - Flat PowerBI Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Aggregate Taps", val: analyticsData.totalTaps.toLocaleString(), sub: `Avg ${analyticsData.averageTapsPerMachine} / machine`, icon: <FiActivity /> },
          { label: "Total Yield", val: `₹${analyticsData.totalRevenue.toLocaleString()}`, sub: "Period Revenue", icon: <FiDollarSign /> },
          { label: "Fleet Uptime", val: `${analyticsData.averageEfficiency.toFixed(1)}%`, sub: `${analyticsData.activeNodes} Active Kiosks`, icon: <FiTarget /> },
          { label: "Active Nodes", val: `${analyticsData.activeNodes} / ${Object.keys(machines).length}`, sub: "Fleet Capacity", icon: <FiCpu /> }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{stat.val}</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{stat.sub}</p>
            </div>
            <span className="text-gray-400 text-lg">{stat.icon}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Taps Area Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2"><FiTrendingUp /> Telemetry Dispensation Volume</h3>
          {mounted && analyticsData.tapsByDate.length > 0 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.tapsByDate}>
                  <defs>
                    <linearGradient id="colorTaps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="taps" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTaps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-xs">No dispensation logs in selected period</div>
          )}
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white p-4 border border-gray-200">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2"><FiPieChart /> Revenue Breakdown by Node</h3>
          {mounted && analyticsData.revenueByMachine.length > 0 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.revenueByMachine}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(value: any) => [`₹${value}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10B981" radius={[2, 2, 0, 0]} name="Yield (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-xs">No machine revenue logs recorded</div>
          )}
        </div>
      </div>

      {/* Sanitization and Fleet Status in Excel Table Format */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sanitization Fluid Status</h3>
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
                  ID / Location
                  <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                  Total Taps Logged
                  <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2.5 px-4 border-r border-gray-200 relative">
                  Fluid Capacity Remaining
                  <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
                <th className="py-2.5 px-4 text-center relative">
                  Status
                  <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(machines).length > 0 ? (
                Object.entries(machines).map(([id, m], index) => {
                  let totalTapsCount = 0;
                  Object.values(m.logs || {}).forEach(log => {
                    totalTapsCount += log.tapCount || log.taps || log.count || 0;
                  });

                  return (
                    <tr key={id} className="hover:bg-gray-50/50 transition-colors text-xs">
                      <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                        {index + 1}
                      </td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 whitespace-normal break-words select-text`}>
                        <p className="font-bold text-gray-800 font-mono">{m.machineId || id}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1"><FiMapPin /> {m.location}</p>
                      </td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-medium whitespace-normal break-words select-text`}>{totalTapsCount.toLocaleString()}</td>
                      <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono whitespace-normal break-words select-text`}>
                        <SanitizationIndicator 
                          totalTaps={totalTapsCount} 
                          machineId={m.machineId || id}
                          containerSize={m.containerSize || 5}
                          usagePerTap={m.usagePerTap || 0.012}
                        />
                      </td>
                      <td className={`${rowPadding} px-4 text-center whitespace-normal break-words select-text`}>
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                          m.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>{m.status}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No telemetry machines currently active</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
