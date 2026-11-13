/**
 * AgroShift Gambia — Screen 9: Compare & Take Away
 * Faithful to Figma Page 9:
 * - Strategic Comparison matrix table covering Current, Option A, Option B, AND Option C
 *   strictly using backend criterion scores (zero fabricated fallbacks; shows "Not scored" if limit violated).
 * - Trade-off View 2D scatter plot (Water Resilience vs Soil Health)
 *   plotting only strategies with valid numeric scores and noting excluded un-scored options.
 * - "Decision Support Takeaway" banner with real backend suggestion text.
 * - "Get Your Farmer Report" modal action.
 */

import React, { useState } from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { ArrowLeft, Download, Share2, Sun, FileText, Sliders, AlertTriangle } from 'lucide-react';
import { PrintableFarmerReportModal } from './PrintableFarmerReportModal';
import { Strategy } from '../../types/agroshift';

const COMPARISON_CRITERIA = [
  { key: 'soil_health', label: 'Soil Health' },
  { key: 'water', label: 'Water Resilience' },
  { key: 'food', label: 'Food Security' },
  { key: 'income', label: 'Cash Income Fit' },
  { key: 'labour', label: 'Labour Ease' },
];

export const CompareTakeAwayScreen: React.FC = () => {
  const { evaluationResult, prevStep, goToStep, runEvaluation } = useAgroShift();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copyShareMessage, setCopyShareMessage] = useState(false);

  if (!evaluationResult) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
          <Sliders className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Comparison Matrix Unavailable</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          Run the FastAPI decision engine to compare Current Rotation, Option A, Option B, and Option C side by side and generate your printable farmer report.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => goToStep('priorities-limits')}
            className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            Review Priorities &amp; Limits
          </button>
          <button
            onClick={() => runEvaluation()}
            className="px-6 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-xs"
          >
            Run Decision Engine Now
          </button>
        </div>
      </div>
    );
  }

  const strategies = evaluationResult.strategies || [];
  const reference = evaluationResult.reference_rotation;
  const suggestion = evaluationResult.suggestion;

  const optionA = strategies.find((s) => s.id === 'A');
  const optionB = strategies.find((s) => s.id === 'B');
  const optionC = strategies.find((s) => s.id === 'C');

  const columns: Array<{ key: string; label: string; headerClass: string; dotClass: string; strategy?: Strategy | null }> = [
    { key: 'current', label: 'Current', headerClass: 'text-gray-700', dotClass: 'bg-gray-400', strategy: reference },
    { key: 'A', label: 'Option A', headerClass: 'text-amber-700 font-bold', dotClass: 'bg-amber-500', strategy: optionA },
    { key: 'B', label: 'Option B', headerClass: 'text-green-800 font-bold', dotClass: 'bg-green-600', strategy: optionB },
    { key: 'C', label: 'Option C', headerClass: 'text-emerald-900 font-bold', dotClass: 'bg-sky-600', strategy: optionC },
  ];

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopyShareMessage(true);
    setTimeout(() => setCopyShareMessage(false), 2500);
  };

  // Strict criterion extractor — never fabricates a fallback score
  const getScore = (strategy: Strategy | null | undefined, critName: string): number | null => {
    if (!strategy || strategy.score === null || strategy.score === undefined) return null;
    if (!strategy.criteria || strategy.criteria.length === 0) return null;
    const found = strategy.criteria.find((c) => c.name === critName);
    return found ? found.score : null;
  };

  const plotPoints = columns
    .map((col) => {
      const soil = getScore(col.strategy, 'soil_health');
      const water = getScore(col.strategy, 'water');
      return {
        ...col,
        soil,
        water,
        plottable: soil !== null && water !== null,
      };
    });

  const excludedFromPlot = plotPoints.filter((p) => p.strategy && !p.plottable);

  // Clamp coordinates cleanly inside 0..100 plot box
  const plotLeft = (val: number) => `${Math.max(10, Math.min(90, val))}%`;
  const plotTop = (val: number) => `${Math.max(10, Math.min(90, 100 - val))}%`;

  return (
    <div className="space-y-6">
      {/* Top Tag and Action Bar (Figma Page 9) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
            Heuristic Comparison · Decision Support for Local Review
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Download Report</span>
          </button>

          <button
            onClick={handleShare}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
            <span>{copyShareMessage ? 'Copied Link!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Engine Warnings Banner if any */}
      {evaluationResult.warnings && evaluationResult.warnings.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {evaluationResult.warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Grid: Comparison Table (Left) & Trade-off View (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Strategic Comparison Table (Figma Page 9) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-4">Strategic Comparison (Heuristic Scores)</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50">
                    <th className="py-2.5 px-3 text-green-900 font-bold">Criteria</th>
                    {columns.map((col) => (
                      <th key={col.key} className={`py-2.5 px-2.5 ${col.headerClass}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-gray-800">Overall Score</td>
                    {columns.map((col) => {
                      const s = col.strategy;
                      if (!s) return <td key={col.key} className="py-3 px-2.5 text-gray-400">—</td>;
                      if (s.score === null || s.score === undefined) {
                        return (
                          <td key={col.key} className="py-3 px-2.5 text-red-700 font-semibold text-[11px]">
                            Not scored
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className={`py-3 px-2.5 font-bold ${col.headerClass}`}>
                          {s.score} / 100
                        </td>
                      );
                    })}
                  </tr>

                  {COMPARISON_CRITERIA.map((crit) => (
                    <tr key={crit.key}>
                      <td className="py-3 px-3 font-semibold text-gray-800">{crit.label}</td>
                      {columns.map((col) => {
                        const val = getScore(col.strategy, crit.key);
                        return (
                          <td key={col.key} className="py-3 px-2.5 text-gray-700">
                            {val !== null ? `${val} pts` : 'Not scored'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  <tr>
                    <td className="py-3 px-3 font-semibold text-gray-800">Feasibility Status</td>
                    {columns.map((col) => {
                      const s = col.strategy;
                      if (!s) return <td key={col.key} className="py-3 px-2.5 text-gray-400">—</td>;
                      if (col.key === 'current') {
                        return <td key={col.key} className="py-3 px-2.5 text-gray-600">Recorded practice</td>;
                      }
                      return (
                        <td
                          key={col.key}
                          className={`py-3 px-2.5 font-semibold capitalize ${
                            s.recommendation_status === 'not_recommended'
                              ? 'text-red-700'
                              : s.recommendation_status === 'conditional_candidate'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {s.recommendation_status?.replace(/_/g, ' ') || '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Trade-off View 2D Scatter Plot (Figma Page 9) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900">Trade-off View</h3>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600 mb-3">
              {plotPoints
                .filter((p) => p.plottable)
                .map((p) => (
                  <span key={p.key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.dotClass}`} />
                    {p.label} ({p.water}, {p.soil})
                  </span>
                ))}
            </div>

            {excludedFromPlot.length > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-3">
                Excluded from plot (not scored / limit violated):{' '}
                {excludedFromPlot.map((p) => p.label).join(', ')}
              </p>
            )}

            {/* 2D Coordinate Scatter Plot */}
            <div className="relative border border-gray-200 rounded-xl p-4 bg-gray-50/30">
              <span className="text-[10px] text-gray-500 font-bold absolute top-2 left-2">
                Soil Health Score
              </span>
              <span className="text-[9px] text-gray-400 absolute top-7 left-2">High (80)</span>
              <span className="text-[9px] text-gray-400 absolute top-24 left-2">Med (50)</span>
              <span className="text-[9px] text-gray-400 absolute bottom-7 left-2">Low (20)</span>

              {/* 2x2 Grid Area */}
              <div className="ml-14 mr-2 my-6 h-40 border border-gray-300 bg-white relative">
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-200" />
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gray-200" />

                {plotPoints
                  .filter((p) => p.plottable && p.water !== null && p.soil !== null)
                  .map((p) => (
                    <div
                      key={p.key}
                      className={`absolute w-3.5 h-3.5 rounded-full ${p.dotClass} border-2 border-white shadow-xs transform -translate-x-1/2 -translate-y-1/2 cursor-pointer`}
                      style={{
                        left: plotLeft(p.water as number),
                        top: plotTop(p.soil as number),
                      }}
                      title={`${p.label}: Water ${p.water}, Soil ${p.soil}`}
                    />
                  ))}
              </div>

              {/* X Axis Labels */}
              <div className="ml-14 mr-2 flex justify-between text-[9px] text-gray-400 pt-1">
                <span>Low (20)</span>
                <span>Moderate (50)</span>
                <span>High (80)</span>
              </div>
              <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                Water Resilience Score
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Our Recommendation Banner (Figma Page 9) */}
      <div className="bg-[#f0f7f2] border border-[#d6ebd9] rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 shadow-xs">
          <Sun className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs sm:text-sm text-gray-800">
          <h4 className="font-bold text-gray-900 text-sm sm:text-base">Decision Support Takeaway</h4>
          <p className="leading-relaxed text-gray-700">
            {suggestion?.text || 'Review the scored options above with an extension officer before changing your field plan.'}
          </p>
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={prevStep}
          className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded-lg text-sm shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Detailed Breakdown</span>
        </button>

        <button
          onClick={() => setShowPrintModal(true)}
          className="px-8 py-3 bg-green-800 hover:bg-green-900 text-white font-semibold rounded-lg text-sm shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Get Your Farmer Report</span>
        </button>
      </div>

      {/* Printable Report Modal */}
      {showPrintModal && (
        <PrintableFarmerReportModal onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
