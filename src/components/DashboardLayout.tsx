'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userRole, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Define layout structures
  const isAuthPage = pathname === '/login' || pathname === '/unauthorized';
  const isLandingPage = pathname === '/';
  const isDashboardRoute = pathname.startsWith('/admin') || 
                           pathname.startsWith('/dealership') || 
                           pathname.startsWith('/customer') || 
                           pathname.startsWith('/operator');

  useEffect(() => {
    if (loading) return;

    // Route Guards
    if (isDashboardRoute) {
      if (!isAuthenticated) {
        console.log('🛑 Unauthenticated dashboard access. Redirecting to /login');
        router.replace('/login');
        return;
      }

      // Check role specific access
      if (pathname.startsWith('/admin') && userRole !== 'admin') {
        router.replace('/unauthorized');
      } else if (pathname.startsWith('/dealership') && userRole !== 'dealership') {
        router.replace('/unauthorized');
      } else if (pathname.startsWith('/customer') && userRole !== 'customer') {
        router.replace('/unauthorized');
      } else if (pathname.startsWith('/operator') && userRole !== 'operator') {
        router.replace('/unauthorized');
      }
    }
  }, [loading, isAuthenticated, userRole, pathname, router, isDashboardRoute]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FE] text-gray-500 font-sans font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
          <span>Verifying Credentials...</span>
        </div>
      </div>
    );
  }

  // No layout wrapper for landing page or auth screens
  if (isLandingPage || isAuthPage) {
    return <>{children}</>;
  }

  // Dashboard layout configuration
  const showNav = isAuthenticated && isDashboardRoute;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {showNav && <Sidebar />}
      {showNav && <Header />}
      <main className={`${showNav ? 'lg:pl-72 pt-20' : ''}`}>
        {children}
      </main>
    </div>
  );
}
