'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
        <ToastContainer position="top-right" autoClose={3000} theme="light" />
      </DataProvider>
    </AuthProvider>
  );
}
