// ABOUTME: Status badge component - displays task/activity/project status
// ABOUTME: Shows colored badges for different status values with hover tooltips

import React from "react";

export type StatusType = "NOT_STARTED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "VERIFIED";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<StatusType, { bg: string; text: string; label: string }> = {
  NOT_STARTED: { bg: "bg-gray-100", text: "text-gray-800", label: "Not Started" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-800", label: "In Progress" },
  ON_HOLD: { bg: "bg-yellow-100", text: "text-yellow-800", label: "On Hold" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
  VERIFIED: { bg: "bg-purple-100", text: "text-purple-800", label: "Verified" },
};

const sizeConfig = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${config.bg} ${config.text} ${sizeClass}`}
      title={config.label}
    >
      {config.label}
    </span>
  );
};
