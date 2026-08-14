'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axiosInstance from '../../../../lib/axios'; 
import { useAuth } from '../../../../context/AuthContext';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function CustomerCreateReport() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      setError('Subject and Description are required parameters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.post('/customer/report/create', formData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        toast.success('Support report created successfully!');
        router.push('/customer/reports');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit report. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/customer/reports" className="p-2.5 bg-white border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl shadow-sm cursor-pointer">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Support Ticket</h1>
          <p className="text-gray-500 text-sm mt-0.5">Submit technical problems or sanitization requests</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm mb-6 max-w-2xl">
          <FiAlertCircle className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-2xl overflow-hidden p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ticket Subject *</label>
            <input 
              type="text" 
              required
              maxLength={200}
              placeholder="e.g. Dispenser QR showing wrong price index"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Detailed Description *</label>
            <textarea 
              required
              rows={6}
              maxLength={1000}
              placeholder="Provide exact machine node ID and descriptive parameters of what occurred..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
            />
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-1">
            <p className="font-bold">📝 Submission Checklist:</p>
            <p>• Include the specific dispenser kiosk Node ID (e.g. KIOSK_01).</p>
            <p>• Note any payment reference details if transaction disputes occurred.</p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Link href="/customer/reports" className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-600 cursor-pointer">Cancel</Link>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold cursor-pointer">
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
