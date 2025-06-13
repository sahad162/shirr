import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import baseURL from '../Services/baseURL';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsPage() {
  const [files, setFiles] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('all_data');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [reportData, setReportData] = useState({});
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Static report types
  const reportTypes = [
    { key: 'salesTrendsByArea', label: 'Sales Trends by Area' },
    { key: 'topMedicinesByArea', label: 'Top Medicines by Area' },
    { key: 'growingMedicines', label: 'Growing Medicines' }
  ];

  // Load uploaded files on component mount
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/reports/`);
      console.log('Uploaded files loaded:', response.data);
      setUploadedFiles(response.data.reports || []);
    } catch (err) {
      console.error('Error loading uploaded files:', err);
      setError('Failed to load uploaded files');
    }
  };

  const handleFileChange = (e) => {
    setFiles(e.target.files);
    setError('');
    setUploadSuccess('');
  };

  const uploadFiles = async () => {
    if (!files || files.length === 0) {
      setError('Please select files to upload');
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('reports', f));
    
    setLoading(true);
    setError('');
    setUploadSuccess('');

    try {
      const response = await axios.post(`${baseURL}/api/reports/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload response:', response.data);
      
      // Show success message
      setUploadSuccess(`${response.data.message} - Total: ${response.data.total_records} records`);
      
      // Reset file input
      setFiles(null);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      // Refresh uploaded files list
      await fetchUploadedFiles();
      
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to upload files. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for selected report type and file
  useEffect(() => {
    if (!selectedReportType) {
      setReportData({});
      return;
    }

    generateReport();
  }, [selectedReportType, selectedFile]);

  const generateReport = async () => {
    setLoading(true);
    setError('');

    const params = { 
      report_type: selectedReportType,
      selected_file: selectedFile
    };

    try {
      const response = await axios.get(`${baseURL}/api/report_data/`, { params });
      console.log('Report data received:', response.data);
      setReportData(response.data.data || {});
    } catch (err) {
      console.error('Error fetching report data:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch report data';
      setError(errorMessage);
      setReportData({});
    } finally {
      setLoading(false);
    }
  };

  const generateChartColors = (dataLength) => {
    const colors = [
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 99, 132, 0.6)',
      'rgba(255, 205, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(199, 199, 199, 0.6)',
      'rgba(83, 102, 255, 0.6)',
      'rgba(255, 99, 255, 0.6)',
      'rgba(99, 255, 132, 0.6)',
    ];
    
    return Array.from({ length: dataLength }, (_, i) => colors[i % colors.length]);
  };

  const getChart = () => {
    if (!reportData || (!reportData.labels && !reportData.message)) {
      return <p className="text-gray-500">No data to display</p>;
    }

    if (reportData.message) {
      return (
        <div className="text-center p-6">
          <p className="text-gray-600">{reportData.message}</p>
        </div>
      );
    }

    if (!reportData.labels || !reportData.data || reportData.labels.length === 0) {
      return <p className="text-gray-500">No data available for this report</p>;
    }

    const selectedReportObj = reportTypes.find(r => r.key === selectedReportType);
    const reportLabel = selectedReportObj?.label || 'Data';

    const colors = generateChartColors(reportData.data.length);
    const borderColors = colors.map(color => color.replace('0.6', '1'));

    const config = {
      labels: reportData.labels,
      datasets: [{
        label: reportLabel,
        data: reportData.data,
        backgroundColor: chartType === 'doughnut' ? colors : colors[0],
        borderColor: chartType === 'doughnut' ? borderColors : borderColors[0],
        borderWidth: 1,
      }]
    };

    // Add comparison data for growing medicines
    if (selectedReportType === 'growingMedicines' && reportData.prev_month_data) {
      config.datasets.push({
        label: 'Previous Month',
        data: reportData.prev_month_data,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      });
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: reportLabel,
        },
      },
      scales: chartType !== 'doughnut' ? {
        y: {
          beginAtZero: true,
        },
      } : undefined,
    };

    if (chartType === 'bar') return <Bar data={config} options={options} />;
    if (chartType === 'line') return <Line data={config} options={options} />;
    if (chartType === 'doughnut') return <Doughnut data={config} options={options} />;
    return null;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Sales Analytics Dashboard</h1>

      {/* File Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Reports</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="file"
            multiple
            accept=".txt,.pdf"
            onChange={handleFileChange}
            className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={uploadFiles}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Processing...' : 'Upload & Process'}
          </button>
        </div>
        {files && files.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            {files.length} file(s) selected
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Report Selection and Chart Type */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Uploaded File
            </label>
            <select
              value={selectedFile}
              onChange={e => setSelectedFile(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- All Files --</option>
              {uploadedFiles.map(file => (
                <option key={file.key} value={file.key}>
                  {file.label} {file.records_count && `(${file.records_count} records)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Report Type
            </label>
            <select
              value={selectedReportType}
              onChange={e => setSelectedReportType(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Select Report Type --</option>
              {reportTypes.map(r => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedReportType}>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="doughnut">Doughnut Chart</option>
            </select>
          </div>
        </div>
        
        {uploadedFiles.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800">No files uploaded yet. Please upload some files first.</p>
          </div>
        )}
      </div>

      {/* Chart Display */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Chart View</h2>
        <div className="min-h-[400px] flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading chart data...</p>
            </div>
          ) : selectedReportType ? (
            getChart()
          ) : (
            <p className="text-gray-500">Please select a report type to view the chart</p>
          )}
        </div>
      </div>
    </div>
  );
}