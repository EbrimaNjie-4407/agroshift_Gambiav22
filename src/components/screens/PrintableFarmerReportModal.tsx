/**
 * AgroShift Gambia — Printable Farmer Report Modal
 * Generates an official, clean 1-page field report suitable for printing
 * or export by farmers and Department of Agriculture extension officers.
 * All environmental values and extension risks come directly from backend API data — zero hardcoded figures.
 */

import React, { useMemo } from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { Printer, X, Sprout, AlertTriangle } from 'lucide-react';

interface PrintableFarmerReportModalProps {
  onClose: () => void;
}

export const PrintableFarmerReportModal: React.FC<PrintableFarmerReportModalProps> = ({ onClose }) => {
  const {
    selectedFieldId,
    fieldDetails,
    location,
    cropHistory,
    farmingSystem,
    evaluationResult,
    evidenceData,
  } = useAgroShift();

  const handlePrint = () => {
    window.print();
  };

  // Pick ready option first, else highest-scoring feasible/conditional option, else first strategy
  const recommendedStrategy = useMemo(() => {
    const strategies = evaluationResult?.strategies || [];
    if (!strategies.length) return undefined;
    const readyId = evaluationResult?.suggestion?.ready_option;
    if (readyId) {
      const found = strategies.find((s) => s.id === readyId);
      if (found) return found;
    }
    return (
      strategies.find((s) => s.recommendation_status !== 'not_recommended' && s.score !== null) ||
      strategies[0]
    );
  }, [evaluationResult]);

  // Compute live environmental metrics strictly from GET /api/v2/evidence/{field_id}
  const envSummary = useMemo(() => {
    if (!evidenceData) return null;

    const power = evidenceData.evidence?.power_annual || [];
    const merraVals = power
      .map((p) => p.merra2.rain_total_mm)
      .filter((v): v is number => v !== null && v !== undefined);
    const imergVals = power
      .map((p) => p.imerg.rain_total_mm)
      .filter((v): v is number => v !== null && v !== undefined);

    const merraMean = merraVals.length
      ? `${(merraVals.reduce((a, b) => a + b, 0) / merraVals.length).toFixed(1)} mm (${merraVals.length}-yr mean)`
      : 'Unavailable';
    const imergMean = imergVals.length
      ? `${(imergVals.reduce((a, b) => a + b, 0) / imergVals.length).toFixed(1)} mm (${imergVals.length}-yr mean)`
      : 'Unavailable';

    const sg = evidenceData.evidence?.soilgrids || [];
    const phTop = sg.find((item) => item.property === 'phh2o' && item.depth === '0-5cm');
    const socTop = sg.find((item) => item.property === 'soc' && item.depth === '0-5cm');

    const srtm = evidenceData.evidence?.srtm_elevation_samples || [];
    const centerElev = srtm.find((s) => s.row_offset === 0 && s.column_offset === 0) || srtm[0];

    return {
      merraMean,
      imergMean,
      phText: phTop && phTop.value !== null ? `${phTop.value} (${phTop.depth})` : 'Unavailable',
      socText:
        socTop && socTop.value !== null
          ? `${socTop.value} ${socTop.unit} (${socTop.depth})`
          : 'Unavailable',
      elevationText:
        centerElev && centerElev.elevation_m !== null
          ? `${centerElev.elevation_m.toFixed(1)} m (SRTM 30m)`
          : 'Unavailable',
    };
  }, [evidenceData]);

  const risksList =
    recommendedStrategy?.risks_for_local_review &&
    recommendedStrategy.risks_for_local_review.length > 0
      ? recommendedStrategy.risks_for_local_review
      : ['Confirm seed availability, variety adaptation, and labour requirements locally with extension officers.'];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 my-8 space-y-6">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
            <h3 className="font-bold text-gray-900 text-base">AgroShift Farmer Field Report</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-800 hover:bg-green-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              aria-label="Close report modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="space-y-6 text-gray-800" id="farmer-report-document">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-green-800">
            <div>
              <div className="flex items-center gap-2">
                <Sprout className="w-6 h-6 text-green-800" />
                <h1 className="text-xl font-bold text-gray-900">AgroShift Gambia</h1>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Crop-Rotation Decision Support for Rain-fed Farmers</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-gray-900">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-gray-500 font-mono text-[11px]">
                ID: {evaluationResult?.field_id || selectedFieldId}
              </p>
            </div>
          </div>

          {/* Section 1: Field & Farmer Information */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block text-[11px]">Field Name</span>
              <span className="font-bold text-gray-900">{fieldDetails.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">District &amp; Region</span>
              <span className="font-bold text-gray-900">
                {location.district}, {location.region}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Field Size &amp; Type</span>
              <span className="font-bold text-gray-900">
                {fieldDetails.size_ha} ha ({fieldDetails.field_type})
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Soil (Observed)</span>
              <span className="font-bold text-gray-900">{fieldDetails.observed_soil}</span>
            </div>
          </div>

          {/* Section 2: 3-Season History & Environmental Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-gray-200 space-y-2">
              <p className="font-bold text-gray-900">Recorded Crop History</p>
              <div className="space-y-1 text-gray-700">
                <p>• <strong>Season 1 (2022/23):</strong> {cropHistory.season_1}</p>
                <p>• <strong>Season 2 (2023/24):</strong> {cropHistory.season_2}</p>
                <p>• <strong>Season 3 (2024/25):</strong> {cropHistory.season_3}</p>
                <p>• <strong>Intercropping:</strong> {farmingSystem.intercropping ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 space-y-2">
              <p className="font-bold text-gray-900">NASA &amp; SoilGrids Area Context</p>
              {envSummary ? (
                <div className="space-y-1 text-gray-700">
                  <p>• <strong>NASA POWER (MERRA-2):</strong> {envSummary.merraMean}</p>
                  <p>• <strong>GPM IMERG Rain:</strong> {envSummary.imergMean}</p>
                  <p>• <strong>SoilGrids Topsoil:</strong> pH {envSummary.phText} · SOC {envSummary.socText}</p>
                  <p>• <strong>Center Elevation:</strong> {envSummary.elevationText}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Cached environmental datasets unavailable for field ID &apos;{selectedFieldId}&apos;.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Highlighted Candidate Strategy */}
          {recommendedStrategy && (
            <div className="p-5 rounded-xl border-2 border-green-800 bg-green-50/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-green-800 uppercase tracking-wider block">
                    {evaluationResult?.suggestion?.ready_option === recommendedStrategy.id
                      ? `Ready Option (Option ${recommendedStrategy.id})`
                      : `Top Candidate Option (Option ${recommendedStrategy.id})`}
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">{recommendedStrategy.name}</h3>
                </div>
                <span className="px-2.5 py-1 bg-green-800 text-white rounded text-xs font-bold shrink-0">
                  {recommendedStrategy.score !== null && recommendedStrategy.score !== undefined
                    ? `Score: ${recommendedStrategy.score}/100`
                    : 'Not scored'}
                </span>
              </div>

              {/* Season Plan */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                {recommendedStrategy.sequence.map((seq, i) => (
                  <div key={i} className="p-2.5 bg-white rounded-lg border border-green-200">
                    <span className="text-[10px] font-semibold text-gray-400 block capitalize">
                      {seq.season?.replace(/_/g, ' ') || `Season ${i + 1}`}
                    </span>
                    <strong className="text-gray-900 text-xs block mt-0.5 capitalize">{seq.crop}</strong>
                    <span className="text-[10px] text-green-700 capitalize">{seq.role || 'Rainy season'}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-700 leading-relaxed pt-1">
                <strong>Agronomic Rationale:</strong> {recommendedStrategy.why}
              </p>
            </div>
          )}

          {/* Section 4: Risks for Local Review (Backend-sourced) */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5 text-xs text-amber-950">
            <p className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Prior To Field Execution — Check With Agricultural Extension:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              {risksList.map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </div>

          {/* Data Quality & Scientific Disclaimer */}
          <div className="pt-2 border-t border-gray-200 space-y-1.5 text-[10px] text-gray-500 leading-relaxed">
            {evaluationResult?.data_quality?.notes && evaluationResult.data_quality.notes.length > 0 && (
              <p>
                <strong>Data Quality Notes:</strong> {evaluationResult.data_quality.notes.join(' ')}
              </p>
            )}
            <p className="italic">
              <strong>Disclaimer:</strong>{' '}
              {evaluationResult?.disclaimer ||
                'AgroShift Gambia provides decision-support guidance based on historical environmental data. It does not warrant or guarantee agricultural yield outcomes.'}
            </p>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="flex justify-end pt-3 border-t border-gray-100 no-print">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
