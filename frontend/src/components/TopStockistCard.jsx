import React from "react";

function TopStockistCard({ revenueByArea = [] }) {
  if (!revenueByArea || revenueByArea.length === 0) {
    return (
      <div className="rounded-[40px] p-6 text-white w-full h-full shadow-lg flex items-center justify-center" style={{ background: '#ee4d38' }}>
        <p className="opacity-75">No revenue data by area.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueByArea.map(c => c.revenue));
  
  const getFlag = (name) => {
      return name.substring(0, 3).toUpperCase();
  }

  return (
    <div className="rounded-[40px] p-6 text-white w-full max-w-sm shadow-lg h-full" style={{ background: '#ee4d38' }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold">Revenue by Area</h2>
          <p className="text-sm opacity-75 mt-1">Top performing areas</p>
        </div>
        <button className="text-white opacity-75 hover:opacity-100">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
      </div>
      <div className="space-y-4">
  {[...revenueByArea]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((area, idx) => (
      <div key={idx} className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-md font-mono px-2 py-1 bg-white/20 rounded">{getFlag(area.name)}</span>
            <span className="font-medium">{area.name}</span>
          </div>
          <span className="font-semibold text-lg">
            ₹{(area.revenue / 1000).toFixed(0)}K
          </span>
        </div>
        <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white/90 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${maxRevenue > 0 ? (area.revenue / maxRevenue) * 100 : 0}%`, minWidth: '8px' }}
          ></div>
        </div>
      </div>
    ))}
</div>
    </div>
  );
}

export default TopStockistCard;