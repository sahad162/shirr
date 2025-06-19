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
    const [downloading, setDownloading] = useState(false);


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
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        });
        setMessage('Upload successful! Fetching updated analytics...');
        const res = await axios.get(`${baseURL}/api/sales-data/`, { withCredentials: true });
        setDashboardData(res.data);
        setMessage('Analytics updated!');
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Upload failed.';
        setMessage(errorMsg);
      } finally {
        setLoading(false);
        setFile(null);
        if (document.querySelector('input[type="file"]')) {
          document.querySelector('input[type="file"]').value = '';
        }
      }
    };

const handleDownload = async () => {
  if (!dashboardData) {
    setMessage('No data to generate report.');
    return;
  }

  setDownloading(true);
  setMessage('Generating report...');

  try {
    const res = await axios.post(`${baseURL}/api/generate-report-pdf/`, dashboardData, {
      responseType: 'blob',  // This is critical to treat the response as a file
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_report.pdf';
    a.click();
    a.remove();

    setMessage('Report downloaded successfully.');
  } catch (err) {
    console.error('Download error:', err);
    setMessage('Failed to download report.');
  } finally {
    setDownloading(false);
  }
};



    const handleClear = async () => {
      setLoading(true);
      setMessage('');
      try {
        await axios.get(`${baseURL}/api/clear-data/`, { withCredentials: true });
        setMessage('Session data cleared.');
        setDashboardData(null);
        setSelectedArea('');
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Clearing data failed.';
        setMessage(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    const renderLineTrends = () => {
      if (!dashboardData?.salesTrendsByArea) return <p>No data available.</p>;
      const trends = dashboardData.salesTrendsByArea;
      const firstArea = Object.values(trends)[0];
      if (!firstArea) return <p>No trend data to display.</p>;

      const labels = firstArea.labels;
      const datasets = Object.entries(trends).map(([area, chart]) => ({
        label: `Sales in ${area}`,
        data: chart.data,
        borderColor: getColor(area),
        backgroundColor: getColor(area),
        tension: 0.3,
        fill: false,
      }));

      return <Line data={{ labels, datasets }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />;
    };

    const getColor = (key) => {
      const palette = [
        '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
        '#8B5CF6', '#F43F5E', '#14B8A6', '#F87171', '#60A5FA',
      ];
      const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return palette[hash % palette.length];
    };

    const topChart = dashboardData?.topMedicinesByArea?.[selectedArea] || { labels: [], data: [] };

    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl text-center font-bold text-gray-500 mb-6">Integrated Analytics Dashboard</h1>

          <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-white via-slate-50 to-orange-50/30 backdrop-blur-sm border border-slate-200/60 shadow-2xl rounded-2xl p-8 relative overflow-hidden group hover:shadow-3xl transition-all duration-500">
          <div className="relative flex flex-col md:flex-col gap-6 items-center">

            <div className="flex-1 min-w-150">
              <label className="relative block cursor-pointer group/input">
                <input
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  accept=".txt,.pdf"
                  className="absolute inset-0 w-full h-[full] opacity-0 cursor-pointer"
                />
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-2 border-dashed border-slate-300 rounded-xl px-6 py-4 text-center transition-all duration-300 group-hover/input:border-indigo-400 group-hover/input:bg-gradient-to-r group-hover/input:from-indigo-50 group-hover/input:to-purple-50 group-hover/input:scale-105">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-full group-hover/input:bg-indigo-200 transition-colors">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-700 group-hover/input:text-indigo-700">Choose file or drag & drop</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, TXT files only</p>
                    </div>
                  </div>
                </div>
              </label>
            </div>

        
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                style={{background:'#ee4d38'}}
                disabled={loading || !file}
                className="relative  text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:scale-100 disabled:shadow-md group/btn overflow-hidden"
              >
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload & Analyze
                    </>
                  )}
                </span>
              </button>

               <button
                onClick={handleDownload}
                style={{background:'#ee4d38'}}
                disabled={loading || !dashboardData}
                className="relative  text-white px-2 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:scale-100 disabled:shadow-md group/btn overflow-hidden"
              >Download
              </button>

              <button
                onClick={handleClear}
                disabled={loading}
                className="relative bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100 group/btn overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  
                  {loading ? 'Clearing...' : 'Clear All'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>


        {dashboardData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <Card title="1. Sales Trends by Area (Weekly)">
              {renderLineTrends()}
            </Card>

            <Card title="2. Top 10 Medicines by Area">
              <select
                className="border border-gray-300 p-2 rounded mb-4 w-full"
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
                disabled={!dashboardData.topMedicinesByArea}
              >
                <option value="" disabled>-- Select an Area --</option>
                {Object.keys(dashboardData.topMedicinesByArea || {}).map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              <Bar
                data={{
                  labels: topChart.labels,
                  datasets: [{
                    label: 'Total Sales Value',
                    data: topChart.data,
                    backgroundColor: '#3B82F6'
                  }]
                }}
                options={{ plugins: { legend: { display: false } } }}
              />
            </Card>

            {/* Growing Medicines */}
            <Card title="3. Medicines with Monthly Growth">
              <Bar
                data={{
                  labels: dashboardData.growingMedicines.labels,
                  datasets: [
                    {
                      label: 'Previous Month Sales',
                      data: dashboardData.growingMedicines.prev_month_sales,
                      backgroundColor: '#FBBF24',
                    },
                    {
                      label: 'Last Month Sales',
                      data: dashboardData.growingMedicines.last_month_sales,
                      backgroundColor: '#34D399',
                    }
                  ]
                }}
              />
            </Card>

            {/* Top Prescribers */}
            <Card title="4. Top 15 Prescriber Analysis">
              <Bar
                data={{
                  labels: dashboardData.prescriberAnalysis.labels,
                  datasets: [{
                    label: 'Total Sales Value',
                    data: dashboardData.prescriberAnalysis.data,
                    backgroundColor: '#A78BFA'
                  }]
                }}
                options={{ indexAxis: 'y' }}
              />
            </Card>

            {/* Free Quantity */}
            <Card title="5. Products with High Free Quantity" className="md:col-span-2 h-[450px]">
              <Pie
                data={{
                  labels: dashboardData.highFreeQuantity.labels,
                  datasets: [{
                    label: 'Free Units',
                    data: dashboardData.highFreeQuantity.data,
                    backgroundColor: [
                      '#F87171', '#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#FB7185',
                    ],
                  }]
                }}
                options={{ maintainAspectRatio: false }}
              />
            </Card>
          </div>
        ) : (
          <div className='flex justify-center'>
          <div className="text-center  w-100  text-gray-500 border border-dashed p-10 rounded-lg bg-white shadow-inner mt-10">
            <p>🚫 No data to display. Please upload a sales file to begin analysis.</p>
          </div>
          </div>
        )}
      </div>
    );
  }

  const Card = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition ${className}`}>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );