'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '../lib/axios';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [userData, setUserData] = useState<{ name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/user/profile');
      if (response.data) {
        setUserData(response.data);
      }
    } catch (error) {
      console.error('Error fetching user profile in header:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = () => {
    const role = userData?.role || user?.role;
    switch(role) {
      case 'admin':
        return 'System Administrator';
      case 'dealership':
        return 'Dealership Partner';
      case 'customer':
        return 'Customer';
      case 'operator':
        return 'Operator';
      default:
        return 'User';
    }
  };

  const getDisplayName = () => {
    const name = userData?.name || user?.name || 'User';
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getInitials = () => {
    const name = userData?.name || user?.name || 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-72 z-[990] h-20 bg-[#F8F9FE]/95 backdrop-blur-md border-b border-gray-100">
      <div className="h-full flex items-center justify-end px-4 md:px-8 max-w-7xl mx-auto lg:mx-0 lg:pr-8">
        
        {/* User Profile - Simple Display */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="text-right">
            {loading && !user ? (
              <>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
              </>
            ) : (
              <>
                <p className="text-[14px] font-bold text-[#1A1C1E] leading-tight">
                  {getDisplayName()}
                </p>
                <p className="text-[10px] text-[#8E97A4] font-bold uppercase tracking-wider mt-0.5">
                  {getRoleDisplayName()}
                </p>
              </>
            )}
          </div>
          
          {/* User Avatar/Initials */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4D7CFF] to-[#0052FF] flex items-center justify-center text-white font-bold border-2 border-white shadow-sm shadow-blue-100">
            {getInitials()}
          </div>
        </div>
      </div>
    </header>
  );
}
