// ABOUTME: Alert component for displaying messages, errors, and notifications
// ABOUTME: Supports info, success, warning, and error variants with dismiss action

import React from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "ℹ️",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "✅",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    icon: "⚠️",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: "❌",
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  onClose,
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg p-4 ${className || ""}`}
      role="alert"
    >
      <div className="flex items-start">
        <span className="text-xl mr-3">{styles.icon}</span>
        <div className="flex-1">
          {title && (
            <h3 className={`${styles.text} font-semibold mb-1`}>{title}</h3>
          )}
          <p className={`${styles.text} text-sm`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${styles.text} ml-4 hover:opacity-70 transition-opacity`}
            aria-label="Close alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
