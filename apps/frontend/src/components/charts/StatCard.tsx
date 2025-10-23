// ABOUTME: Stat card component - displays key metrics and KPIs
// ABOUTME: Shows number with label and optional trend indicator

import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    percentage: number;
  };
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-600",
  purple: "bg-purple-50 text-purple-600",
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  trend,
  icon,
  color = "blue",
}) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {unit && <span className="text-gray-500 text-sm">{unit}</span>}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                trend.direction === "up"
                  ? "text-green-600"
                  : trend.direction === "down"
                    ? "text-red-600"
                    : "text-gray-600"
              }`}
            >
              <span>
                {trend.direction === "up"
                  ? "↑"
                  : trend.direction === "down"
                    ? "↓"
                    : "→"}
              </span>
              <span>{Math.abs(trend.percentage)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorMap[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
