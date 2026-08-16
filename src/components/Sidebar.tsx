'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  ShieldCheck,
  Users,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  Clock,
  FileText,
  CreditCard,
  LucideIcon,
  Trash2,
  Cpu
} from 'lucide-react';

interface MenuItem {
  path: string;
  name: string;
  icon: LucideIcon;
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Admin Menu Items
  const adminMenuItems: MenuItem[] = [
    { path: "/admin", name: "Overview", icon: LayoutGrid },
    { path: "/admin/machine", name: "Machines", icon: ShieldCheck },
    { path: "/admin/user", name: "User Directory", icon: Users },
    { path: "/admin/analytics", name: "Analytics", icon: BarChart3 },
    { path: "/admin/health", name: "System Health", icon: Activity },
    { path: "/admin/payments", name: "Payments", icon: CreditCard },
    { path: "/admin/firmware", name: "Firmware OTA", icon: Cpu },
    { path: "/admin/trash", name: "Trash Bin", icon: Trash2 },
    { path: "/admin/settings", name: "Settings", icon: Settings },
  ];

  // Dealership Menu Items
  const dealershipMenuItems: MenuItem[] = [
    { path: "/dealership", name: "Dashboard", icon: LayoutGrid },
    { path: "/dealership/machines", name: "My Machines", icon: ShieldCheck },
    { path: "/dealership/users", name: "User Directive", icon: Users },
    { path: "/dealership/analytics", name: "Analytics", icon: BarChart3 },
    { path: "/dealership/payments", name: "Payments", icon: CreditCard },
    { path: "/dealership/settings", name: "Settings", icon: Settings },
  ];

  // Customer Menu Items
  const customerMenuItems: MenuItem[] = [
    { path: "/customer", name: "Overview", icon: LayoutGrid },
    { path: "/customer/machines", name: "My Machines", icon: ShieldCheck },
    { path: "/customer/reports", name: "Reports", icon: FileText }, 
    { path: "/customer/analytics", name: "Analytics", icon: BarChart3 },
    { path: "/customer/payments", name: "Payments", icon: CreditCard },
    { path: "/customer/settings", name: "Settings", icon: Settings },
  ];

  // Operator Menu Items
  const operatorMenuItems: MenuItem[] = [
    { path: "/operator", name: "Dashboard", icon: LayoutGrid },
    { path: "/operator/machines", name: "My Machines", icon: ShieldCheck },
    { path: "/operator/history", name: "History", icon: Clock },
    { path: "/operator/payments", name: "Payments", icon: CreditCard },
  ];

  // Get menu items based on role
  const getMenuItems = (): MenuItem[] => {
    switch(userRole) {
      case 'admin': 
        return adminMenuItems;
      case 'dealership': 
        return dealershipMenuItems;
      case 'customer': 
        return customerMenuItems;
      case 'operator': 
        return operatorMenuItems;
      default: 
        return [];
    }
  };

  const menuItems = getMenuItems();

  // Role-specific brand text
  const getBrandSubtext = () => {
    switch(userRole) {
      case 'admin': return "Admin Portal";
      case 'dealership': return "Dealership Portal";
      case 'customer': return "Customer Portal";
      case 'operator': return "Operator Portal";
      default: return "Your Helmet Hygiene partner";
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-[1001] bg-white p-2 rounded-md shadow-md border border-gray-100 text-gray-600"
        onClick={toggleMobileSidebar}
      >
        {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
      </button>

      {/* Sidebar Container */}
      <aside className={`
        fixed left-0 top-0 h-full z-[1000] 
        bg-[#F8F9FE] w-72 border-r border-gray-100
        transition-transform duration-300 ease-in-out
        flex flex-col
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Scrollable Upper Area */}
        <div className="flex-1 overflow-y-auto select-none">
          {/* Branding Section */}
          <div className="flex items-center gap-4 px-8 py-10">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-blue-100 bg-white">
              {/* Fallback box with nice gradient instead of breaking layout if asset missing */}
              <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg">
                FP
              </div>
            </div>
            <div>
              <h1 className="text-[#1A1C1E] font-bold text-xl tracking-tight leading-tight">
                Freshpod
              </h1>
              <p className="text-[#8E97A4] text-[10px] font-bold tracking-[0.1em] uppercase mt-0.5">
                {getBrandSubtext()}
              </p>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="px-6 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Logged in as</p>
                <p className="text-sm font-bold text-gray-900 mt-1 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                <div className="mt-2 inline-flex px-2 py-1 bg-blue-50 rounded-lg">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">{user.role}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-6 space-y-2 pb-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              // Check if path is active (exact match or prefix match for subpages)
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-white text-[#4D7CFF] shadow-sm shadow-blue-100/50 border border-gray-100' 
                      : 'text-[#8E97A4] hover:bg-gray-200/50 hover:text-[#5C6370]'
                    }
                  `}
                >
                  <Icon size={22} className="transition-colors" />
                  <span className="font-semibold text-[15px]">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <div className="border-t border-gray-100/80 p-6 shrink-0 bg-[#F8F9FE]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-6 py-4 w-full rounded-2xl text-[#8E97A4] hover:bg-red-50 hover:text-red-500 transition-all duration-200 group"
          >
            <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-semibold text-[15px]">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] lg:hidden animate-in fade-in duration-300"
          onClick={toggleMobileSidebar}
        />
      )}
    </>
  );
}
