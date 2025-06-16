
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import baseURL from '../Services/baseURL'
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
  Legend
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

  const handleUpload = async e => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${baseURL}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setMessage('Upload successful!');
      const res = await axios.get(`${baseURL}/sales-data/`, { withCredentials: true });
      setDashboardData(res.data);
    } catch (err) {
      setMessage('Upload failed.');
      console.error(err);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };


  const handleClear = async () => {
    setLoading(true);
    try {
      await axios.get(`${baseURL}/clear-data/`, { withCredentials: true });
      setMessage('Session data cleared.');
      setDashboardData(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Render charts
  const renderLineTrends = () => {
    const trends = dashboardData.salesTrendsByArea;
    const labels = trends ? Object.values(trends)[0]?.labels : [];
    const datasets = trends
      ? Object.entries(trends).map(([area, chart], i) => ({
          label: `Sales in ${area}`,
          data: chart.data,
          tension: 0.1
        }))
      : [];
    return <Line data={{ labels, datasets }} />;
  };

  const topChart = dashboardData
    ? dashboardData.topMedicinesByArea[selectedArea] || { labels: [], data: [] }
    : { labels: [], data: [] };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Integrated Analytics Dashboard</h1>

      {/* Upload & Controls */}
      <div className="mb-8 flex items-center">
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          accept=".txt,.pdf"
          className="border p-2 rounded"
        />
        <button
          onClick={handleUpload}
          disabled={loading}
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="ml-2 bg-red-600 text-white px-4 py-2 rounded shadow"
        >
          {loading ? 'Clearing...' : 'Clear Data'}
        </button>
      </div>
      {message && <p className="mb-4 text-green-700">{message}</p>}

      {/* Total Records */}
      {dashboardData && (
        <p className="mb-4">Total Records Loaded: <strong>{dashboardData.totalRecords}</strong></p>
      )}

      {/* Dashboard Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-2">1. Sales Trends by Area</h3>
          {dashboardData ? renderLineTrends() : <p>Loading...</p>}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">2. Top Medicines by Area</h3>
          <select
            className="border p-2 mb-4 rounded"
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
          >
            {dashboardData && Object.keys(dashboardData.topMedicinesByArea).map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <Bar
            data={{ labels: topChart.labels, datasets: [{ label: 'Total Value', data: topChart.data }] }}
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">3. Medicines with Monthly Growth</h3>
          <Bar
            data={{
              labels: dashboardData?.growingMedicines.labels || [],
              datasets: [
                { label: 'Previous Month', data: dashboardData?.growingMedicines.prev_month_sales || [] },
                { label: 'Last Month', data: dashboardData?.growingMedicines.last_month_sales || [] }
              ]
            }}
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">4. Top Prescriber Analysis</h3>
          <Bar
            data={{ labels: dashboardData?.prescriberAnalysis.labels || [], datasets: [{ label: 'Sales Value', data: dashboardData?.prescriberAnalysis.data || [] }] }}
            options={{ indexAxis: 'y' }}
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">5. Products with High Free Quantity</h3>
          <Pie
            data={{ labels: dashboardData?.highFreeQuantity.labels || [], datasets: [{ label: 'Free Units', data: dashboardData?.highFreeQuantity.data || [] }] }}
          />
        </div>
      </div>
    </div>
  );
}
