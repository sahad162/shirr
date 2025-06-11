import React from "react";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import TopStockistCard from "../components/TopStockistCard";
import SalesReportCard from "../components/SalesReportCard";
import { Warehouse, Package, TrendingUp, ShoppingCart } from "lucide-react";
import SalesByCategoryCard from "../components/SalesByCategoryCard";

export default function Dashboard() {
  const salesSpark = [3, 5, 2, 6, 4, 3];
  const productSpark = [2, 4, 3, 5, 4, 6];

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
                value="₹163K"
                change={0.4}
                trend="down"
                sparkData={salesSpark}
              />
              <MetricCard
                icon={Package}
                title="Total Products"
                value="₹88K"
                change={1.2}
                trend="up"
                sparkData={productSpark}
              />
            </div>

            <div className="md:col-span-4 flex flex-col gap-6">
              <MetricCard
                icon={Warehouse}
                title="Stockists"
                value="₹45K"
                change={0.8}
                trend="down"
                sparkData={salesSpark}
              />
              <MetricCard
                icon={ShoppingCart}
                title="Total Orders"
                value="₹120K"
                change={2.3}
                trend="up"
                sparkData={productSpark}
              />
            </div>

            <div className="md:col-span-4">
              <SalesByCategoryCard />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8">
              <SalesReportCard />
            </div>

            <div className="md:col-span-4">
              <TopStockistCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
