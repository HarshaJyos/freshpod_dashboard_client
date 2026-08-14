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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Support Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Audit, monitor, and submit support/sanitization reports</p>
        </div>
        <Link
          href="/customer/reports/create"
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm shadow-blue-100 cursor-pointer"
        >
          <FiPlus /> New Report
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm mb-6">
          <FiAlertCircle />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">Total Reports</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">Resolved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.solved}</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'solved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === f 
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.toUpperCase()} ({f === 'all' ? stats.total : f === 'pending' ? stats.pending : stats.solved})
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Link
            key={report.reportId}
            href={`/customer/reports/${report.reportId}`}
            className="block bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 leading-tight">{report.subject}</h3>
                <p className="text-xs text-gray-400 truncate max-w-2xl">{report.description}</p>
                <div className="flex items-center gap-3 pt-3 text-[10px] text-gray-400 font-semibold">
                  <span>ID: {report.reportId}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><FiCalendar /> {new Date(report.createdAt).toLocaleString()}</span>
                  {report.resolvedAt && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Resolved: {new Date(report.resolvedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(report.status)}</div>
            </div>
          </Link>
        ))}

        {filteredReports.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 text-sm">No support logs registered under this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
