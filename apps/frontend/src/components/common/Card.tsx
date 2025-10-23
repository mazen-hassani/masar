// ABOUTME: Reusable card component for content grouping and layout
// ABOUTME: Provides consistent styling for panels, sections, and data containers

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow border border-gray-200 ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className || ""}`} {...props}>
      {children}
    </div>
  );
};

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={`px-6 py-4 ${className || ""}`} {...props}>
      {children}
    </div>
  );
};

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex gap-3 justify-end ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </div>
  );
};
