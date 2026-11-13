/**
 * AgroShift Gambia — Slider Component
 * Used for farmer priority weights (0-100%).
 * Matches Figma Page 4 with percentage label and number badge.
 */

import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  icon,
  min = 0,
  max = 100,
  step = 5,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium text-gray-800">
          {icon && <span className="text-green-700">{icon}</span>}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{value}%</span>
          <div className="w-10 h-7 rounded border border-gray-300 bg-gray-50 flex items-center justify-center font-mono text-xs text-gray-700">
            {value}
          </div>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-800"
      />
    </div>
  );
};
