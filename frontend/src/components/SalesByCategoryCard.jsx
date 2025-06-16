import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Filter, MoreHorizontal } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SalesByCategoryCard({ growingMedicines }) {
  if (!growingMedicines || growingMedicines.message || !growingMedicines.labels) {
    return (
      <div className="text-white rounded-[40px] p-6 h-full w-full flex flex-col justify-center items-center" style={{ backgroundColor: "#212529" }}>
        <h2 className="text-lg font-semibold opacity-70 mb-4">Medicines Showing Growth</h2>
        <p className="text-gray-400">{growingMedicines?.message || "No growth data."}</p>
      </div>
    );
  }

  const topGrowing = growingMedicines.labels.slice(0, 3);
  const topGrowingSales = growingMedicines.last_month_sales.slice(0, 3);

  const categoryDetails = topGrowing.map((label, index) => ({
    name: label,
    value: topGrowingSales[index],
    color: ["#EF4444", "#D1D5DB", "#6B7280"][index % 3],
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
          label: (tooltipItem) => `${tooltipItem.label}: ₹${tooltipItem.raw.toLocaleString()}`,
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="text-white rounded-[40px] p-6 h-full w-full" style={{ backgroundColor: "#212529" }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold opacity-70">Medicines Showing Growth</h2>
        <div className="flex gap-2 text-gray-400">
          <div className="border border-gray-300 rounded-full p-2"><Filter size={18} /></div>
          <div className="border border-gray-300 rounded-full p-2"><MoreHorizontal size={18} /></div>
        </div>
      </div>
      <div className="flex gap-4 items-center mt-6">
        <div className="relative w-32 h-32">
          <Doughnut data={data} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold pointer-events-none">
            <p className="text-gray-400">Top 3</p>
            <p className="text-white text-lg">₹{total.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          {categoryDetails.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <div>
                  <p className="text-sm text-white truncate max-w-[100px]">{item.name}</p>
                  <p className="text-xs text-gray-400">₹{item.value.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-sm bg-[#343A40] text-gray-300 px-2 py-1 rounded-full">
                {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}