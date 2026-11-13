/**
 * AgroShift Gambia — Left Navigation Sidebar
 * Directly mirrors the Figma UI left sidebar navigation across Steps 1 to 8.
 * Dynamically displays the active field ID, name, district, and coordinates from context.
 */

import React from 'react';
import {
  Home,
  MapPin,
  FileText,
  Sliders,
  Leaf,
  LayoutGrid,
} from 'lucide-react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { ScreenStep } from '../../types/agroshift';

interface NavItem {
  id: ScreenStep;
  label: string;
  icon: React.ElementType;
  section: 'overview' | 'field' | 'details' | 'priorities' | 'analysis' | 'results';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Home, section: 'overview' },
  { id: 'choose-field', label: 'Choose a Field', icon: MapPin, section: 'field' },
  { id: 'field-details', label: 'Field Details', icon: FileText, section: 'details' },
  { id: 'priorities-limits', label: 'Priorities & Limits', icon: Sliders, section: 'priorities' },
  { id: 'evidence', label: 'Analysis', icon: Leaf, section: 'analysis' },
  { id: 'strategies', label: 'Results', icon: LayoutGrid, section: 'results' },
];

export const SidebarNav: React.FC = () => {
  const { currentStep, goToStep, selectedFieldId, fieldDetails, location } = useAgroShift();

  const isItemActive = (item: NavItem): boolean => {
    if (item.id === currentStep) return true;
    if (item.section === 'analysis' && (currentStep === 'analysis' || currentStep === 'evidence')) return true;
    if (
      item.section === 'results' &&
      (currentStep === 'strategies' || currentStep === 'strategy-detail' || currentStep === 'compare-report')
    )
      return true;
    return false;
  };

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
          Workflow
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => goToStep(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left cursor-pointer ${
                active
                  ? 'bg-green-50 text-green-800 font-semibold border-l-4 border-green-700 shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-green-700' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live Active Field Badge */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
        <div className="flex items-center gap-1.5 text-gray-800 font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-600 shrink-0"></span>
          <span className="truncate">{fieldDetails.name || selectedFieldId}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1 truncate">
          {location.district} · {selectedFieldId}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
          {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
        </p>
      </div>
    </aside>
  );
};
