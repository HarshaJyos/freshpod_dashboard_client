'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../lib/axios';
import { 
  FiShoppingCart, FiDollarSign, FiCalendar, FiBarChart2, FiAward, FiUsers
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface Stats {
  totalMachines: number;
  soldMachines: number;
  availableMachines: number;
  totalProfit: number;
  profitPerMachine: number;
}

interface Analytics {
  salesTrend: { month: string; sales: number; profit: number }[];
  totalProfit?: number;
}

export default function DealershipDashboard() {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats>({ 
    totalMachines: 0, 
    soldMachines: 0, 
    availableMachines: 0, 
    totalProfit: 0,
    profitPerMachine: 40000
  });
  const [analytics, setAnalytics] = useState<Analytics>({ salesTrend: [] });

  useEffect(() => {
    setMounted(true);
    fetchData(); 
    fetchAnalytics();
  }, [accessToken]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get('/dealership/dashboard', { 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      
      setStats({
        totalMachines: response.data.totalMachines || 0,
        soldMachines: response.data.soldMachines || 0,
        availableMachines: response.data.availableMachines || 0,
        totalProfit: response.data.totalProfit || response.data.totalRevenue || 0,
        profitPerMachine: response.data.profitPerMachine || 40000
      });
    } catch (error) { 
      console.error("Error fetching dashboard:", error); 
    } finally {
      setLoading(false); 
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axiosInstance.get('/dealership/analytics', { 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      setAnalytics(response.data);
    } catch (error) { 
      console.error("Error fetching analytics:", error); 
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dealership Partner Hub</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name || 'Partner'}</p>
        </div>
        <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-medium shadow-sm">
          <FiCalendar /> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Kiosks</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalMachines}</p>
          <div className="mt-2 text-[10px] text-gray-400 font-semibold">Registered inventory</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Allocated (Sold)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.soldMachines}</p>
          <div className="mt-2 text-[10px] text-gray-400 font-semibold">Active client nodes</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Available Stock</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.availableMachines}</p>
          <div className="mt-2 text-[10px] text-gray-400 font-semibold">Ready for dispatch</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Dealer Profit</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">₹{(stats.totalProfit / 1000).toFixed(1)}k</p>
          <div className="mt-2 text-[10px] text-gray-400 font-semibold">₹{(stats.profitPerMachine).toLocaleString()} / Kiosk</div>
        </div>
      </div>

      {/* Grid Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between h-40">
          <FiShoppingCart className="text-2xl opacity-80" />
          <div>
            <p className="text-xs opacity-80 font-semibold">Machines Sold</p>
            <p className="text-2xl font-black mt-1">{stats.soldMachines}</p>
            <p className="text-[10px] opacity-80 mt-1">Allocated out of {stats.totalMachines}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between h-40">
          <FiUsers className="text-2xl opacity-80" />
          <div>
            <p className="text-xs opacity-80 font-semibold">Clients Served</p>
            <p className="text-2xl font-black mt-1">{stats.soldMachines}</p>
            <p className="text-[10px] opacity-80 mt-1">Active customer profiles</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between h-40">
          <FiAward className="text-2xl opacity-80" />
          <div>
            <p className="text-xs opacity-80 font-semibold">Yield on Allocation</p>
            <p className="text-2xl font-black mt-1">₹{(stats.profitPerMachine).toLocaleString()}</p>
            <p className="text-[10px] opacity-80 mt-1">Net profit per kiosk unit</p>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      {mounted && analytics.salesTrend && analytics.salesTrend.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
              <FiBarChart2 className="text-blue-600" /> Monthly Sales Performance
            </h3>
            <span className="text-xs text-gray-500 font-semibold">
              Period Profit: ₹{((analytics.totalProfit || 0)/1000).toFixed(1)}k
            </span>
          </div>
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip formatter={(value: any) => [`₹${value}`, 'Profit']} />
                <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Profit (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400 text-sm">
          No monthly sales metrics registered.
        </div>
      )}
    </div>
  );
}
