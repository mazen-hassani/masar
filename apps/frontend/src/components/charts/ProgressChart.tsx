// ABOUTME: Progress chart component - displays project completion progress
// ABOUTME: Shows percentage completion with visual indicator

import React from "react";

interface ProgressChartProps {
  percentage: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { container: 80, circle: 70, text: 24 },
  md: { container: 120, circle: 110, text: 36 },
  lg: { container: 160, circle: 150, text: 48 },
};

export const ProgressChart: React.FC<ProgressChartProps> = ({
  percentage,
  label,
  size = "md",
}) => {
  const sizes = sizeMap[size];
  const radius = sizes.circle / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (percent: number) => {
    if (percent >= 75) return "#10b981"; // green
    if (percent >= 50) return "#f59e0b"; // amber
    if (percent >= 25) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: sizes.container, height: sizes.container }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${sizes.container} ${sizes.container}`}
        >
          {/* Background circle */}
          <circle
            cx={sizes.container / 2}
            cy={sizes.container / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx={sizes.container / 2}
            cy={sizes.container / 2}
            r={radius}
            fill="none"
            stroke={getColor(percentage)}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
            transform={`rotate(-90 ${sizes.container / 2} ${sizes.container / 2})`}
          />
          {/* Percentage text */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy="0.3em"
            fontSize={sizes.text}
            fontWeight="bold"
            fill={getColor(percentage)}
          >
            {Math.round(percentage)}%
          </text>
        </svg>
      </div>
      {label && <p className="text-gray-600 text-sm font-medium">{label}</p>}
    </div>
  );
};
