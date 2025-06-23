// frontend/src/pages/Analytics.jsx

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import baseURL from '../Services/baseURL';
import { CheckCircle, XCircle, AlertCircle, X, File as FileIcon, UploadCloud, Trash2, Download } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const AlertMessage = ({ message, type, onClear }) => {
  if (!message) return null;
  const styles = {
    success: 'bg-green-100 border-green-400 text-green-800',
    error: 'bg-red-100 border-red-400 text-red-800',
    info: 'bg-blue-100 border-blue-400 text-blue-800',
  };
  const Icon = { success: CheckCircle, error: XCircle, info: AlertCircle }[type];

  return (
    <div className={`mt-4 p-4 border rounded-lg flex items-center justify-between shadow-md ${styles[type]}`}>
      <div className="flex items-center">
        <Icon className="w-5 h-5 mr-3" />
        <span className="font-medium">{message}</span>
      </div>
      <button onClick={onClear} className="p-1 rounded-full hover:bg-black/10">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function Analytics() {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null); // Starts empty
  const [selectedArea, setSelectedArea] = useState('');
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef(null);
  const allowedFileTypes = '.pdf,.docx,.doc,.xlsx,.xls,.txt,.csv';

  // This logic is now handled by the API on each upload
  const growingMedicinesData = dashboardData?.growingMedicines || {};
  const topChart = dashboardData?.topMedicinesByArea?.[selectedArea] || { labels: [], data: [] };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
      setMessage('');
    }
  };

  const handleRemoveFile = (fileName) => {
    setFiles(files.filter(file => file.name !== fileName));
  };
  
  // NEW WORKFLOW: Call the temporary analysis endpoint
  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });
    setLoading(true);
    setMessage('Analyzing file(s)...');
    setMessageType('info');
    setDashboardData(null); // Clear previous analysis

    try {
      // Call the new dedicated analysis endpoint
      const res = await axios.post(`${baseURL}/api/analyze-session/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      
      setDashboardData(res.data); // Set the analysis data from the response
      
      // Auto-select the first area for the top medicines chart
      if (res.data?.topMedicinesByArea) {
        const firstArea = Object.keys(res.data.topMedicinesByArea)[0];
        if (firstArea) setSelectedArea(firstArea);
      }

      setMessage(`Successfully analyzed ${res.data.totalRecords} records from your file(s).`);
      setMessageType('success');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Analysis failed. The file might be unsupported or corrupt.';
      setMessage(errorMsg);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };
  
  // NEW WORKFLOW: This is now a pure client-side state reset
  const handleClearAnalysis = () => {
    setDashboardData(null);
    setFiles([]);
    setMessage('Analysis cleared. Upload new files to start again.');
    setMessageType('info');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!dashboardData) {
      setMessage('No analysis data to generate a report.');
      setMessageType('error');
      return;
    }
    setDownloading(true);
    setMessage('Generating PDF report...');
    setMessageType('info');
    try {
      const res = await axios.post(`${baseURL}/api/generate-report-pdf/`, dashboardData, {
        responseType: 'blob', headers: { 'Content-Type': 'application/json' }
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analysis_report.pdf';
      a.click();
      a.remove();
      setMessage('Report downloaded successfully.');
      setMessageType('success');
    } catch (err) {
      setMessage('Failed to download report.');
      setMessageType('error');
    } finally {
      setDownloading(false);
    }
  };

  const renderLineTrends = () => {
    if (!dashboardData?.salesTrendsByArea) return <p>No data available.</p>;
    const trends = dashboardData.salesTrendsByArea;
    const firstArea = Object.values(trends)[0];
    if (!firstArea) return <p>No trend data to display.</p>;
    const labels = firstArea.labels;
    const datasets = Object.entries(trends).map(([area, chart]) => ({
      label: `Sales in ${area}`, data: chart.data, borderColor: getColor(area), tension: 0.3, fill: false,
    }));
    return <Line data={{ labels, datasets }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />;
  };

  const getColor = (key) => {
    const palette = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
    const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl text-center font-bold text-gray-500 mb-6">Analyze Sales Reports</h1>
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200/60 shadow-lg rounded-2xl p-8">
          <div className="flex flex-col gap-4">
             <label className="relative block cursor-pointer">
                <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} accept={allowedFileTypes} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                <div className="border-2 border-dashed border-slate-300 rounded-xl px-6 py-10 text-center transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50">
                    <UploadCloud className="w-12 h-12 mx-auto text-slate-400"/>
                    <p className="mt-2 text-sm font-semibold text-slate-700">Click to browse or drag & drop files</p>
                    <p className="text-xs text-slate-500 mt-1">Supported formats: PDF, Excel, TXT, CSV</p>
                </div>
            </label>
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-600">Selected Files:</h4>
                {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-slate-800">
                           <FileIcon className="w-4 h-4 text-slate-500"/> {file.name}
                        </div>
                        <button onClick={() => handleRemoveFile(file.name)} className="text-red-500 hover:text-red-700 p-1 rounded-full">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={handleUploadAndAnalyze} style={{ background: '#ee4d38' }} disabled={loading || files.length === 0} className="flex-1 min-w-[150px] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>Analyzing...</> : <><UploadCloud className="w-5 h-5"/>Analyze</>}
              </button>
              <button onClick={handleClearAnalysis} disabled={loading} className="flex-1 min-w-[150px] bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
                 <Trash2 className="w-5 h-5"/>Clear
              </button>
            </div>
             <AlertMessage message={message} type={messageType} onClear={() => setMessage('')} />
          </div>
        </div>
      </div>

      {/* The rest of the page only renders if there is analysis data */}
      {dashboardData ? (
        <div className="mt-10">
            <button onClick={handleDownload} disabled={downloading} className="mb-6 mx-auto flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 transition-all duration-300 disabled:opacity-50">
                {downloading ? "Generating..." : <><Download className="w-5 h-5"/>Download Report</>}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card title="1. Sales Trends by Area (Weekly)">{renderLineTrends()}</Card>
              <Card title="2. Top 10 Medicines by Area">
                <select className="border border-gray-300 p-2 rounded mb-4 w-full" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                  {Object.keys(dashboardData.topMedicinesByArea || {}).map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
                <Bar data={{ labels: topChart.labels, datasets: [{ label: 'Total Sales Value', data: topChart.data, backgroundColor: '#3B82F6' }] }} options={{ plugins: { legend: { display: false } } }} />
              </Card>
              <Card title="3. Medicines with Weekly Growth">
                <Bar data={{ labels: growingMedicinesData.labels, datasets: [ { label: 'Previous Week Sales', data: growingMedicinesData.previous_week_sales, backgroundColor: '#FBBF24', }, { label: 'Last Week Sales', data: growingMedicinesData.last_week_sales, backgroundColor: '#34D399', } ] }} />
              </Card>
              <Card title="4. Top 15 Prescriber Analysis">
                <Bar data={{ labels: dashboardData.prescriberAnalysis.labels, datasets: [{ label: 'Total Sales Value', data: dashboardData.prescriberAnalysis.data, backgroundColor: '#A78BFA' }] }} options={{ indexAxis: 'y' }} />
              </Card>
              <Card title="5. Products with High Free Quantity" className="md:col-span-2 h-[450px]">
                <Pie data={{ labels: dashboardData.highFreeQuantity.labels, datasets: [{ label: 'Free Units', data: dashboardData.highFreeQuantity.data, backgroundColor: [ '#F87171', '#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#FB7185', ], }] }} options={{ maintainAspectRatio: false }} />
              </Card>
            </div>
        </div>
      ) : (
        !loading && <div className='flex justify-center mt-10'><div className="text-center text-gray-500"><p>Upload one or more files to see the analysis.</p></div></div>
      )}
    </div>
  );
}

const Card = ({ title, children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
    {children}
  </div>
);