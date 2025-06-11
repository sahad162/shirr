import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function SparkBar({ 
  data = [12, 19, 8, 15, 22, 18, 25, 14, 20, 16], 
  color = '#3B82F6',
  height = 'h-20',
  labels = [],
  showTooltip = true,
  tooltipPrefix = 'Value: ',
  tooltipSuffix = ''
}) {

  const chartLabels = labels.length ? labels : data.map((_, i) => `Item ${i + 1}`);
  
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data,
        backgroundColor: data.map((value, index) => {
          const intensity = value / Math.max(...data);
          return color + Math.floor(intensity * 255).toString(16).padStart(2, '0');
        }),
        borderRadius: 2, 
        barPercentage: 0.7, 
        categoryPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { 
      padding: {
        top: 2,
        bottom: 2,
        left: 1,
        right: 1
      }
    },
    scales: {
      x: { 
        display: false,
        grid: { display: false }
      },
      y: { 
        display: false,
        grid: { display: false },
        beginAtZero: true
      }
    },
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        enabled: showTooltip,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 6,
        padding: 8,
        displayColors: false,
        callbacks: {
          title: (tooltipItems) => {
            return chartLabels[tooltipItems[0].dataIndex];
          },
          label: (context) => {
            return `${tooltipPrefix}${context.parsed.y}${tooltipSuffix}`;
          },
        },
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    }
  };

  return (
    <div className={`w-full ${height}`}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

