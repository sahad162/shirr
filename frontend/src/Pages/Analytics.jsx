import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Award, BarChart3, Search, Calendar, Bell, Filter, Download, Plus, MoreHorizontal, Settings, HelpCircle, LogOut } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement);

const Analytics = () => {
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [chartData, setChartData] = useState(null);
  const [summaryCards, setSummaryCards] = useState([]);

  const reportTypes = {
    'sales-trends': {
      label: 'Sales Trends (Growth/Decline) Across Areas',
      metrics: [
        { value: 'monthly-growth', label: 'Monthly Growth Rate' },
        { value: 'quarterly-comparison', label: 'Quarterly Comparison' },
        { value: 'year-over-year', label: 'Year-over-Year Analysis' },
        { value: 'area-performance', label: 'Area Performance Comparison' }
      ]
    },
    'top-performers': {
      label: 'Top-Performing Medicines by Area',
      metrics: [
        { value: 'revenue-based', label: 'Revenue Based Ranking' },
        { value: 'volume-based', label: 'Volume Based Ranking' },
        { value: 'market-share', label: 'Market Share Analysis' },
        { value: 'profitability', label: 'Profitability Index' }
      ]
    },
    'growth-medicines': {
      label: 'Medicines Showing Growth',
      metrics: [
        { value: 'fastest-growing', label: 'Fastest Growing Products' },
        { value: 'consistent-growth', label: 'Consistent Growth Pattern' },
        { value: 'emerging-products', label: 'Emerging Products' },
        { value: 'growth-potential', label: 'Growth Potential Analysis' }
      ]
    }
  };

  const generateChartData = (reportType, metric) => {
    const areas = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone'];
    const medicines = ['Paracetamol', 'Aspirin', 'Ibuprofen', 'Amoxicillin', 'Metformin', 'Atorvastatin'];
    
    switch (reportType) {
      case 'sales-trends':
        return {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: areas.slice(0, 3).map((area, index) => ({
              label: area,
              data: Array.from({length: 6}, () => Math.floor(Math.random() * 100) + 50),
              borderColor: ['#3B82F6', '#EF4444', '#10B981'][index],
              backgroundColor: ['#3B82F620', '#EF444420', '#10B98120'][index],
              tension: 0.4,
              borderWidth: 3
            }))
          }
        };
      
      case 'top-performers':
        return {
          type: 'bar',
          data: {
            labels: medicines.slice(0, 5),
            datasets: [{
              label: 'Performance Score',
              data: Array.from({length: 5}, () => Math.floor(Math.random() * 50) + 50),
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
              borderRadius: 8
            }]
          }
        };
      
      case 'growth-medicines':
        return {
          type: 'doughnut',
          data: {
            labels: medicines.slice(0, 4),
            datasets: [{
              data: Array.from({length: 4}, () => Math.floor(Math.random() * 30) + 10),
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
              borderWidth: 0
            }]
          }
        };
      
      default:
        return null;
    }
  };

  const generateSummaryCards = (reportType) => {
    switch (reportType) {
      case 'sales-trends':
        return [
          { title: 'Overall Growth', value: '+12.5%', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', change: '+2.5%', changeType: 'positive' },
          { title: 'Best Performing Area', value: 'North Zone', icon: Award, color: 'text-blue-600', bgColor: 'bg-blue-50', change: 'Leading', changeType: 'neutral' },
          { title: 'Monthly Avg Growth', value: '+8.3%', icon: BarChart3, color: 'text-purple-600', bgColor: 'bg-purple-50', change: '+1.2%', changeType: 'positive' },
          { title: 'Areas in Decline', value: '1 of 5', icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-50', change: '-0.8%', changeType: 'negative' }
        ];
      
      case 'top-performers':
        return [
          { title: 'Top Medicine', value: 'Paracetamol', icon: Award, color: 'text-yellow-600', bgColor: 'bg-yellow-50', change: 'Leader', changeType: 'neutral' },
          { title: 'Highest Revenue', value: '₹2.5M', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', change: '+15%', changeType: 'positive' },
          { title: 'Market Leader', value: 'North Zone', icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-50', change: '+8%', changeType: 'positive' },
          { title: 'Performance Score', value: '94/100', icon: Award, color: 'text-purple-600', bgColor: 'bg-purple-50', change: '+5pts', changeType: 'positive' }
        ];
      
      case 'growth-medicines':
        return [
          { title: 'Fastest Growing', value: 'Metformin', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', change: '+45%', changeType: 'positive' },
          { title: 'Growth Rate', value: '+45%', icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-50', change: '+12%', changeType: 'positive' },
          { title: 'New Launches', value: '3 Products', icon: Award, color: 'text-purple-600', bgColor: 'bg-purple-50', change: 'New', changeType: 'neutral' },
          { title: 'Potential Revenue', value: '₹1.8M', icon: TrendingUp, color: 'text-yellow-600', bgColor: 'bg-yellow-50', change: '+25%', changeType: 'positive' }
        ];
      
      default:
        return [];
    }
  };

  useEffect(() => {
    if (selectedReport && selectedMetric) {
      const data = generateChartData(selectedReport, selectedMetric);
      setChartData(data);
      setSummaryCards(generateSummaryCards(selectedReport));
    }
  }, [selectedReport, selectedMetric]);

  const handleReportChange = (event) => {
    setSelectedReport(event.target.value);
    setSelectedMetric('');
  };

  const handleMetricChange = (event) => {
    setSelectedMetric(event.target.value);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6B7280',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false
      },
    },
    scales: chartData?.type === 'doughnut' ? {} : {
      x: {
        ticks: {
          color: '#6B7280'
        },
        grid: {
          color: '#F3F4F6',
          borderColor: '#E5E7EB'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6B7280'
        },
        grid: {
          color: '#F3F4F6',
          borderColor: '#E5E7EB'
        }
      },
    },
  };

  const renderChart = () => {
    if (!chartData) return null;
    
    const chartProps = {
      data: chartData.data,
      options: chartOptions
    };

    switch (chartData.type) {
      case 'line':
        return <Line {...chartProps} />;
      case 'bar':
        return <Bar {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      default:
        return null;
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex">
     

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
    

        <div className="p-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={selectedReport}
                onChange={handleReportChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Report Type</option>
                {Object.entries(reportTypes).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
              <select
                value={selectedMetric}
                onChange={handleMetricChange}
                disabled={!selectedReport}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
              >
                <option value="">Select Metric</option>
                {selectedReport && reportTypes[selectedReport].metrics.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {summaryCards.map((card, index) => {
                const IconComponent = card.icon;
                return (
                  <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg ${card.bgColor}`}>
                        <IconComponent className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        card.changeType === 'positive' ? 'text-green-600 bg-green-50' :
                        card.changeType === 'negative' ? 'text-red-600 bg-red-50' :
                        'text-gray-600 bg-gray-50'
                      }`}>
                        {card.changeType === 'positive' && <TrendingUp className="inline w-3 h-3 mr-1" />}
                        {card.changeType === 'negative' && <TrendingDown className="inline w-3 h-3 mr-1" />}
                        {card.change}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-1">{card.title}</div>
                    <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedReport && selectedMetric ? 
                  `${reportTypes[selectedReport]?.label} - ${reportTypes[selectedReport]?.metrics.find(m => m.value === selectedMetric)?.label}` : 
                  'Analytics Overview'
                }
              </h3>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {selectedReport && selectedMetric ? (
              <div className="h-80">
                {renderChart()}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-xl font-semibold mb-2 text-gray-700">
                    Select Report Type and Metric
                  </div>
                  <div className="text-gray-500">
                    Choose from the dropdowns above to view your analytics
                  </div>
                </div>
                </div>
              )}
            
          </div>

          {/* Insights */}
          {selectedReport && selectedMetric && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="text-blue-600 font-medium mb-1">Performance Trend</div>
                    <div className="text-gray-600 text-sm">
                      Based on current data, the selected metric shows positive momentum across most coverage areas.
                    </div>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="text-green-600 font-medium mb-1">Recommendation</div>
                    <div className="text-gray-600 text-sm">
                      Focus on replicating successful strategies from top-performing areas to underperforming regions.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <button className="text-blue-600 hover:text-blue-800">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">Export Report</div>
                    <div className="text-sm text-gray-500">Download current analytics data</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">Schedule Report</div>
                    <div className="text-sm text-gray-500">Set up automated reporting</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">Share Dashboard</div>
                    <div className="text-sm text-gray-500">Collaborate with team members</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Analytics;