/**
 * AgroShift Gambia — Button Component
 * Adheres strictly to the Minimal UI Design principles:
 * Primary: Solid green #166534 with white text.
 * Secondary: White background with 1px gray border.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-4 py-2.5 h-11 gap-2',
    lg: 'text-base px-6 py-3 h-12 gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-green-800 hover:bg-green-900 text-white shadow-xs focus-visible:outline-green-800',
    secondary: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-xs focus-visible:outline-gray-600',
    outline: 'bg-transparent hover:bg-green-50 text-green-800 border border-green-700 focus-visible:outline-green-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-600',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
