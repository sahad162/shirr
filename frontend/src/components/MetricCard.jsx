
import React from "react";
import SparkBar from "./SparkBar";
import { MoveUp, MoveDown } from "lucide-react";

export default function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  trend, 
  sparkData,
  
}) {
  const trendColor = trend === "up" ? "text-red-600" : "text-red-600";
  const sparkColor = trend === "up" ? "#EF4444" : "#EF4444";

  return (
    <div className="bg-white p-6 w-[90%] shadow-sm flex flex-col justify-between rounded-[40px]">
      <div className="flex items-center gap-5 text-gray-600 text-sm">
        <div className="border border-gray-3000 rounded-full p-2">
          <Icon size={20} />
        </div>
        <span className="text-[1rem] font-medium font-[poppins] text-gray-500">
          {title}
        </span>
      </div>

      <div className="low-head mt-3 flex justify-between">
        <div className="amount space-y-4">
          <h2 className="text-2xl font-bold  text-gray-900">{value}</h2>
         
        </div>
         <div className=" w-1/2">
            <SparkBar data={sparkData} color={sparkColor} />
          </div>
      </div>
    </div>
  );
}
