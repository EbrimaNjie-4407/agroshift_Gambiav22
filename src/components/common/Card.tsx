/**
 * AgroShift Gambia — Card Component
 * Crisp 1px border #E5E7EB, #FFFFFF background, rounded-xl container.
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
