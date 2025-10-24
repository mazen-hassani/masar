// ABOUTME: Progress bar component - displays percentage completion with visual indicator
// ABOUTME: Supports different sizes, colors, and shows percentage label

import React from "react";

interface ProgressBarProps {
  progress: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
}

const sizeConfig = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

const colorConfig = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  gray: "bg-gray-500",
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = "md",
  showLabel = false,
  color = "blue",
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const sizeClass = sizeConfig[size];
  const colorClass = colorConfig[color];

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClass}`}>
        <div
          className={`${colorClass} transition-all duration-300 ${sizeClass}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-600 mt-1">{clampedProgress}% complete</p>
      )}
    </div>
  );
};
