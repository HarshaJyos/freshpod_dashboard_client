'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleBack = () => {
    // Attempt to go back or log out and clear state
    router.replace('/');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-gray-50 to-red-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm animate-bounce">
          <FiAlertTriangle className="text-3xl" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Your account does not possess the correct authorization level to access this resource. Please verify your credentials or contact a system administrator.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleBack}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiArrowLeft className="text-lg" />
            Go to Landing Page
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer"
          >
            Log Out & Switch User
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          ErrorCode: 403_UNAUTHORIZED_RESOURCE_ACCESS
        </p>
      </div>
    </div>
  );
}
