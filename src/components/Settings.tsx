'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../lib/axios';
import { 
  FiSettings, FiUsers, FiLock, FiSave,
  FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function AccountSettings() {
  const { user, accessToken, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });
  
  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        location: user.location || '',
        razorpayKeyId: user.razorpayKeyId || '',
        razorpayKeySecret: user.razorpayKeySecret || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axiosInstance.put('/user/update-profile', profileData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Profile updated successfully!');
      
      // Update local storage info
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        localStorage.setItem('user', JSON.stringify({ ...u, ...profileData }));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    if (securityData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters!');
      return;
    }
    
    setLoading(true);
    try {
      await axiosInstance.post('/user/change-password', {
        oldPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Password changed successfully!');
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: FiUsers, roles: ['admin', 'dealership', 'customer'] },
    { id: 'security', label: 'Security & Access', icon: FiLock, roles: ['admin', 'dealership', 'customer'] }
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(userRole || ''));

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Portal Configurations</h1>
        <p className="text-gray-500 text-xs mt-1">Configure profile data, API key access credentials, and security parameters</p>
      </div>

      {/* Tabs - Flat Style */}
      <div className="bg-white border border-gray-200 overflow-hidden mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/30'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="max-w-2xl space-y-4">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Profile Information</h2>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Address (Read-only)</label>
                <input
                  type="email"
                  disabled
                  value={profileData.email}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-400 rounded px-3 py-1.5 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({...profileData, phoneNumber: e.target.value})}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Region / Location</label>
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              {(userRole === 'dealership' || userRole === 'customer') && (
                <div className="pt-4 border-t border-gray-200 mt-6 space-y-4">
                  <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">Razorpay Custom Credentials</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Razorpay Key ID</label>
                    <input
                      type="text"
                      value={profileData.razorpayKeyId}
                      onChange={(e) => setProfileData({...profileData, razorpayKeyId: e.target.value})}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400 font-mono"
                      placeholder="rzp_live_..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Razorpay Secret Key</label>
                    <input
                      type="password"
                      value={profileData.razorpayKeySecret}
                      onChange={(e) => setProfileData({...profileData, razorpayKeySecret: e.target.value})}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FiSave size={12} /> {loading ? 'Saving Changes...' : 'Save Profile Settings'}
              </button>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="max-w-2xl space-y-4">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Security Settings</h2>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Current Password *</label>
                <input
                  type="password"
                  value={securityData.currentPassword}
                  onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Password *</label>
                <input
                  type="password"
                  value={securityData.newPassword}
                  onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={securityData.confirmPassword}
                  onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FiLock size={12} /> {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
