/**
 * AgroShift Gambia — Screen 4: Farmer Priorities & Limits
 * Restored to match Figma Page 4 while preserving the 0–3 integer backend scale
 * and exact constraint payload mapping in AgroShiftContext.
 */

import React from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import {
  Droplet,
  Leaf,
  Sprout,
  Database,
  Users,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { FarmerPriorities } from '../../types/agroshift';

const WATER_SOURCES = [
  'Rain-fed only',
  'Well / Borehole',
  'River / Stream',
  'Supplemental irrigation',
] as const;

const SEED_AVAILABILITY = [
  'High / Certified',
  'Medium / Local market',
  'Low / Saved seed only',
] as const;

const LABOUR_AVAILABILITY = [
  'Abundant family labour',
  'Moderate hired labour',
  'Scarce / Family only',
] as const;

const BUDGET_LEVELS = [
  'Low / Minimal input',
  'Moderate',
  'High / Commercial inputs',
] as const;

interface PriorityConfig {
  key: keyof FarmerPriorities;
  label: string;
  icon: React.ElementType;
  iconColor: string;
}

const PRIORITY_ITEMS: PriorityConfig[] = [
  { key: 'water', label: 'Conserve Water', icon: Droplet, iconColor: 'text-sky-600' },
  { key: 'soil_health', label: 'Improve Soil Health', icon: Leaf, iconColor: 'text-[#116b37]' },
  { key: 'food', label: 'Increase Food Production', icon: Sprout, iconColor: 'text-[#116b37]' },
  { key: 'income', label: 'Generate Income', icon: Database, iconColor: 'text-[#116b37]' },
  { key: 'labour', label: 'Reduce Labour', icon: Users, iconColor: 'text-[#116b37]' },
];

export const PrioritiesLimitsScreen: React.FC = () => {
  const {
    priorities,
    setPriorities,
    constraints,
    setConstraints,
    prevStep,
    runEvaluation,
    isEvaluating,
  } = useAgroShift();

  const totalPriorityPoints =
    priorities.water +
    priorities.soil_health +
    priorities.food +
    priorities.income +
    priorities.labour;

  const getNormalizedPercent = (val: number): number => {
    if (totalPriorityPoints <= 0) return 20;
    return Math.round((val / totalPriorityPoints) * 100);
  };

  const handlePriorityChange = (key: keyof FarmerPriorities, rawVal: number) => {
    if (Number.isNaN(rawVal)) return;
    const clamped = Math.max(0, Math.min(3, Math.round(rawVal)));
    setPriorities((prev) => ({ ...prev, [key]: clamped }));
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN — Your Priorities (Figma Page 4) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Your Priorities</h2>
            <span className="text-[11px] font-medium text-gray-400">
              0–3 engine scale · live weight %
            </span>
          </div>

          <div className="space-y-6">
            {PRIORITY_ITEMS.map(({ key, label, icon: Icon, iconColor }) => {
              const value = priorities[key];
              const pct = getNormalizedPercent(value);

              return (
                <div key={key} className="flex items-center gap-4">
                  {/* Left icon */}
                  <div className="w-7 flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
                  </div>

                  {/* Center label, percentage & slider */}
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <label htmlFor={`priority-slider-${key}`} className="font-medium text-gray-800">
                        {label}
                      </label>
                      <span className="text-xs font-medium text-gray-700 tabular-nums">{pct}%</span>
                    </div>

                    <input
                      id={`priority-slider-${key}`}
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={value}
                      onChange={(e) => handlePriorityChange(key, Number(e.target.value))}
                      aria-label={label}
                      className="w-full agroshift-slider"
                    />
                  </div>

                  {/* Right numeric box (0–3 scale) */}
                  <input
                    type="number"
                    min={0}
                    max={3}
                    step={1}
                    value={value}
                    onChange={(e) => handlePriorityChange(key, Number(e.target.value))}
                    aria-label={`${label} numeric priority (0 to 3)`}
                    title="Priority level (0 = none, 1 = low, 2 = moderate, 3 = essential)"
                    className="w-14 h-10 rounded-lg border border-gray-200 bg-white text-center text-sm font-medium text-gray-800 focus:outline-none focus:border-[#116b37] shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN — Practical Constraints (Figma Page 4) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Practical Constraints</h2>

          <div className="space-y-4">
            {/* 1. Water source */}
            <div>
              <label htmlFor="constraint-water" className="block text-xs font-medium text-gray-700 mb-1.5">
                Water source
              </label>
              <div className="relative">
                <select
                  id="constraint-water"
                  value={constraints.water_source}
                  onChange={(e) =>
                    setConstraints({
                      ...constraints,
                      water_source: e.target.value as (typeof WATER_SOURCES)[number],
                    })
                  }
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#116b37] cursor-pointer"
                >
                  {WATER_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* 2. Seed availability */}
            <div>
              <label htmlFor="constraint-seed" className="block text-xs font-medium text-gray-700 mb-1.5">
                Seed availability
              </label>
              <div className="relative">
                <select
                  id="constraint-seed"
                  value={constraints.seed_availability}
                  onChange={(e) =>
                    setConstraints({
                      ...constraints,
                      seed_availability: e.target.value as (typeof SEED_AVAILABILITY)[number],
                    })
                  }
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#116b37] cursor-pointer"
                >
                  {SEED_AVAILABILITY.map((seed) => (
                    <option key={seed} value={seed}>
                      {seed}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* 3. Labour availability */}
            <div>
              <label htmlFor="constraint-labour" className="block text-xs font-medium text-gray-700 mb-1.5">
                Labour availability
              </label>
              <div className="relative">
                <select
                  id="constraint-labour"
                  value={constraints.labour_availability}
                  onChange={(e) =>
                    setConstraints({
                      ...constraints,
                      labour_availability: e.target.value as (typeof LABOUR_AVAILABILITY)[number],
                    })
                  }
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#116b37] cursor-pointer"
                >
                  {LABOUR_AVAILABILITY.map((labour) => (
                    <option key={labour} value={labour}>
                      {labour}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* 4. Budget level */}
            <div>
              <label htmlFor="constraint-budget" className="block text-xs font-medium text-gray-700 mb-1.5">
                Budget level
              </label>
              <div className="relative">
                <select
                  id="constraint-budget"
                  value={constraints.budget_level}
                  onChange={(e) =>
                    setConstraints({
                      ...constraints,
                      budget_level: e.target.value as (typeof BUDGET_LEVELS)[number],
                    })
                  }
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#116b37] cursor-pointer"
                >
                  {BUDGET_LEVELS.map((budget) => (
                    <option key={budget} value={budget}>
                      {budget}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation (Figma Page 4) */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={prevStep}
          className="px-5 py-2.5 bg-white hover:bg-gray-50 text-[#116b37] border border-gray-200 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={runEvaluation}
          disabled={isEvaluating}
          className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <span>{isEvaluating ? 'Analysing...' : 'Start Analysis'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
