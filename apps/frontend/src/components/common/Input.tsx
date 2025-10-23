// ABOUTME: Reusable input component with label, error handling, and accessibility
// ABOUTME: Supports text, email, password, number input types

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          } ${className || ""}`}
          {...props}
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
