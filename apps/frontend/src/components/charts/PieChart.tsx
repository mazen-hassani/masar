// ABOUTME: Pie chart component - displays data distribution percentages
// ABOUTME: Shows task status breakdown, project allocation, etc.

import React from "react";

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: 120,
  md: 160,
  lg: 200,
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  size = "md",
}) => {
  const radius = sizeMap[size] / 2;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  let currentAngle = -90;
  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius * Math.cos(startRad);
    const y1 = radius * Math.sin(startRad);
    const x2 = radius * Math.cos(endRad);
    const y2 = radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M 0 0`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return { pathData, label: item.label, color: item.color, percentage };
  });

  return (
    <div>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        <svg
          width={sizeMap[size]}
          height={sizeMap[size]}
          viewBox={`-${radius}-${radius} ${sizeMap[size]} ${sizeMap[size]}`}
        >
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.pathData}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="space-y-2">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm text-gray-600">
                {slice.label}: {slice.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
