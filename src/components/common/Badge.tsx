/**
 * AgroShift Gambia — Badge Component
 * Displays confidence, feasibility statuses, and dataset tags.
 */

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'blue' | 'gray' | 'red';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantClasses = {
    green: 'bg-green-50 text-green-800 border border-green-200',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200',
    blue: 'bg-blue-50 text-blue-800 border border-blue-200',
    gray: 'bg-gray-100 text-gray-700 border border-gray-200',
    red: 'bg-red-50 text-red-800 border border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
