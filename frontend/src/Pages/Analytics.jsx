// Analytics.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import baseURL from '../Services/baseURL';
import { chartColors, getTransparentColors } from '../styles/chartColor'; // <-- Import new colors
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend );

// --- Reusable UI Components ---

const LoadingSpinner = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const EmptyState = () => (
  <div className="text-center p-10 border-2 border-dashed rounded-lg bg-white">
    <h3 className="text-2xl font-semibold text-gray-700">No Data Available</h3>
    <p className="mt-2 text-gray-500">Please upload a sales file to begin your analysis.</p>
  </div>
);

const DashboardCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
    <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
    <div className="relative h-96">{children}</div>
  </div>
);


export default function Analytics() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); // Start with loading true
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedArea, setSelectedArea] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseURL}/api/sales-data/`, { withCredentials: true });
      setDashboardData(res.data);
    } catch (err) {
      setMessage('Could not fetch analytics data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Fetch initial data on component mount
  }, []);

  useEffect(() => {
    if (dashboardData?.topMedicinesByArea) {
      const availableAreas = Object.keys(dashboardData.topMedicinesByArea);
      if (availableAreas.length > 0 && !availableAreas.includes(selectedArea)) {
        setSelectedArea(availableAreas[0]);
      }
    }
  }, [dashboardData, selectedArea]);

  const handleUpload = async e => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${baseURL}/api/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true,
      });
      setMessage('Upload successful! Refreshing analytics...');
      await fetchData(); // Refetch all data
      setMessage('Analytics updated!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Upload failed.';
      setMessage(errorMsg);
    } finally {
      setFile(null);
      if (document.querySelector('input[type="file"]')) {
        document.querySelector('input[type="file"]').value = '';
      }
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setMessage('');
    try {
      await axios.get(`${baseURL}/api/clear-data/`, { withCredentials: true });
      setMessage('All data has been cleared.');
      await fetchData(); // Refetch data (which will be empty)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Clearing data failed.';
      setMessage(errorMsg);
    }
  };

  // --- Chart Data Preparation ---

  const highFreeQuantityChartData = () => {
    if (!dashboardData?.highFreeQuantity?.labels?.length) return null;
    let { labels, data } = dashboardData.highFreeQuantity;

    // Limit to top 9 and group the rest as "Others"
    if (labels.length > 10) {
      const topLabels = labels.slice(0, 9);
      const topData = data.slice(0, 9);
      const otherData = data.slice(9).reduce((acc, val) => acc + val, 0);
      
      labels = [...topLabels, "Others"];
      data = [...topData, otherData];
    }
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: chartColors,
        borderColor: '#ffffff',
        borderWidth: 2,
      }],
    };
  };


  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Sales Analytics Dashboard</h1>
          {dashboardData && <p className="mt-2 text-lg text-gray-600">
            Total Records Analyzed: <strong>{dashboardData.totalRecords.toLocaleString()}</strong>
          </p>}
        </header>

        {/* --- Controls Section --- */}
        <div className="mb-8 p-4 rounded-lg bg-white shadow-md flex flex-wrap items-center gap-4">
          <input
            type="file" onChange={e => setFile(e.target.files[0])} accept=".txt,.pdf"
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button onClick={handleUpload} disabled={loading || !file} className="bg-blue-600 text-white px-5 py-2 rounded-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Processing...' : 'Upload & Analyze'}
          </button>
          <button onClick={handleClear} disabled={loading} className="ml-auto bg-red-600 text-white px-5 py-2 rounded-full font-semibold shadow hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Clearing...' : 'Clear All Data'}
          </button>
        </div>
        {message && <p className="mb-4 text-center font-semibold text-blue-800">{message}</p>}

        {/* --- Main Dashboard --- */}
        <div className="relative">
          {loading && <LoadingSpinner />}
          {(!dashboardData || dashboardData.totalRecords === 0) && !loading ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DashboardCard title="1. Sales Trends by Area (Weekly)">
                 <Line data={{
                    labels: dashboardData?.salesTrendsByArea?.[Object.keys(dashboardData.salesTrendsByArea)[0]]?.labels || [],
                    datasets: Object.entries(dashboardData?.salesTrendsByArea || {}).map(([area, chart], index) => ({
                      label: area,
                      data: chart.data,
                      borderColor: chartColors[index % chartColors.length],
                      tension: 0.1,
                      fill: false,
                    })),
                  }} options={{ maintainAspectRatio: false }} />
              </DashboardCard>
              
              <DashboardCard title="2. Top 10 Medicines by Area">
                  <div className="absolute top-0 right-0 z-10 p-2">
                    <select
                      className="border p-2 rounded-md bg-gray-50"
                      value={selectedArea}
                      onChange={e => setSelectedArea(e.target.value)}
                      disabled={!dashboardData?.topMedicinesByArea || Object.keys(dashboardData.topMedicinesByArea).length === 0}
                    >
                      {dashboardData?.topMedicinesByArea && Object.keys(dashboardData.topMedicinesByArea).map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                   <Bar data={{
                    labels: dashboardData?.topMedicinesByArea?.[selectedArea]?.labels || [],
                    datasets: [{
                      label: 'Total Sales Value',
                      data: dashboardData?.topMedicinesByArea?.[selectedArea]?.data || [],
                      backgroundColor: getTransparentColors(0.6)[0],
                      borderColor: chartColors[0],
                      borderWidth: 1,
                    }]
                  }} options={{ maintainAspectRatio: false }} />
              </DashboardCard>

              <DashboardCard title="3. Medicines with Weekly Growth">
                  <Bar data={{
                    labels: dashboardData?.growingMedicines?.labels || [],
                    datasets: [
                      { label: 'Previous Week Sales', data: dashboardData?.growingMedicines?.prev_month_sales || [], backgroundColor: getTransparentColors(0.6)[1] },
                      { label: 'Current Week Sales', data: dashboardData?.growingMedicines?.last_month_sales || [], backgroundColor: getTransparentColors(0.6)[0] }
                    ]
                  }} options={{ maintainAspectRatio: false }} />
              </DashboardCard>
              
              <DashboardCard title="4. Top 15 Prescriber Analysis">
                <Bar data={{
                  labels: dashboardData?.prescriberAnalysis?.labels || [],
                  datasets: [{
                    label: 'Total Sales Value',
                    data: dashboardData?.prescriberAnalysis?.data || [],
                    backgroundColor: getTransparentColors(0.6)[3],
                    borderColor: chartColors[3],
                    borderWidth: 1,
                  }]
                }} options={{ indexAxis: 'y', maintainAspectRatio: false }} />
              </DashboardCard>

              <DashboardCard title="5. Top Products with Free Quantity">
                {highFreeQuantityChartData() ? (
                  <Doughnut data={highFreeQuantityChartData()} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} />
                ) : <p className="text-center text-gray-500">No free quantity data available.</p>}
              </DashboardCard>

              <DashboardCard title="6. Weekly Sales Growth Trends (%)">
                {dashboardData?.weeklyGrowthTrends ? (
                  <Line data={{
                    labels: dashboardData.weeklyGrowthTrends.labels,
                    datasets: [{
                      label: 'Weekly Growth %',
                      data: dashboardData.weeklyGrowthTrends.data,
                      borderColor: chartColors[1],
                      backgroundColor: getTransparentColors(0.2)[1],
                      tension: 0.4,
                      fill: true,
                    }]
                  }} options={{ maintainAspectRatio: false, scales: { y: { ticks: { callback: (value) => `${value}%` } } } }} />
                ) : <p className="text-center text-gray-500">Insufficient data for trend analysis.</p>}
              </DashboardCard>
              
              <DashboardCard title="7. Area Performance Comparison">
                {dashboardData?.areaPerformance ? (
                  <Bar data={{
                    labels: dashboardData.areaPerformance.labels,
                    datasets: [
                      { label: 'Total Sales', data: dashboardData.areaPerformance.totalSales, backgroundColor: getTransparentColors(0.6)[0], yAxisID: 'y' },
                      { label: 'Number of Orders', data: dashboardData.areaPerformance.orderCount, backgroundColor: getTransparentColors(0.6)[2], yAxisID: 'y1' }
                    ]
                  }} options={{ maintainAspectRatio: false, scales: {
                    y: { type: 'linear', display: true, position: 'left', ticks: { callback: (value) => `₹${(value/1000).toFixed(0)}K` } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                  } }} />
                ) : <p className="text-center text-gray-500">No area performance data available.</p>}
              </DashboardCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}