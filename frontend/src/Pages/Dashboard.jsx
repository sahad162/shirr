// src/pages/Dashboard.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import baseURL from "../Services/baseURL";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import TopStockistCard from "../components/TopStockistCard";
import SalesReportCard from "../components/SalesReportCard";
import SalesByCategoryCard from "../components/SalesByCategoryCard";
import { Warehouse, Package, TrendingUp, ShoppingCart, Loader2 } from "lucide-react";

const formatCurrency = (value) => {
  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseURL}/api/sales-data/`);
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch dashboard data. Please upload a report first.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-100 h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="ml-4 text-lg text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-100 h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</p>
        </div>
      </div>
    );
  }

  // --- Dynamic Data Preparation ---
  const kpi = dashboardData?.kpiMetrics || {};
  const salesReport = dashboardData?.salesReport || {};
  const growingMedicines = dashboardData?.growingMedicines || {};
  const revenueByArea = dashboardData?.revenueByArea || [];
  
  // Get sales change percentage from API response
  const salesChange = kpi.salesChangePercentage || 0;
  
  // --- MODIFIED LINE ---
  // Use the weekly sales data from the correct report structure for the sparkline chart
  const salesSpark = salesReport?.Weekly?.data || [];
  
  const productSpark = [2, 4, 3, 5, 4, 6]; // This can remain hardcoded for now

  return (
    <div className="bg-gray-100 h-screen overflow-auto">
      <Header />
      <main className="pt-20 px-6 bg-gray-100 min-h-screen">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 flex flex-col gap-6">
              <MetricCard
                icon={TrendingUp}
                title="Total Sales"
                value={formatCurrency(kpi.totalSales || 0)}
                change={Math.abs(salesChange)}
                trend={salesChange >= 0 ? 'up' : 'down'}
                sparkData={salesSpark}
              />
              <MetricCard
                icon={Package}
                title="Total Products"
                value={kpi.totalProducts || 0}
                change={1.2} trend="up" sparkData={productSpark}
              />
            </div>
            <div className="md:col-span-4 flex flex-col gap-6">
              <MetricCard
                icon={Warehouse}
                title="Stockists"
                value={12}
                change={0.8} trend="down" sparkData={salesSpark}
              />
              <MetricCard
                icon={ShoppingCart}
                title="Total Orders"
                value={kpi.totalOrders || 0}
                change={2.3} trend="up" sparkData={productSpark}
              />
            </div>
            <div className="md:col-span-4">
              <SalesByCategoryCard growingMedicines={growingMedicines} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8">
              <SalesReportCard reportData={salesReport} />
            </div>
            <div className="md:col-span-4">
              <TopStockistCard revenueByArea={revenueByArea} />
            </div>
          </div>
        </div>
      </main>
    </div>

    
  );
}