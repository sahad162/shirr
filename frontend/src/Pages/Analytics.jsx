import React, { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Award, BarChart3, Filter, Download, Upload, RefreshCw, AlertCircle, Loader } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement);

const API_BASE_URL =   'http://127.0.0.1:8000/api';


const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#6B7280',
        font: { size: 12 }
      }
    },
    title: { display: false }
  },
  scales: {
    x: {
      ticks: { color: '#6B7280' },
      grid: { color: '#F3F4F6', borderColor: '#E5E7EB' }
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#6B7280' },
      grid: { color: '#F3F4F6', borderColor: '#E5E7EB' }
    }
  }
};

const DOUGHNUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#6B7280',
        font: { size: 12 }
      }
    }
  }
};

const REPORT_TYPES = {
  'sales-trends': {
    label: 'Sales Performance Analysis',
    metrics: [
      { value: 'monthly-growth', label: 'Monthly Growth Rate' },
      { value: 'quarterly-comparison', label: 'Quarterly Comparison' },
      { value: 'year-over-year', label: 'Year-over-Year Analysis' },
      { value: 'regional-performance', label: 'Regional Performance' }
    ]
  },
  'product-performance': {
    label: 'Product Performance Metrics',
    metrics: [
      { value: 'revenue-ranking', label: 'Revenue Ranking' },
      { value: 'volume-analysis', label: 'Volume Analysis' },
      { value: 'market-share', label: 'Market Share Analysis' },
      { value: 'profitability', label: 'Profitability Analysis' }
    ]
  },
  'growth-analysis': {
    label: 'Growth & Trend Analysis',
    metrics: [
      { value: 'growth-leaders', label: 'Growth Leaders' },
      { value: 'trend-analysis', label: 'Trend Analysis' },
      { value: 'forecast', label: 'Performance Forecast' },
      { value: 'opportunity-analysis', label: 'Opportunity Analysis' }
    ]
  }
};

class AnalyticsAPI {
  static async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async getChartData(reportType, metric, filters = {}) {
    const params = new URLSearchParams({
      reportType,
      metric,
      ...filters
    });

    const response = await fetch(`${API_BASE_URL}/chart-data?${params}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  static async exportReport(reportType, metric, format = 'pdf') {
    const params = new URLSearchParams({
      reportType,
      metric,
      format
    });

    const response = await fetch(`${API_BASE_URL}/export?${params}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }
}


const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callAPI = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { callAPI, loading, error, clearError: () => setError(null) };
};

// Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p className="text-red-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, bgColor, change, changeType }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-sm transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      {change && (
        <div className={`text-xs px-2 py-1 rounded-full ${
          changeType === 'positive' ? 'text-green-600 bg-green-50' :
          changeType === 'negative' ? 'text-red-600 bg-red-50' :
          'text-gray-600 bg-gray-50'
        }`}>
          {changeType === 'positive' && <TrendingUp className="inline w-3 h-3 mr-1" />}
          {changeType === 'negative' && <TrendingDown className="inline w-3 h-3 mr-1" />}
          {change}
        </div>
      )}
    </div>
    <div className="text-sm text-gray-500 mb-1">{title}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

const ChartRenderer = ({ chartData, loading, error }) => {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!chartData) return null;

  const chartProps = {
    data: chartData.data,
    options: chartData.type === 'doughnut' ? DOUGHNUT_OPTIONS : CHART_OPTIONS
  };

  switch (chartData.type) {
    case 'line':
      return <Line {...chartProps} />;
    case 'bar':
      return <Bar {...chartProps} />;
    case 'doughnut':
      return <Doughnut {...chartProps} />;
    default:
      return <div className="text-center text-gray-500 py-8">Unsupported chart type</div>;
  }
};

// Main Component
const Analytics = () => {
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [chartData, setChartData] = useState(null);
  const [summaryCards, setSummaryCards] = useState([]);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const { callAPI, loading, error, clearError } = useAPI();

  // Fetch chart data when report/metric changes
  useEffect(() => {
    if (selectedReport && selectedMetric) {
      fetchChartData();
    }
  }, [selectedReport, selectedMetric]);

  const fetchChartData = useCallback(async () => {
    try {
      const data = await callAPI(() => 
        AnalyticsAPI.getChartData(selectedReport, selectedMetric)
      );
      
      setChartData(data.chartData);
      setSummaryCards(data.summaryCards || []);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    }
  }, [selectedReport, selectedMetric, callAPI]);

  const handleFileUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file');
      return;
    }

    try {
      setUploadStatus('Uploading...');
      await callAPI(() => AnalyticsAPI.uploadFile(file));
      setUploadStatus('Upload successful');
      setFile(null);
      
      // Refresh data after upload
      if (selectedReport && selectedMetric) {
        fetchChartData();
      }
    } catch (err) {
      setUploadStatus(`Upload failed: ${err.message}`);
    }
  };

  const handleExport = async () => {
    if (!selectedReport || !selectedMetric) return;

    try {
      const blob = await callAPI(() => 
        AnalyticsAPI.exportReport(selectedReport, selectedMetric)
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-${selectedMetric}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const resetSelections = () => {
    setSelectedReport('');
    setSelectedMetric('');
    setChartData(null);
    setSummaryCards([]);
    clearError();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* File Upload Section */}
        <div className="mb-6 bg-white p-6 border border-gray-200 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Upload</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt,.pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={handleFileUpload}
              disabled={loading || !file}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
          {uploadStatus && (
            <p className={`mt-3 text-sm ${uploadStatus.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
              {uploadStatus}
            </p>
          )}
        </div>

        {/* Report Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Report Type</option>
              {Object.entries(REPORT_TYPES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              disabled={!selectedReport}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            >
              <option value="">Select Metric</option>
              {selectedReport && REPORT_TYPES[selectedReport].metrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card, index) => (
              <MetricCard key={index} {...card} />
            ))}
          </div>
        )}

        {/* Main Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {selectedReport && selectedMetric ? 
                `${REPORT_TYPES[selectedReport]?.label} - ${REPORT_TYPES[selectedReport]?.metrics.find(m => m.value === selectedMetric)?.label}` : 
                'Analytics Dashboard'
              }
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchChartData}
                disabled={!selectedReport || !selectedMetric || loading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedReport || !selectedMetric || loading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Export Report"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={resetSelections}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Reset"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="h-96">
            {selectedReport && selectedMetric ? (
              <ChartRenderer 
                chartData={chartData} 
                loading={loading} 
                error={error} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Select Report Configuration
                  </h3>
                  <p className="text-gray-500">
                    Choose report type and metric to view analytics
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;