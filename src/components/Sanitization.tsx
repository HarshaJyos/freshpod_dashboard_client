'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FiDroplet, FiX, FiRefreshCw, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import axiosInstance from '../lib/axios';

interface SanitizationIndicatorProps {
  totalTaps: number;
  machineId: string;
  containerSize?: number;
  usagePerTap?: number;
}

export const SanitizationIndicator = ({ 
  totalTaps, 
  machineId, 
  containerSize = 5, 
  usagePerTap = 0.012 
}: SanitizationIndicatorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refillData, setRefillData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const calculateCurrentPercentage = () => {
    if (!refillData || !refillData.hasRefill) {
      const usedLiquid = totalTaps * usagePerTap;
      const remaining = Math.max(0, containerSize - usedLiquid);
      return Math.min(100, (remaining / containerSize) * 100);
    }
    
    const startTapCount = refillData.startTapCount || 0;
    const tapsSinceRefill = Math.max(0, totalTaps - startTapCount);
    const usedLiquid = tapsSinceRefill * usagePerTap;
    const remaining = Math.max(0, containerSize - usedLiquid);
    return Math.min(100, (remaining / containerSize) * 100);
  };

  const percentage = calculateCurrentPercentage();

  useEffect(() => {
    const fetchRefillData = async () => {
      if (!machineId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get(`/api/refill/${machineId}/start-tapcount`);
        const data = response.data;
        
        if (data.success && data.data && data.data.hasRefill) {
          setRefillData(data.data);
        } else {
          setRefillData({ hasRefill: false, startTapCount: 0 });
        }
      } catch (error) {
        console.error('Error fetching refill data:', error);
        setRefillData({ hasRefill: false, startTapCount: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchRefillData();
  }, [machineId]);

  const hasRefill = refillData?.hasRefill || false;

  const getStatusDot = () => {
    if (loading) return '⏳';
    if (percentage > 60) return '🟦';
    if (percentage > 30) return '🟨';
    return '🟥';
  };

  const getStatusColor = () => {
    if (percentage > 60) return 'text-blue-600';
    if (percentage > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 cursor-default">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">Loading</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer"
        title="Click for sanitization details"
      >
        <span className="text-sm">{getStatusDot()}</span>
        <span className={`text-xs font-bold ${getStatusColor()}`}>
          {Math.round(percentage)}%
        </span>
        <FiDroplet className={`text-[10px] ${
          percentage > 60 ? 'text-blue-400' : 
          percentage > 30 ? 'text-yellow-400' : 
          'text-red-400'
        } group-hover:opacity-100 opacity-50 transition-opacity`} />
        {hasRefill && (
          <span className="text-[8px] text-green-400 ml-0.5">✓</span>
        )}
      </button>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  percentage > 60 ? 'bg-blue-100' : 
                  percentage > 30 ? 'bg-yellow-100' : 
                  'bg-red-100'
                }`}>
                  <FiDroplet className={`text-base ${
                    percentage > 60 ? 'text-blue-600' : 
                    percentage > 30 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Sanitization</h3>
                  <p className="text-[10px] text-gray-500 font-mono">#{machineId}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <FiX className="text-lg text-gray-500" />
              </button>
            </div>
            
            <div className="p-4">
              <SanitizationLevel 
                machineId={machineId}
                totalTaps={totalTaps}
                containerSize={containerSize}
                usagePerTap={usagePerTap}
                externalRefillData={refillData}
                onRefillComplete={() => {
                  setIsModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface SanitizationLevelProps {
  machineId: string;
  totalTaps: number;
  containerSize?: number;
  usagePerTap?: number;
  externalRefillData?: any;
  onRefillComplete?: () => void;
}

export const SanitizationLevel = ({
  machineId,
  totalTaps,
  containerSize = 5,
  usagePerTap = 0.012,
  externalRefillData,
  onRefillComplete
}: SanitizationLevelProps) => {
  const [refillData, setRefillData] = useState<any>(externalRefillData || null);
  const [isLoading, setIsLoading] = useState(!externalRefillData);
  const [isRefilling, setIsRefilling] = useState(false);
  const [refillProgress, setRefillProgress] = useState(0);
  const [refillSuccess, setRefillSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States derived from refill data
  const [hasRefill, setHasRefill] = useState(false);
  const [startTapCount, setStartTapCount] = useState(0);
  const [refillStartTime, setRefillStartTime] = useState<string | null>(null);
  const [refillQuantity, setRefillQuantity] = useState(containerSize);
  const [liquidLevel, setLiquidLevel] = useState(containerSize);

  useEffect(() => {
    if (externalRefillData) {
      setRefillData(externalRefillData);
      setHasRefill(externalRefillData.hasRefill || false);
      setStartTapCount(externalRefillData.startTapCount || 0);
      setRefillStartTime(externalRefillData.timestamp || null);
      setRefillQuantity(externalRefillData.containerSize || containerSize);
      setIsLoading(false);
    }
  }, [externalRefillData, containerSize]);

  const percentage = useMemo(() => {
    if (!hasRefill) {
      const usedLiquid = totalTaps * usagePerTap;
      const remaining = Math.max(0, refillQuantity - usedLiquid);
      return Math.min(100, (remaining / refillQuantity) * 100);
    }
    const tapsSinceRefill = Math.max(0, totalTaps - startTapCount);
    const usedLiquid = tapsSinceRefill * usagePerTap;
    const remaining = Math.max(0, refillQuantity - usedLiquid);
    return Math.min(100, (remaining / refillQuantity) * 100);
  }, [totalTaps, startTapCount, hasRefill, refillQuantity, usagePerTap]);

  useEffect(() => {
    setLiquidLevel(Math.max(0, refillQuantity - (hasRefill ? Math.max(0, totalTaps - startTapCount) : totalTaps) * usagePerTap));
  }, [totalTaps, startTapCount, hasRefill, refillQuantity, usagePerTap]);

  const tapsSinceRefill = useMemo(() => {
    if (hasRefill) {
      return Math.max(0, totalTaps - startTapCount);
    }
    return totalTaps;
  }, [totalTaps, startTapCount, hasRefill]);

  const usedLiters = useMemo(() => {
    return refillQuantity - liquidLevel;
  }, [refillQuantity, liquidLevel]);

  const handleRefill = async () => {
    if (isRefilling) return;
    
    setError(null);
    setIsRefilling(true);
    setRefillProgress(0);
    setRefillSuccess(false);
    
    try {
      const currentTapCount = totalTaps || 0;
      
      const response = await axiosInstance.post(`/api/refill/${machineId}`, {
        tapCount: currentTapCount,
        containerSize: refillQuantity,
        usagePerTap: usagePerTap
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to start refill');
      }

      setStartTapCount(currentTapCount);
      setRefillStartTime(new Date().toISOString());
      setHasRefill(true);
      setRefillSuccess(true);
      setLiquidLevel(refillQuantity);

      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setRefillProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsRefilling(false);
          if (onRefillComplete) {
            setTimeout(onRefillComplete, 1000);
          }
        }
      }, 50);

    } catch (err: any) {
      console.error('Refill error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit refill');
      setIsRefilling(false);
    }
  };

  const getLiquidColor = () => {
    if (percentage > 60) return 'from-blue-500 to-blue-400';
    if (percentage > 30) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  const getGlowColor = () => {
    if (percentage > 60) return 'shadow-blue-500/20';
    if (percentage > 30) return 'shadow-yellow-500/20';
    return 'shadow-red-500/20';
  };

  const formatLiters = (liters: number) => {
    if (liters < 0.001) return '0 mL';
    if (liters < 1) return `${Math.round(liters * 1000)} mL`;
    return `${liters.toFixed(2)} L`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {refillSuccess && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <FiCheckCircle className="text-green-500 text-sm animate-pulse" />
          <p className="text-[10px] text-green-700 font-medium">Refill completed! Fluid is at 100% capacity.</p>
        </div>
      )}

      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            percentage > 60 ? 'bg-blue-500' : 
            percentage > 30 ? 'bg-yellow-500' : 
            'bg-red-500'
          } animate-pulse`} />
          <span className="text-xs font-semibold text-gray-700">
            {percentage > 60 ? 'Optimal' : percentage > 30 ? 'Moderate' : 'Refill Critical'}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-900">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-gray-600 space-y-1">
        <div className="flex justify-between font-bold text-gray-800">
          <span>Container Size:</span>
          <span>{refillQuantity}L</span>
        </div>
        <div>Usage Rate: {usagePerTap * 1000} ml/tap</div>
        <div>Taps logged since last refill: {tapsSinceRefill.toLocaleString()}</div>
        <div>Fluid consumed: {formatLiters(usedLiters)}</div>
      </div>

      <div className="relative">
        <div className="relative bg-gray-100 rounded-xl p-0.5 border border-gray-200">
          <div 
            className={`relative h-12 rounded-lg bg-gradient-to-r ${getLiquidColor()} transition-all duration-1000 ease-in-out ${getGlowColor()} shadow-lg`}
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent animate-pulse" />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-black ${
            percentage > 60 ? 'text-blue-900' : 
            percentage > 30 ? 'text-yellow-900' : 
            'text-red-900'
          }`}>
            {Math.round(percentage)}% Remaining
          </span>
        </div>
      </div>

      {/* Action */}
      <button 
        onClick={handleRefill}
        disabled={isRefilling}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FiRefreshCw className={isRefilling ? 'animate-spin' : ''} />
        {isRefilling ? `Refilling Kiosk (${refillProgress}%)` : 'Refill to Full Container'}
      </button>
    </div>
  );
};
