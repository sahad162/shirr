import React from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Filter, MoreHorizontal } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);


const categoryDetails = [
  { name: "Paracetamol", value: 30000, color: "#EF4444" },
  { name: "Amoxicillin", value: 42000, color: "#D1D5DB" },
  { name: "Vitamin D", value: 18000, color: "#6B7280" },
];

const total = categoryDetails.reduce((sum, item) => sum + item.value, 0);

const data = {
  labels: categoryDetails.map(item => item.name),
  datasets: [
    {
      data: categoryDetails.map(item => item.value),
      backgroundColor: categoryDetails.map(item => item.color),
      borderWidth: 0,
      cutout: "70%",
    },
  ],
};


const options = {
  plugins: {
    legend: {
      display: false, 
    },
    tooltip: {
      callbacks: {
        label: (tooltipItem) => {
          const label = data.labels[tooltipItem.dataIndex];
          const value = data.datasets[0].data[tooltipItem.dataIndex];
          return `${label}: $${value.toLocaleString()}`;
        },
      },
    },
  },
  maintainAspectRatio: false,
};

export default function SalesByCategoryCard() {
  return (
    <div
      className="text-white rounded-[40px] font-[poppins] p-6 h-full w-full"
      style={{ backgroundColor: "#212529" }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold opacity-70">
          Medicines Showing Growth
        </h2>
        <div className="flex gap-2 text-gray-400">
          <div className="border border-gray-300 rounded-full p-2">
            <Filter size={18} />
          </div>
          <div className="border border-gray-300 rounded-full p-2">
            <MoreHorizontal size={18} />
          </div>
        </div>
      </div>

    <div className="chart flex gap-2 ">
  <div className="relative w-38 h-38 mt-10 ">
    <Doughnut data={data} options={options} />
    <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold pointer-events-none">
      <p className="text-gray-400">Total</p>
      <p className="text-white text-lg">${total.toLocaleString()}</p>
    </div>
  </div>


  <div className="datas flex flex-col justify-center gap-3 space-y-2 mt-10">
    {categoryDetails.map((item, index) => {
      const percentage = ((item.value / total) * 100).toFixed(2);
      return (
        <div key={index} className="flex items-center justify-between gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>

          <div className="flex-1">
            <p className="text-sm text-white">{item.name}</p>
            <p className="text-xs text-gray-400">${item.value.toLocaleString()}</p>
          </div>

          <div className="text-sm bg-[#343A40] text-gray-300 px-2 py-1 rounded-full">
            {percentage}%
          </div>
        </div>
      );
    })}
  </div>
</div>

    </div>
  );
}
