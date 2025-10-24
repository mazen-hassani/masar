// ABOUTME: Stat card component - displays key metrics and KPIs
// ABOUTME: Shows icon, label, value, and optional trend information

import React from "react";

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string | number;
  };
}

const colorConfig = {
  blue: "bg-blue-50 text-blue-900 border-blue-200",
  green: "bg-green-50 text-green-900 border-green-200",
  red: "bg-red-50 text-red-900 border-red-200",
  yellow: "bg-yellow-50 text-yellow-900 border-yellow-200",
  purple: "bg-purple-50 text-purple-900 border-purple-200",
  gray: "bg-gray-50 text-gray-900 border-gray-200",
};

const iconColorConfig = {
  blue: "text-blue-600 bg-blue-100",
  green: "text-green-600 bg-green-100",
  red: "text-red-600 bg-red-100",
  yellow: "text-yellow-600 bg-yellow-100",
  purple: "text-purple-600 bg-purple-100",
  gray: "text-gray-600 bg-gray-100",
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  color = "blue",
  trend,
}) => {
  const colorClass = colorConfig[color];
  const iconColorClass = iconColorConfig[color];

  return (
    <div className={`border rounded-lg p-6 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtext && <p className="text-xs opacity-60 mt-2">{subtext}</p>}
        </div>
        {icon && (
          <div className={`rounded-lg p-3 ${iconColorClass} text-xl flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          <span className={trend.direction === "up" ? "text-green-600" : trend.direction === "down" ? "text-red-600" : "text-gray-600"}>
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}
          </span>
          <span className="opacity-75">{trend.value}</span>
        </div>
      )}
    </div>
  );
};
