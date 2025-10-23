// ABOUTME: Reusable button component with different variants and sizes
// ABOUTME: Supports primary, secondary, danger variants and loading state

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variantStyles = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:hover:bg-blue-600",
      secondary:
        "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:hover:bg-gray-200",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:hover:bg-red-600",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
