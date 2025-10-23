// ABOUTME: Bar chart component - displays comparative data across categories
// ABOUTME: Shows task distribution, project status breakdown, etc.

import React from "react";

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 300,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value));
  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div style={{ height, display: "flex", alignItems: "flex-end", gap: "16px" }}>
        {data.map((item, index) => (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full bg-gray-200 rounded-t-lg overflow-hidden flex items-flex-end">
              <div
                style={{
                  height: (item.value / maxValue) * (height - 40),
                  width: "100%",
                  backgroundColor: item.color || colors[index % colors.length],
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
