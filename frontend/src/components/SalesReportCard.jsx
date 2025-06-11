import { useState } from "react";
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

const SalesReportCard = () => {
  const [activeTab, setActiveTab] = useState("Yearly");
  const [chartType, setChartType] = useState("Bar");
  const [dropdownOpen, setDropdownOpen] = useState(false);

 
  const reportData = {
    Yearly: {
      title: "Yearly Sales: ₹12.4M",
      data: [2.1, 3.2, 2.8, 4.1, 3.7, 4.5, 3.9, 4.2, 3.6, 4.8, 4.3, 5.1],
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      color: "#3B82F6"
    },
    Monthly: {
      title: "Monthly Sales: ₹1.1M",
      data: [150, 280, 320, 180, 420, 380, 290, 350, 410, 320, 380, 450, 390, 420, 380, 460, 410, 490, 430, 480, 520, 490, 530, 510, 540, 520, 580, 560, 590, 570],
      labels: Array.from({length: 30}, (_, i) => i + 1),
      color: "#10B981"
    },
    Weekly: {
      title: "Weekly Sales: ₹245K",
      data: [35, 42, 38, 45, 41, 39, 44],
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      color: "#F59E0B"
    },
  };

  const chartTypes = ["Bar", "Line"];

  const currentData = reportData[activeTab];

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
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        cornerRadius: 8,
        callbacks: {
          label: (context) => `Sales: ₹${context.parsed.y}${activeTab === 'Yearly' ? 'M' : activeTab === 'Monthly' ? 'K' : 'K'}`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 10,
          },
          maxTicksLimit: activeTab === "Monthly" ? 10 : undefined,
        },
      },
      y: {
        display: true,
        grid: {
          color: "#F3F4F6",
          drawBorder: false,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 10,
          },
          callback: (value) => `₹${value}${activeTab === 'Yearly' ? 'M' : 'K'}`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="bg-white rounded-[40px] p-6 shadow-md w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Sales Report</h2>
    
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            {chartType} Chart
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {chartTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setChartType(type);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                    chartType === type ? "bg-blue-50 text-orange-600 font-medium" : "text-gray-700"
                  }`}
                >
                  {type} Chart
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {Object.keys(reportData).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-2">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {currentData.title}
        </h3>
        <p className="text-sm text-gray-500">
          {activeTab === "Yearly" && "Performance across 12 months"}
          {activeTab === "Monthly" && "Daily performance this month"}
          {activeTab === "Weekly" && "Performance across 7 days"}
        </p>
      </div>

      <div className="h-30 w-full">
        {chartType === "Bar" ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">Average</p>
          <p className="text-sm font-semibold text-gray-800">
            ₹{(currentData.data.reduce((a, b) => a + b, 0) / currentData.data.length).toFixed(1)}
            {activeTab === 'Yearly' ? 'M' : 'K'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Highest</p>
          <p className="text-sm font-semibold text-gray-800">
            ₹{Math.max(...currentData.data)}{activeTab === 'Yearly' ? 'M' : 'K'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Lowest</p>
          <p className="text-sm font-semibold text-gray-800">
            ₹{Math.min(...currentData.data)}{activeTab === 'Yearly' ? 'M' : 'K'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesReportCard;