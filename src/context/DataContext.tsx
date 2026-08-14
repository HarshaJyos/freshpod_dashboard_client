'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import axiosInstance from '../lib/axios';

export interface Log {
  tapCount?: number;
  taps?: number;
  count?: number;
  [key: string]: any;
}

export interface Machine {
  _id?: string;
  machineId: string;
  location: string;
  state?: string;
  country?: string;
  costPerTap?: number;
  machineCost?: number;
  status: string;
  logs?: Record<string, Log>;
  owner?: string;
  totalRevenue?: number;
  monthlyRevenue?: number;
  assignedTo?: string;
  dealership?: string;
  operatorId?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  [key: string]: any;
}

interface DataContextType {
  machines: Record<string, Machine>;
  loading: boolean;
  error: any;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [machines, setMachines] = useState<Record<string, Machine>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { isAuthenticated, accessToken, userRole } = useAuth();

  const fetchMachineData = async () => {
    if (!isAuthenticated || !userRole) {
      setMachines({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Map role to endpoint
      const endpointMap: Record<string, string> = {
        'admin': '/admin/machine/data',
        'customer': '/customer/machines',
        'dealership': '/dealership/machine/data',
        'operator': '/operator/machines'
      };
      
      const endpoint = endpointMap[userRole] || '/admin/machine/data';
      console.log(`📡 Fetching data for ${userRole} from: ${endpoint}`);
      
      const response = await axiosInstance.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      // Convert array to object keyed by machineId or _id
      const machinesData: Record<string, Machine> = {};
      if (Array.isArray(response.data)) {
        response.data.forEach((item: Machine) => {
          const key = item.machineId || item._id;
          if (key) {
            machinesData[key] = {
              ...item,
              logs: item.logs || {}
            };
          }
        });
      }
      
      console.log(`✅ Loaded ${Object.keys(machinesData).length} machines for ${userRole}`);
      setMachines(machinesData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch machine data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachineData();
  }, [isAuthenticated, accessToken, userRole]);

  return (
    <DataContext.Provider value={{ machines, loading, error, refetch: fetchMachineData }}>
      {children}
    </DataContext.Provider>
  );
};
