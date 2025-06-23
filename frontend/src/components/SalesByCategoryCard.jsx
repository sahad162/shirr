// frontend/src/components/SalesByCategoryCard.jsx

import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Filter, MoreHorizontal } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SalesByCategoryCard({ growingMedicines }) {
  // The robust check that now includes `last_week_sales`
  if (
    !growingMedicines ||
    !growingMedicines.labels ||
    !growingMedicines.last_week_sales || // Checking for the correct key
    growingMedicines.labels.length === 0
  ) {
    return (
      <div className="text-white rounded-[40px] p-6 h-full w-full flex flex-col justify-center items-center" style={{ backgroundColor: "#212529" }}>
        <h2 className="text-lg font-semibold opacity-70 mb-4">Medicines Showing Growth</h2>
        <p className="text-gray-400">No significant week-over-week growth data available.</p>
      </div>
    );
  }

  const topGrowingLabels = growingMedicines.labels.slice(0, 3);

  // --- THIS IS THE FIX ---
  // Changed from `last_month_sales` to `last_week_sales` to match the API.
  const topGrowingSales = growingMedicines.last_week_sales.slice(0, 3);

  const categoryDetails = topGrowingLabels.map((label, index) => ({
    name: label,
    value: topGrowingSales[index] || 0,
    color: ["#EF4444", "#8B5CF6", "#3B82F6"][index % 3],
  }));

  const total = categoryDetails.reduce((sum, item) => sum + item.value, 0);

  const data = {
    labels: categoryDetails.map((item) => item.name),
    datasets: [{
      data: categoryDetails.map((item) => item.value),
      backgroundColor: categoryDetails.map((item) => item.color),
      borderWidth: 0,
      cutout: "70%",
    }],
  };

  const options = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => ` ${tooltipItem.label}: ₹${tooltipItem.raw.toLocaleString()}`,
        },
        backgroundColor: '#343A40',
        padding: 10,
        cornerRadius: 4,
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="text-white rounded-[40px] p-6 h-full w-full" style={{ backgroundColor: "#212529" }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold opacity-70">Medicines Showing Growth</h2>
        <div className="flex gap-2 text-gray-400">
          <div className="border border-gray-600 rounded-full p-2 cursor-pointer hover:bg-gray-700"><Filter size={18} /></div>
          <div className="border border-gray-600 rounded-full p-2 cursor-pointer hover:bg-gray-700"><MoreHorizontal size={18} /></div>
        </div>
      </div>
      <div className="flex gap-6 items-center mt-8 md:mt-14">
        <div className="relative w-32 h-32 flex-shrink-0">
          <Doughnut data={data} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold pointer-events-none">
            <p className="text-gray-400">Top 3</p>
            <p className="text-white text-md">₹{total.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          {categoryDetails.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <div className="flex-grow">
                  <p className="text-sm text-white truncate max-w-[100px]" title={item.name}>{item.name}</p>
                  <p className="text-xs text-gray-400">₹{item.value.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-sm bg-[#343A40] text-gray-300 px-2 py-1 rounded-full flex-shrink-0">
                {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}