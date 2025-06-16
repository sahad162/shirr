import React from "react";

function RevenueByCountryCard() {
  const countries = [
    { name: "Palakad", flag: "PKD", revenue: 16000 },
    { name: "Trivandrum", flag: "TVM", revenue: 54000 },
    { name: "Kollam", flag: "KLM", revenue: 47000 },
  ];

  const maxRevenue = Math.max(...countries.map(c => c.revenue));

  return (
    <div className="rounded-[40px] p-6 text-white w-full max-w-sm shadow-lg" style={{ background: '#ee4d38' }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Revenue by Area
          </h2>
          <p className="text-sm opacity-75 mt-1">From last month</p>
        </div>
        <button className="text-white opacity-75 hover:opacity-100">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {countries.map((country, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="font-medium">{country.name}</span>
              </div>
              <span className="font-semibold text-lg">
                {(country.revenue / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white/90 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(country.revenue / maxRevenue) * 100}%`,
                  minWidth: '8px'
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RevenueByCountryCard;
