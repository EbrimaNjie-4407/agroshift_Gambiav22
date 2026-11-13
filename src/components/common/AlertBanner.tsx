/**
 * AgroShift Gambia — AlertBanner Component
 * Used for communicating API connectivity status, advisory warnings, and NASA data provenance limitations.
 */

import React from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 border-red-200 text-red-900',
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
    },
    success: {
      bg: 'bg-green-50 border-green-200 text-green-900',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />,
    },
  };

  const current = styles[type];

  return (
    <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${current.bg} ${className}`}>
      <div className="flex items-start gap-3">
        {current.icon}
        <div className="text-xs sm:text-sm">
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          <div className="leading-relaxed opacity-90">{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
