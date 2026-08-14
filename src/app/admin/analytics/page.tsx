'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { SanitizationIndicator } from '../../../components/Sanitization';
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

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Aggregate Taps", val: analyticsData.totalTaps.toLocaleString(), sub: `Avg ${analyticsData.averageTapsPerMachine} / machine`, icon: <FiActivity />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Yield", val: `₹${analyticsData.totalRevenue.toLocaleString()}`, sub: "Period Revenue", icon: <FiDollarSign />, color: "text-green-600", bg: "bg-green-50" },
          { label: "Fleet Uptime", val: `${analyticsData.averageEfficiency.toFixed(1)}%`, sub: `${analyticsData.activeNodes} Active Kiosks`, icon: <FiTarget />, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Active Nodes", val: `${analyticsData.activeNodes} / ${Object.keys(machines).length}`, sub: "Fleet Capacity", icon: <FiCpu />, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stat.val}</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">{stat.sub}</p>
            </div>
            <span className={`p-3 rounded-xl text-xl ${stat.bg} ${stat.color}`}>{stat.icon}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Taps Area Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 text-sm sm:text-base mb-6 flex items-center gap-2"><FiTrendingUp /> Telemetry Dispensation Volume</h3>
          {mounted && analyticsData.tapsByDate.length > 0 ? (
            <div className="w-full h-64 sm:h-72">
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
                  <Area type="monotone" dataKey="taps" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTaps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-xs">No dispensation logs in selected period</div>
          )}
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 text-sm sm:text-base mb-6 flex items-center gap-2"><FiPieChart /> Revenue Breakdown by Node</h3>
          {mounted && analyticsData.revenueByMachine.length > 0 ? (
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.revenueByMachine}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(value: any) => [`₹${value}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Yield (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-xs">No machine revenue logs recorded</div>
          )}
        </div>
      </div>

      {/* Sanitization and Fleet Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm sm:text-base">Sanitization Fluid Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-6">ID / Location</th>
                <th className="py-3 px-6">Total Taps logged</th>
                <th className="py-3 px-6">Fluid Capacity Remaining</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(machines).length > 0 ? (
                Object.entries(machines).map(([id, m]) => {
                  let totalTapsCount = 0;
                  Object.values(m.logs || {}).forEach(log => {
                    totalTapsCount += log.tapCount || log.taps || log.count || 0;
                  });

                  return (
                    <tr key={id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-800">{m.machineId || id}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><FiMapPin /> {m.location}</p>
                      </td>
                      <td className="py-4 px-6 font-medium">{totalTapsCount.toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <SanitizationIndicator 
                          totalTaps={totalTapsCount} 
                          machineId={m.machineId || id}
                          containerSize={m.containerSize || 5}
                          usagePerTap={m.usagePerTap || 0.012}
                        />
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${
                          m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                        }`}>{m.status}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">No telemetry machines currently active</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
