'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { 
  FiTrendingUp, FiBarChart2, FiCalendar, FiDollarSign, FiTarget, FiAward, FiUsers, FiCpu, FiTrendingDown
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

interface Machine {
  _id: string;
  machineId: string;
  location: string;
  machineCost?: number;
  assignedTo?: string;
  updatedAt?: string;
  createdAt: string;
}

export default function DealershipAnalytics() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState('monthly');

  const PROFIT_PER_MACHINE = 40000;

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get('/dealership/machines', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setMachines(response.data.machines || []);
    } catch (error) {
      console.error('Failed to fetch dealership analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [accessToken]);

  const soldMachines = useMemo(() => machines.filter(m => m.assignedTo), [machines]);
  const availableMachines = useMemo(() => machines.filter(m => !m.assignedTo), [machines]);
  const totalProfit = useMemo(() => soldMachines.length * PROFIT_PER_MACHINE, [soldMachines]);

  const salesTrend = useMemo(() => {
    const salesByMonth: Record<string, { month: string; sales: number; profit: number }> = {};
    
    soldMachines.forEach(machine => {
      const date = new Date(machine.updatedAt || machine.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (!salesByMonth[monthKey]) {
        salesByMonth[monthKey] = { month: monthName, sales: 0, profit: 0 };
      }
      salesByMonth[monthKey].sales += 1;
      salesByMonth[monthKey].profit += PROFIT_PER_MACHINE;
    });
    
    return Object.values(salesByMonth).slice(-6);
  }, [soldMachines]);

  const stats = useMemo(() => {
    const avgMachineCost = machines.length > 0 ? 
      machines.reduce((acc, m) => acc + (m.machineCost || 0), 0) / machines.length : 0;
    const conversionRate = machines.length > 0 ? 
      (soldMachines.length / machines.length) * 100 : 0;
    const monthlyAvgSales = salesTrend.length > 0 ? 
      Math.round(salesTrend.reduce((acc, m) => acc + m.sales, 0) / salesTrend.length) : 0;

    return {
      totalMachines: machines.length,
      soldMachines: soldMachines.length,
      availableMachines: availableMachines.length,
      totalProfit,
      profitPerMachine: PROFIT_PER_MACHINE,
      avgMachineCost,
      conversionRate,
      monthlyAvgSales,
      projectedAnnualProfit: totalProfit * 1.2
    };
  }, [machines, soldMachines, salesTrend, totalProfit]);

  const growthTrend = useMemo(() => {
    if (salesTrend.length < 2) return 0;
    const lastMonth = salesTrend[salesTrend.length - 1]?.sales || 0;
    const previousMonth = salesTrend[salesTrend.length - 2]?.sales || 0;
    if (previousMonth === 0) return lastMonth > 0 ? 100 : 0;
    return ((lastMonth - previousMonth) / previousMonth) * 100;
  }, [salesTrend]);

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dealership Sales Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Audit sales performances, conversion ratios, and dealer margins</p>
        </div>
        <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-medium shadow-sm">
          <FiCalendar /> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Inventory</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalMachines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Sold</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.soldMachines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Available Stock</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.availableMachines}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total profit</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">₹{(stats.totalProfit/1000).toFixed(1)}k</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Profit / Unit</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">₹{(stats.profitPerMachine/1000).toFixed(0)}k</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Conversion</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.conversionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className={`mb-6 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 ${
        growthTrend >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {growthTrend >= 0 ? (
            <FiTrendingUp className="text-green-600 text-xl" />
          ) : (
            <FiTrendingDown className="text-red-600 text-xl" />
          )}
          <div>
            <p className={`text-sm font-semibold ${growthTrend >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {growthTrend >= 0 ? '+' : ''}{growthTrend.toFixed(1)}% Sales growth rate
            </p>
            <p className="text-xs text-gray-500">Compared to previous monthly cycles</p>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-gray-500 font-semibold">Projected Annual Profit:</span>
          <span className="ml-2 font-bold text-purple-600">₹{(stats.projectedAnnualProfit/1000).toFixed(1)}k</span>
        </div>
      </div>

      {/* Chart */}
      {mounted && salesTrend.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base mb-6">
            <FiBarChart2 className="text-blue-600" /> Sales Volume and Profit margins
          </h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'profit') return [`₹${Number(value || 0).toLocaleString()}`, 'Profit'];
                    if (name === 'sales') return [value, 'Units Sold'];
                    return [value, name];
                  }}
                />
                <Bar yAxisId="left" dataKey="sales" fill="#3B82F6" name="Units Sold" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="profit" fill="#10B981" name="profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Units Sold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Profit (₹)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400 text-sm mb-6">
          No monthly sales metrics found.
        </div>
      )}

      {/* ROI summary card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Cost Outlay</p>
            <p className="text-xl font-bold text-gray-800 mt-1">₹{(stats.totalMachines * stats.avgMachineCost / 1000).toFixed(1)}k</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Profit returns</p>
            <p className="text-xl font-bold text-green-600 mt-1">₹{(stats.totalProfit/1000).toFixed(1)}k</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Dealer ROI</p>
            <p className="text-xl font-bold text-purple-600 mt-1">
              {stats.totalMachines * stats.avgMachineCost > 0 
                ? ((stats.totalProfit / (stats.totalMachines * stats.avgMachineCost)) * 100).toFixed(1)
                : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
