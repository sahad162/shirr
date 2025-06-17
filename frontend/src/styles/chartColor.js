// src/styles/chartColors.js

// A modern and visually appealing color palette for your charts.
export const chartColors = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#d946ef', // fuchsia-500
  '#0ea5e9', // sky-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
];

// Utility function to generate semi-transparent versions for area fills, etc.
export const getTransparentColors = (alpha = 0.2) => {
    return chartColors.map(color => {
        let r = parseInt(color.slice(1, 3), 16),
            g = parseInt(color.slice(3, 5), 16),
            b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
};