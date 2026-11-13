/**
 * AgroShift Gambia — Screen 3: Field Details
 * Matches the reference UI layout:
 * - Card 1: Field Information (2x2 grid: Field name, Field size (ha), Field type, Soil type)
 * - Card 2: Crop History (Last 3 Seasons) (3 cards: Season 1 2022/2023, Season 2 2023/2024, Season 3 2024/2025)
 * - Card 3: Farming System (Do you intercrop? Yes/No radios + Other observations input)
 * - Bottom bar: "← Back" and "Next →"
 */

import React, { useState } from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';

const CROP_OPTIONS = [
  'Groundnut',
  'Early Millet',
  'Sorghum',
  'Cowpea',
  'Maize',
  'Upland Rice',
  'Lowland / Swamp Rice',
  'Sesame',
  'Cassava',
  'Sweet Potato',
  'Fallow',
];

const FIELD_TYPES = ['Upland', 'Lowland', 'Fallow', 'Homestead'] as const;

const SOIL_TYPES = [
  'Sandy loam',
  'Loamy sand',
  'Clay loam',
  'Lateritic gravelly soil',
] as const;

export const FieldDetailsScreen: React.FC = () => {
  const {
    fieldDetails,
    setFieldDetails,
    cropHistory,
    setCropHistory,
    farmingSystem,
    setFarmingSystem,
    nextStep,
    prevStep,
  } = useAgroShift();

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = () => {
    if (!cropHistory.season_1 || !cropHistory.season_2 || !cropHistory.season_3) {
      setValidationError('Please select a crop for all three seasons.');
      return;
    }
    setValidationError(null);
    nextStep();
  };

  return (
    <div className="space-y-5">
      {validationError && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-medium">
          {validationError}
        </div>
      )}

      {/* Card 1: Field Information */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">Field Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Field name (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Kotu Field"
              value={fieldDetails.name}
              onChange={(e) => setFieldDetails({ ...fieldDetails, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Field size (ha)
            </label>
            <input
              type="number"
              step="0.01"
              readOnly
              placeholder="e.g. 2.5"
              value={fieldDetails.size_ha}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Field type
            </label>
            <div className="relative">
              <select
                value={fieldDetails.field_type}
                onChange={(e) => setFieldDetails({ ...fieldDetails, field_type: e.target.value as any })}
                className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-green-800"
              >
                <option value="">Select type</option>
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Soil type (observed)
            </label>
            <div className="relative">
              <select
                value={fieldDetails.observed_soil}
                onChange={(e) => setFieldDetails({ ...fieldDetails, observed_soil: e.target.value })}
                className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-green-800"
              >
                <option value="">Select soil type</option>
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Crop History (Last 3 Seasons) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">Crop History (Last 3 Seasons)</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Season 1 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-900">Season 1</span>
              <span className="text-gray-400">(2022 / 2023)</span>
            </div>
            <div className="relative">
              <select
                value={cropHistory.season_1}
                onChange={(e) => {
                  setCropHistory({ ...cropHistory, season_1: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                className="w-full appearance-none px-3 py-2.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-green-800"
              >
                <option value="">Select crop</option>
                {CROP_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Season 2 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-900">Season 2</span>
              <span className="text-gray-400">(2023 / 2024)</span>
            </div>
            <div className="relative">
              <select
                value={cropHistory.season_2}
                onChange={(e) => {
                  setCropHistory({ ...cropHistory, season_2: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                className="w-full appearance-none px-3 py-2.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-green-800"
              >
                <option value="">Select crop</option>
                {CROP_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Season 3 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-900">Season 3</span>
              <span className="text-gray-400">(2024 / 2025)</span>
            </div>
            <div className="relative">
              <select
                value={cropHistory.season_3}
                onChange={(e) => {
                  setCropHistory({ ...cropHistory, season_3: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                className="w-full appearance-none px-3 py-2.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-green-800"
              >
                <option value="">Select crop</option>
                {CROP_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Farming System */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">Farming System</h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-4 space-y-2.5">
            <label className="block text-xs font-semibold text-gray-600">
              Do you intercrop?
            </label>
            <div className="flex items-center gap-8 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                <input
                  type="radio"
                  name="intercrop"
                  checked={farmingSystem.intercropping === true}
                  onChange={() => setFarmingSystem({ ...farmingSystem, intercropping: true })}
                  className="w-4 h-4 accent-[#116b37] cursor-pointer"
                />
                <span className={farmingSystem.intercropping === true ? 'text-[#116b37] font-semibold' : 'text-gray-800'}>
                  Yes
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                <input
                  type="radio"
                  name="intercrop"
                  checked={farmingSystem.intercropping === false}
                  onChange={() => setFarmingSystem({ ...farmingSystem, intercropping: false })}
                  className="w-4 h-4 accent-[#116b37] cursor-pointer"
                />
                <span className={farmingSystem.intercropping === false ? 'text-[#116b37] font-semibold' : 'text-gray-800'}>
                  No
                </span>
              </label>
            </div>
          </div>

          <div className="md:col-span-8">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Other observations (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. soil condition, drainage, field notes..."
              value={farmingSystem.farmer_observations}
              onChange={(e) => setFarmingSystem({ ...farmingSystem, farmer_observations: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-800"
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="flex items-center justify-between pt-3">
        <button
          onClick={prevStep}
          className="px-6 py-2.5 bg-white hover:bg-gray-50 text-[#116b37] border border-gray-200 font-semibold rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handleNext}
          className="px-8 py-2.5 bg-[#0d6e35] hover:bg-[#0a582a] text-white font-semibold rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
