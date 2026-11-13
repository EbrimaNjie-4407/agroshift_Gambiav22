/**
 * AgroShift Gambia — Screen 5: Analysing Your Field
 * Restored to match Figma Page 5 while preserving real POST /api/v2/strategies
 * loading, timeout, error, retry, static fallback, and back-to-priorities handling.
 * Does not introduce artificial delays or fake completion states.
 */

import React from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { Check, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Loader2, Database } from 'lucide-react';

export const AnalysisLoadingScreen: React.FC = () => {
  const {
    isEvaluating,
    isLoadingEvidence,
    evidenceData,
    evaluationResult,
    evaluationError,
    goToStep,
    runEvaluation,
    useOfflineFallback,
  } = useAgroShift();

  // Ground each activity strictly in real backend request state
  const step1Done = isEvaluating || evaluationResult !== null || Boolean(evaluationError);
  const step2Done = !isLoadingEvidence && (evidenceData !== null || evaluationResult !== null);
  const step3Done = !isEvaluating && evaluationResult !== null;
  const step4Done = !isEvaluating && evaluationResult !== null;

  const activities = [
    { label: 'Reviewing field information', done: step1Done, active: false },
    { label: 'Checking environmental data', done: step2Done, active: isEvaluating && isLoadingEvidence },
    { label: 'Applying farmer priorities and limits', done: step3Done, active: isEvaluating },
    { label: 'Preparing rotation options', done: step4Done, active: isEvaluating },
  ];

  return (
    <div className="py-6 flex justify-center">
      <div className="max-w-2xl w-full bg-[#eff6f1] rounded-2xl px-8 py-12 sm:px-14 sm:py-14 text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-gray-900">
            Analysing your field
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            Reviewing environmental information and comparing possible crop rotation strategies.
          </p>
        </div>

        {/* Circular loading indicator using AgroShift orange (#ea7b15) and dark green (#116b37) */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <svg
            className={`w-full h-full transform -rotate-90 ${isEvaluating ? 'animate-spin' : ''}`}
            viewBox="0 0 100 100"
            aria-label={isEvaluating ? 'Analysis in progress' : 'Analysis status'}
          >
            {/* Dark Green Arc */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="#116b37"
              strokeWidth="10"
              strokeDasharray="238.76"
              strokeDashoffset="145"
              strokeLinecap="round"
            />
            {/* Orange Arc */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="#ea7b15"
              strokeWidth="10"
              strokeDasharray="238.76"
              strokeDashoffset="80"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Four progress activities matching Figma Page 5 */}
        <div className="max-w-xs mx-auto space-y-3 text-left">
          {activities.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm font-medium text-[#116b37]">
              {item.done ? (
                <Check className="w-4 h-4 text-[#116b37] shrink-0" strokeWidth={2.5} />
              ) : item.active ? (
                <Loader2 className="w-4 h-4 text-[#ea7b15] animate-spin shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
              )}
              <span className={item.done ? 'text-[#116b37]' : 'text-gray-600'}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Real backend status, error/retry, or post-completion actions */}
        {evaluationError ? (
          <div className="w-full max-w-lg mx-auto bg-white border border-red-200 rounded-xl p-5 space-y-4 text-left">
            <div className="flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-900">Backend evaluation could not complete</p>
                <p className="leading-relaxed">{evaluationError}</p>
                <p className="text-[11px] text-gray-500">
                  Note: The Render FastAPI service may take 15–30 seconds to wake from sleep on a cold start.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => runEvaluation()}
                className="px-4 py-2 bg-[#116b37] hover:bg-[#0d542b] text-white font-medium rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Analysis</span>
              </button>

              <button
                onClick={() => useOfflineFallback()}
                className="px-4 py-2 bg-[#fdf3e7] hover:bg-[#fae6cf] text-[#b45309] border border-amber-200 font-medium rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Load Static Pilot Fallback</span>
              </button>

              <button
                onClick={() => goToStep('priorities-limits')}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Priorities</span>
              </button>
            </div>
          </div>
        ) : isEvaluating ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-xs text-gray-500">
              Waiting for FastAPI recommendation engine response...
            </p>
            <button
              onClick={() => goToStep('priorities-limits')}
              className="px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Priorities</span>
            </button>
          </div>
        ) : evaluationResult ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={() => goToStep('evidence')}
              className="px-6 py-2.5 bg-white hover:bg-gray-50 text-[#116b37] border border-gray-200 font-medium rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>View Data Evidence</span>
            </button>
            <button
              onClick={() => goToStep('strategies')}
              className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] text-white font-medium rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>View Results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={() => goToStep('priorities-limits')}
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-[#116b37] border border-gray-200 font-medium rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Priorities</span>
            </button>
            <button
              onClick={() => runEvaluation()}
              className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] text-white font-medium rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>Start Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
