// Analytics.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import baseURL from '../Services/baseURL';
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedArea, setSelectedArea] = useState('');

  // Automatically select the first area when data is loaded
  useEffect(() => {
    if (dashboardData && dashboardData.topMedicinesByArea) {
      const availableAreas = Object.keys(dashboardData.topMedicinesByArea);
      // If there are areas and no area is selected or the selected area is no longer valid
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
    setMessage(''); // Clear previous messages
    try {
      await axios.post(`${baseURL}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setMessage('Upload successful! Fetching updated analytics...');
      // Fetch fresh data after upload
      const res = await axios.get(`${baseURL}/sales-data/`, { withCredentials: true });
      setDashboardData(res.data);
      setMessage('Analytics updated!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Upload failed.';
      setMessage(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
      setFile(null);
      // Clear file input visually
      if (document.querySelector('input[type="file"]')) {
        document.querySelector('input[type="file"]').value = '';
      }
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setMessage(''); // Clear previous messages
    try {
      // Use the correct endpoint for clearing data
      await axios.get(`${baseURL}/clear-data/`, { withCredentials: true });
      setMessage('Session data cleared.');
      setDashboardData(null); // Clear data from the frontend
      setSelectedArea(''); // Reset selected area
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Clearing data failed.';
      setMessage(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Render charts
  const renderLineTrends = () => {
    if (!dashboardData || !dashboardData.salesTrendsByArea) return <p>No data available.</p>;
    const trends = dashboardData.salesTrendsByArea;
    const firstArea = Object.values(trends)[0];
    if (!firstArea) return <p>No trend data to display.</p>;
    
    const labels = firstArea.labels;
    const datasets = Object.entries(trends).map(([area, chart]) => ({
      label: `Sales in ${area}`,
      data: chart.data,
      tension: 0.1,
      fill: false,
    }));
    return <Line data={{ labels, datasets }} />;
  };

  const topChart = dashboardData?.topMedicinesByArea?.[selectedArea] || { labels: [], data: [] };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Integrated Analytics Dashboard</h1>

      {/* Upload & Controls */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50 flex items-center gap-4">
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          accept=".txt,.pdf"
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Uploading...' : 'Upload & Analyze'}
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="ml-auto bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? 'Clearing...' : 'Clear All Data'}
        </button>
      </div>
      {message && <p className="mb-4 text-center font-semibold">{message}</p>}

      {/* Total Records */}
      {dashboardData && (
        <p className="mb-4 text-lg">Total Records Analyzed: <strong>{dashboardData.totalRecords}</strong></p>
      )}

      {/* Dashboard Charts Grid */}
      {dashboardData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-4 border rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">1. Sales Trends by Area (Weekly)</h3>
            {renderLineTrends()}
          </div>
          <div className="p-4 border rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">2. Top 10 Medicines by Area</h3>
            <select
              className="border p-2 mb-4 rounded w-full"
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              disabled={!dashboardData.topMedicinesByArea || Object.keys(dashboardData.topMedicinesByArea).length === 0}
            >
              <option value="" disabled>-- Select an Area --</option>
              {dashboardData.topMedicinesByArea && Object.keys(dashboardData.topMedicinesByArea).map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <Bar data={{ labels: topChart.labels, datasets: [{ label: 'Total Sales Value', data: topChart.data, backgroundColor: 'rgba(54, 162, 235, 0.6)' }] }} />
          </div>
          <div className="p-4 border rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">3. Medicines with Monthly Growth</h3>
            <Bar
              data={{
                labels: dashboardData.growingMedicines.labels,
                datasets: [
                  { label: 'Previous Month Sales', data: dashboardData.growingMedicines.prev_month_sales, backgroundColor: 'rgba(255, 159, 64, 0.6)' },
                  { label: 'Last Month Sales', data: dashboardData.growingMedicines.last_month_sales, backgroundColor: 'rgba(75, 192, 192, 0.6)' }
                ]
              }}
            />
          </div>
          <div className="p-4 border rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">4. Top 15 Prescriber Analysis</h3>
            <Bar data={{ labels: dashboardData.prescriberAnalysis.labels, datasets: [{ label: 'Total Sales Value', data: dashboardData.prescriberAnalysis.data, backgroundColor: 'rgba(153, 102, 255, 0.6)' }] }} options={{ indexAxis: 'y' }} />
          </div>
          <div className="p-4 border rounded-lg shadow-md h-96 flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">5. Products with High Free Quantity</h3>
            <div className="relative w-full h-full">
              <Pie data={{ labels: dashboardData.highFreeQuantity.labels, datasets: [{ label: 'Free Units', data: dashboardData.highFreeQuantity.data }] }} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-10 border rounded-lg">
          <p>No data to display. Please upload a sales file to begin analysis.</p>
        </div>
      )}
    </div>
  );
}