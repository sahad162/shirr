// src/components/SalesReportCard.jsx

import { useState, useEffect } from "react"; // <-- Import useEffect
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { ChevronDown } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const SalesReportCard = ({ reportData = {} }) => {
  const [activeTab, setActiveTab] = useState(""); // <-- Start with empty string
  const [chartType, setChartType] = useState("Bar");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // --- NEW: Make the component smarter ---
  // When data arrives, set the active tab to the first available one.
  useEffect(() => {
    const availableTabs = Object.keys(reportData);
    if (availableTabs.length > 0 && !activeTab) {
      setActiveTab(availableTabs[0]);
    }
  }, [reportData, activeTab]);

  const chartTypes = ["Bar", "Line"];
  
  // Use optional chaining for safety in case data is still loading
  const currentData = reportData[activeTab] || {
    title: "Loading...",
    data: [],
    labels: [],
    color: "#cccccc",
  };

  const chartData = {
    labels: currentData.labels,
    datasets: [
      {
        label: `${activeTab} Sales`,
        data: currentData.data,
        backgroundColor: chartType === "Bar" ? currentData.color + "80" : "transparent",
        borderColor: currentData.color,
        borderWidth: chartType === "Line" ? 2 : 1,
        fill: chartType === "Line" ? false : true,
        tension: chartType === "Line" ? 0.4 : 0,
        pointBackgroundColor: chartType === "Line" ? currentData.color : "transparent",
        pointBorderColor: chartType === "Line" ? currentData.color : "transparent",
        pointRadius: chartType === "Line" ? 4 : 0,
        pointHoverRadius: chartType === "Line" ? 6 : 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => `Sales: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { display: true, grid: { display: false } },
      y: {
        display: true,
        grid: { color: "#F3F4F6" },
        ticks: {
          callback: (value) => `₹${value >= 1000 ? `${value / 1000}K` : value}`,
        },
      },
    },
    interaction: { intersect: false, mode: 'index' },
  };

  return (
    <div className="bg-white rounded-[40px] p-6 shadow-md w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Sales Report</h2>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            {chartType} Chart
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg z-10">
              {chartTypes.map((type) => (
                <button key={type} onClick={() => { setChartType(type); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${chartType === type ? "font-medium text-blue-600" : ""}`}
                >
                  {type} Chart
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {Object.keys(reportData).length > 0 ? Object.keys(reportData).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-black text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
          >
            {tab}
          </button>
        )) : <p className="text-sm text-gray-500">Loading timeframes...</p>}
      </div>
      <div className="mb-2">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{currentData.title}</h3>
        <p className="text-sm text-gray-500">
          {activeTab === "Yearly" && "Performance across all months this year"}
          {activeTab === "Monthly" && "Daily performance this month"}
          {activeTab === "Weekly" && "Performance in the last 4 weeks"}
        </p>
      </div>
      <div className="h-60 w-full">
        {/* Use optional chaining for safety */}
        {currentData?.data?.length > 0 ? (
          chartType === "Bar" ? <Bar data={chartData} options={chartOptions} /> : <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">No data for this period</div>
        )}
      </div>
    </div>
  );
};

export default SalesReportCard;