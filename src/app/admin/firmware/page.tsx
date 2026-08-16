'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { 
  FiCpu, FiFile, FiCheckCircle, FiAlertCircle, FiX, 
  FiLoader, FiInfo, FiHardDrive, FiDollarSign, 
  FiRefreshCw, FiEdit2, FiSave, FiUploadCloud, FiTrendingUp 
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface FirmwareHistoryItem {
  version: string;
  qrvalue: number;
  uploadedAt: string;
  url: string;
}

export default function FirmwareManagement() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({
    machineId: '',
    machineName: '',
    amount: ''
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);
  
  // QR Code related states
  const [showQRPanel, setShowQRPanel] = useState(false);
  const [currentQRValue, setCurrentQRValue] = useState<number | null>(null);
  const [newQRValue, setNewQRValue] = useState('');
  const [qrUpdating, setQrUpdating] = useState(false);
  const [machineExists, setMachineExists] = useState(false);
  const [checkingMachine, setCheckingMachine] = useState(false);
  const [history, setHistory] = useState<FirmwareHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Map qrvalue index back to amount
  const qrValueToAmount = (val: number): string => {
    const amountMap: { [key: number]: string } = {
      0: '49',
      1: '59',
      2: '69',
      3: '79',
      4: '89',
      5: '99',
      6: '109'
    };
    return amountMap[val] || 'Unknown';
  };

  // Check if machine exists when machineId changes
  const checkMachineExists = useCallback(async (mId: string) => {
    if (!mId || mId.trim() === '') {
      setMachineExists(false);
      setShowQRPanel(false);
      setHistory([]);
      return;
    }

    setCheckingMachine(true);
    try {
      const response = await axiosInstance.get(`/api/machine/${mId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data && response.data.exists) {
        setMachineExists(true);
        const qrVal = parseInt(response.data.qrValue);
        setCurrentQRValue(isNaN(qrVal) ? 0 : qrVal);
        setNewQRValue(response.data.qrValue || '0');
        setShowQRPanel(true);
        
        // Fetch history
        fetchHistory(mId);
      } else {
        setMachineExists(false);
        setShowQRPanel(false);
        setHistory([]);
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setMachineExists(false);
        setShowQRPanel(false);
        setHistory([]);
      } else {
        console.error('Error checking machine:', error);
      }
    } finally {
      setCheckingMachine(false);
    }
  }, [accessToken]);

  const fetchHistory = async (mId: string) => {
    setLoadingHistory(true);
    try {
      const response = await axiosInstance.get(`/firmware/${mId}/all`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.data && response.data.firmware) {
        setHistory(response.data.firmware);
      }
    } catch (error) {
      console.error('Error fetching firmware history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Debounced machine check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.machineId) {
        checkMachineExists(form.machineId);
      } else {
        setMachineExists(false);
        setShowQRPanel(false);
        setHistory([]);
      }
    }, 600);
    
    return () => clearTimeout(timer);
  }, [form.machineId, checkMachineExists]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setUploadStatus(null);
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.bin')) {
      toast.error('Only .bin firmware binary files are allowed.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      toast.error('File size should be less than 15MB.');
      return;
    }

    setFile(selectedFile);
    setUploadStatus(null);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);

  // Update only QR value for existing machine
  const handleQRUpdate = async () => {
    if (newQRValue === '') {
      toast.warn('Please select a QR mapping value.');
      return;
    }

    setQrUpdating(true);
    try {
      const response = await axiosInstance.put(`/api/machine/${form.machineId}/qr`, {
        qrValue: newQRValue
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.status === 200) {
        setCurrentQRValue(parseInt(newQRValue));
        toast.success('QR mapping value updated successfully!');
        fetchHistory(form.machineId);
      }
    } catch (error: any) {
      console.error('QR update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update QR mapping.');
    } finally {
      setQrUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.machineId || !form.machineName || !form.amount) {
      toast.warn('Please complete all machine information fields.');
      return;
    }

    const formData = new FormData();
    formData.append('machineId', form.machineId);
    formData.append('machineName', form.machineName);
    formData.append('amount', form.amount);
    if (file) {
      formData.append('file', file);
    }

    try {
      setLoading(true);
      setUploadProgress(0);
      setUploadStatus(null);

      const res = await axiosInstance.post('/add', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      toast.success(res.data.message || 'Operation completed successfully.');
      setUploadStatus('success');

      if (form.machineId) {
        checkMachineExists(form.machineId);
      }

      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
      const msg = err.response?.data?.message || 'Upload operation failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header card with styling */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 shadow-xl shadow-blue-900/10">
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 opacity-10">
            <FiCpu size={260} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white/10 text-blue-100 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <FiCpu className="animate-pulse" /> OTA Firmware Engine
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Firmware & QR Management
              </h1>
              <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
                Update machine software versions and manage UPI cost-tier overrides.
              </p>
            </div>
            
            {form.machineId && machineExists && currentQRValue !== null && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-white self-start sm:self-center">
                <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Active Cost Config</span>
                <div className="text-xl font-black mt-0.5">₹{qrValueToAmount(currentQRValue)}</div>
                <div className="text-[10px] text-blue-100 mt-1">Tier Index: {currentQRValue}</div>
              </div>
            )}
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Upload Form Card */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm shadow-gray-100/50">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FiUploadCloud className="text-blue-500" /> Upload Software Update
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Machine ID Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Machine ID</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiHardDrive className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="machineId"
                        value={form.machineId}
                        onChange={handleChange}
                        placeholder="e.g., FP_MACHINE_01"
                        className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium text-gray-900 bg-gray-50/30"
                      />
                    </div>
                  </div>

                  {/* Machine Name Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Machine Friendly Name</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiInfo className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="machineName"
                        value={form.machineName}
                        onChange={handleChange}
                        placeholder="e.g., Koramangala Kiosk 01"
                        className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium text-gray-900 bg-gray-50/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount selection Dropdown */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Target Amount Tier</label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiDollarSign className="text-gray-400" />
                    </div>
                    <select
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      className="block w-full pl-11 pr-10 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium text-gray-900 bg-gray-50/30 appearance-none"
                    >
                      <option value="">Select Target Price Tier</option>
                      <option value="49">₹49 (Index 0)</option>
                      <option value="59">₹59 (Index 1)</option>
                      <option value="69">₹69 (Index 2)</option>
                      <option value="79">₹79 (Index 3)</option>
                      <option value="89">₹89 (Index 4)</option>
                      <option value="99">₹99 (Index 5)</option>
                      <option value="109">₹109 (Index 6)</option>
                    </select>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Firmware File (.bin) <span className="text-gray-400 font-normal">(Optional for info updates)</span></label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all min-h-[180px] select-none cursor-pointer
                      ${dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300 bg-gray-50/10'}`}
                  >
                    <input
                      type="file"
                      accept=".bin"
                      onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {!file ? (
                      <div className="text-center space-y-3">
                        <div className="p-4 bg-gray-100 rounded-2xl inline-flex text-gray-500 hover:scale-105 transition-transform">
                          <FiUploadCloud size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">Drag and drop firmware file here</p>
                          <p className="text-xs text-gray-500 mt-1">Only .bin files up to 15MB are accepted</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 bg-blue-50/40 border border-blue-100 rounded-2xl p-4 w-full max-w-md relative">
                        <div className="p-3 bg-blue-500 text-white rounded-xl">
                          <FiFile size={20} />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="text-sm font-bold text-blue-900 truncate">{file.name}</p>
                          <p className="text-xs text-blue-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                          className="absolute right-4 p-1.5 text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {loading && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <span>Uploading Firmware...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all transform active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" /> Working...
                    </>
                  ) : (
                    <>
                      <FiSave /> Apply Configuration
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>

          {/* Sidebar Cost Tier Mapping Card & Info */}
          <div className="space-y-8">
            
            {/* Quick cost mapping tool */}
            {showQRPanel && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm shadow-gray-100/50">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiTrendingUp className="text-indigo-500" /> Cost Tier Modifier
                </h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  Modify the cost tier index dynamically without compiling/uploading new firmware versions.
                </p>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">New Pricing Map</label>
                    <select
                      value={newQRValue}
                      onChange={(e) => setNewQRValue(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium text-gray-900 bg-gray-50/30"
                    >
                      <option value="0">₹49 (Index 0)</option>
                      <option value="1">₹59 (Index 1)</option>
                      <option value="2">₹69 (Index 2)</option>
                      <option value="3">₹79 (Index 3)</option>
                      <option value="4">₹89 (Index 4)</option>
                      <option value="5">₹99 (Index 5)</option>
                      <option value="6">₹109 (Index 6)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleQRUpdate}
                    disabled={qrUpdating || newQRValue === currentQRValue?.toString()}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform active:scale-[0.98]"
                  >
                    {qrUpdating ? <FiLoader className="animate-spin" /> : <FiEdit2 />} Save overrides
                  </button>
                </div>
              </div>
            )}

            {/* Firmware check indicators */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm shadow-gray-100/50 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Node Status</h3>
              
              {checkingMachine ? (
                <div className="flex items-center gap-3 text-sm text-gray-500 py-2">
                  <FiLoader className="animate-spin text-blue-500" /> Searching database records...
                </div>
              ) : form.machineId ? (
                machineExists ? (
                  <div className="flex items-start gap-3 bg-green-50 text-green-800 rounded-2xl p-4 border border-green-100">
                    <FiCheckCircle className="text-green-500 mt-0.5 shrink-0" size={18} />
                    <div className="text-xs space-y-1">
                      <span className="font-extrabold uppercase">Kiosk Profile Verified</span>
                      <p className="text-green-600">This machine has existing firmware records.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-amber-50 text-amber-800 rounded-2xl p-4 border border-amber-100">
                    <FiAlertCircle className="text-amber-500 mt-0.5 shrink-0" size={18} />
                    <div className="text-xs space-y-1">
                      <span className="font-extrabold uppercase">New Machine Profile</span>
                      <p className="text-amber-600">No records found. The first configuration will initialize profile version history.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-3 bg-gray-50 text-gray-500 rounded-2xl p-4 border border-gray-100">
                  <FiInfo className="text-gray-400 mt-0.5 shrink-0" size={18} />
                  <div className="text-xs leading-relaxed">
                    Type a Machine ID in the form to pull version logs and pricing configurations.
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* History / Logs Section */}
        {form.machineId && machineExists && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm shadow-gray-100/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiFile className="text-blue-500" /> Version History Logs
              </h2>
              <button 
                onClick={() => fetchHistory(form.machineId)}
                className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh logs"
              >
                <FiRefreshCw className={loadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500 gap-2">
                <FiLoader className="animate-spin text-blue-500" /> Reading repository logs...
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm text-left">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium">Version</th>
                      <th className="py-4 px-6 font-medium">Cost Tier</th>
                      <th className="py-4 px-6 font-medium">Uploaded Date</th>
                      <th className="py-4 px-6 font-medium">Download URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {history.map((fw, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                            v{fw.version}
                          </span>
                        </td>
                        <td className="py-4 px-6">₹{qrValueToAmount(fw.qrvalue)}</td>
                        <td className="py-4 px-6 text-gray-500">
                          {new Date(fw.uploadedAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <a 
                            href={fw.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 text-xs truncate max-w-xs"
                          >
                            Download Firmware File
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                No firmware logs recorded for this machine.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
