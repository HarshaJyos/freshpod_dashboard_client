'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axiosInstance from '../../../../lib/axios'; 
import { useAuth } from '../../../../context/AuthContext';
import { FiArrowLeft, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface ReportDetail {
  reportId: string;
  subject: string;
  description: string;
  status: string;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  customer?: {
    name: string;
    email: string;
  };
}

export default function CustomerReportDetail() {
  const params = useParams();
  const reportId = params?.reportId;
  const { accessToken } = useAuth();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReportDetail = async () => {
    if (!reportId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(`/customer/report/${reportId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.data.success) {
        setReport(response.data.report);
      } else {
        setError('Requested ticket logs were not found.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && reportId) {
      fetchReportDetail();
    }
  }, [accessToken, reportId]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-md w-full">
          <FiAlertCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <h3 className="font-bold text-gray-800 text-lg">Ticket Not Found</h3>
          <p className="text-gray-500 text-sm mt-1 mb-6">{error || 'The report does not exist or has been deleted.'}</p>
          <Link href="/customer/reports" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/customer/reports" className="p-2.5 bg-white border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl shadow-sm cursor-pointer">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Support Ticket Details</h1>
          <p className="text-gray-500 text-sm mt-0.5">Reference ID: {report.reportId}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-3xl overflow-hidden">
        {/* Header Block */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{report.subject}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                report.status === 'solved' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
              }`}>{report.status}</span>
              <span className="text-[10px] text-gray-400 font-bold">Created: {new Date(report.createdAt).toLocaleString()}</span>
            </div>
          </div>
          {report.resolvedAt && (
            <div className="text-xs font-bold text-green-600 text-right">
              Resolved: {new Date(report.resolvedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Content Block */}
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed font-medium">
              {report.description}
            </div>
          </div>

          {report.status === 'solved' && report.resolutionNotes && (
            <div className="bg-green-50/50 border border-green-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FiCheckCircle /> Resolution Action Details
              </h4>
              <p className="text-sm text-green-950 font-semibold">{report.resolutionNotes}</p>
            </div>
          )}

          {report.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-xs text-yellow-800">
              Our technical operations desk is actively assessing the ticket. Any hardware/price index adjustments will resolve this status automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
