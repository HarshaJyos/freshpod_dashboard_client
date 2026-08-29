'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axiosInstance from '../../../lib/axios'; 
import { useAuth } from '../../../context/AuthContext';
import { FiCalendar, FiPlus, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface Report {
  reportId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

export default function CustomerReports() {
  const { accessToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, solved: 0 });
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/customer/reports', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.data.success) {
        setReports(response.data.reports || []);
        setStats(response.data.statistics || { total: 0, pending: 0, solved: 0 });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchReports();
    }
  }, [accessToken]);

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'solved') {
      return (
        <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase">
          Solved
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-bold uppercase animate-pulse">
        Pending
      </span>
    );
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Support Requests</h1>
          <p className="text-gray-500 text-xs mt-1">Audit, monitor, and submit support/sanitization reports</p>
        </div>
        <Link
          href="/customer/reports/create"
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer"
        >
          <FiPlus /> New Report
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs mb-4 flex items-center gap-2">
          <FiAlertCircle />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Row - Flat PowerBI Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Reports</p>
          <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{stats.total}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pending Review</p>
          <p className="text-xl font-bold text-yellow-600 mt-1 font-mono">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Resolved</p>
          <p className="text-xl font-bold text-green-600 mt-1 font-mono">{stats.solved}</p>
        </div>
      </div>

      {/* Filter Options - Flat Style */}
      <div className="flex gap-1.5 mb-4">
        {['all', 'pending', 'solved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
              filter === f 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.toUpperCase()} ({f === 'all' ? stats.total : f === 'pending' ? stats.pending : stats.solved})
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.map((report) => (
          <Link
            key={report.reportId}
            href={`/customer/reports/${report.reportId}`}
            className="block bg-white border border-gray-200 p-4 hover:border-gray-300 transition-all"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-900 leading-tight">{report.subject}</h3>
                <p className="text-xs text-gray-500 truncate max-w-2xl">{report.description}</p>
                <div className="flex items-center gap-3 pt-2 text-[10px] text-gray-400 font-semibold">
                  <span className="font-mono text-gray-600">ID: {report.reportId}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono"><FiCalendar /> {new Date(report.createdAt).toLocaleString()}</span>
                  {report.resolvedAt && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 font-mono">Resolved: {new Date(report.resolvedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex px-2 py-0.5 rounded uppercase text-[9px] font-bold ${
                  report.status === 'solved' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {report.status}
                </span>
              </div>
            </div>
          </Link>
        ))}

        {filteredReports.length === 0 && (
          <div className="py-12 text-center bg-white border border-gray-200 text-gray-400 text-xs">
            No support logs registered under this filter.
          </div>
        )}
      </div>
    </div>
  );
}
