'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axiosInstance from '../../../lib/axios';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
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
  const [rowPadding, setRowPadding] = useState('py-2');

  // S.No, Version, Cost Tier, Uploaded Date, Download URL
  const { widths, startResize } = useResizableColumns([60, 120, 120, 240, 200]);

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header - Flat Style */}
        <div className="bg-white border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Firmware & QR Management
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Update machine software versions and manage UPI cost-tier overrides.
            </p>
          </div>
          {form.machineId && machineExists && currentQRValue !== null && (
            <div className="bg-gray-50 border border-gray-200 px-3 py-2 text-gray-800 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Cost Config</span>
              <div className="text-lg font-bold font-mono">₹{qrValueToAmount(currentQRValue)}</div>
              <div className="text-[9px] text-gray-400 font-mono">Tier Index: {currentQRValue}</div>
            </div>
          )}
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Upload Form Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FiUploadCloud className="text-blue-500" /> Upload Software Update
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Machine ID Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Machine ID</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiHardDrive size={14} />
                      </div>
                      <input
                        type="text"
                        name="machineId"
                        value={form.machineId}
                        onChange={handleChange}
                        placeholder="e.g., FP_MACHINE_01"
                        className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Machine Name Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Machine Friendly Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiInfo size={14} />
                      </div>
                      <input
                        type="text"
                        name="machineName"
                        value={form.machineName}
                        onChange={handleChange}
                        placeholder="e.g., Koramangala Kiosk 01"
                        className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount selection Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Target Amount Tier</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiDollarSign size={14} />
                    </div>
                    <select
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none cursor-pointer"
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
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Firmware File (.bin) <span className="text-gray-400 font-normal">(Optional for info updates)</span></label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border border-dashed p-6 flex flex-col items-center justify-center transition-colors min-h-[140px] select-none cursor-pointer
                      ${dragActive ? 'border-blue-500 bg-blue-50/10' : 'border-gray-200 hover:border-gray-300 bg-gray-50/20'}`}
                  >
                    <input
                      type="file"
                      accept=".bin"
                      onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {!file ? (
                      <div className="text-center space-y-2">
                        <div className="text-gray-400 inline-flex">
                          <FiUploadCloud size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Drag and drop firmware file here</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Only .bin files up to 15MB are accepted</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-blue-50/40 border border-blue-100 p-3 rounded w-full max-w-sm relative">
                        <div className="p-2 bg-blue-500 text-white rounded">
                          <FiFile size={16} />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-bold text-blue-900 truncate">{file.name}</p>
                          <p className="text-[10px] text-blue-500 mt-0.5 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                          className="absolute right-3 p-1 text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {loading && uploadProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                      <span>Uploading Firmware...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
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
          <div className="space-y-6">
            
            {/* Quick cost mapping tool */}
            {showQRPanel && (
              <div className="bg-white border border-gray-200 p-6">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiTrendingUp className="text-indigo-500" /> Cost Tier Modifier
                </h2>
                <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
                  Modify the cost tier index dynamically without compiling/uploading new firmware versions.
                </p>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">New Pricing Map</label>
                    <select
                      value={newQRValue}
                      onChange={(e) => setNewQRValue(e.target.value)}
                      className="block w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs font-medium text-gray-900 bg-gray-50/30 focus:outline-none"
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
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {qrUpdating ? <FiLoader className="animate-spin" /> : <FiEdit2 size={12} />} Save overrides
                  </button>
                </div>
              </div>
            )}

            {/* Firmware check indicators */}
            <div className="bg-white border border-gray-200 p-6 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Node Status</h3>
              
              {checkingMachine ? (
                <div className="flex items-center gap-2 text-[11px] text-gray-500 py-1 font-mono">
                  <FiLoader className="animate-spin text-blue-500" /> Searching database records...
                </div>
              ) : form.machineId ? (
                machineExists ? (
                  <div className="flex items-start gap-2 bg-green-50 text-green-800 p-3 border border-green-200 text-xs">
                    <FiCheckCircle className="text-green-600 mt-0.5 shrink-0" size={14} />
                    <div className="space-y-0.5">
                      <span className="font-bold uppercase text-[10px]">Kiosk Profile Verified</span>
                      <p className="text-green-600">This machine has existing firmware records.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 border border-amber-200 text-xs">
                    <FiAlertCircle className="text-amber-600 mt-0.5 shrink-0" size={14} />
                    <div className="space-y-0.5">
                      <span className="font-bold uppercase text-[10px]">New Kiosk Profile</span>
                      <p className="text-amber-600">No records found. The first configuration will initialize profile version history.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-2 bg-gray-50 text-gray-500 p-3 border border-gray-200 text-[11px] leading-relaxed">
                  <FiInfo className="text-gray-400 mt-0.5 shrink-0" size={14} />
                  <div>
                    Type a Machine ID in the form to pull version logs and pricing configurations.
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* History / Logs Section */}
        {form.machineId && machineExists && (
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <FiFile className="text-blue-500" /> Version History Logs
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={rowPadding}
                  onChange={(e) => setRowPadding(e.target.value)}
                  className="bg-white border border-gray-200 px-2 py-1 rounded text-[10px] focus:outline-none cursor-pointer font-semibold text-gray-600 shadow-sm"
                  title="Row Height"
                >
                  <option value="py-1">Compact Height</option>
                  <option value="py-2.5">Standard Height</option>
                  <option value="py-4">Tall Height</option>
                </select>
                <button 
                  onClick={() => fetchHistory(form.machineId)}
                  className="p-1 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-50 transition-colors"
                  title="Refresh logs"
                >
                  <FiRefreshCw className={loadingHistory ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 text-xs text-gray-400 gap-2 font-mono">
                <FiLoader className="animate-spin text-blue-500" /> Reading repository logs...
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[650px]">
                  <colgroup>
                    {widths.map((w, i) => (
                      <col key={i} style={{ width: w }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[10px] uppercase tracking-wider select-none">
                      <th className="py-2.5 px-4 border-r border-gray-200 relative">
                        S.No
                        <div onMouseDown={(e) => startResize(0, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                      </th>
                      <th className="py-2.5 px-4 border-r border-gray-200 relative">
                        Version
                        <div onMouseDown={(e) => startResize(1, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                      </th>
                      <th className="py-2.5 px-4 border-r border-gray-200 text-right relative">
                        Cost Tier
                        <div onMouseDown={(e) => startResize(2, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                      </th>
                      <th className="py-2.5 px-4 border-r border-gray-200 relative">
                        Uploaded Date
                        <div onMouseDown={(e) => startResize(3, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                      </th>
                      <th className="py-2.5 px-4 relative">
                        Download URL
                        <div onMouseDown={(e) => startResize(4, e)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
                    {history.map((fw, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-gray-500 font-medium whitespace-normal break-words select-text`}>
                          {index + 1}
                        </td>
                        <td className={`${rowPadding} px-4 border-r border-gray-200 whitespace-normal break-words select-text`}>
                          <span className="inline-flex px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 rounded text-[10px] font-bold font-mono">
                            v{fw.version}
                          </span>
                        </td>
                        <td className={`${rowPadding} px-4 border-r border-gray-200 text-right font-mono font-medium whitespace-normal break-words select-text`}>₹{qrValueToAmount(fw.qrvalue)}</td>
                        <td className={`${rowPadding} px-4 border-r border-gray-200 font-mono text-[11px] text-gray-500 whitespace-normal break-words select-text`}>
                          {new Date(fw.uploadedAt).toLocaleString()}
                        </td>
                        <td className={`${rowPadding} px-4 whitespace-normal break-words select-text`}>
                          <a 
                            href={fw.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 text-[11px] font-medium truncate max-w-xs"
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
              <div className="text-center py-8 text-gray-400 text-xs">
                No firmware logs recorded for this machine.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
