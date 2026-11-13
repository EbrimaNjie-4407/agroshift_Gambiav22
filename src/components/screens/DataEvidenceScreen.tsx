/**
 * AgroShift Gambia — Screen 6: What the Data Says (Environmental Evidence)
 * Layout restructured to match the reference design (S4 · What the Data Says):
 * - Top bar: Period/Year dropdown (left) & View mode selector ("View: Charts" / "View: Tables & Data" / "View: Methodology") (right)
 * - Left column (4/12): 5 compact stacked indicator cards with simple outline icons, real backend values, and info triggers
 * - Right column (8/12):
 *   1. Top card: Trend/Chart & Table viewer with horizontal green/white pill tabs (Rainfall | NDVI | Soil Moisture | Soil Properties | Elevation)
 *   2. Bottom card: Data Sources & Details list with expandable scientific provenance & limitations rows
 * - Bottom navigation: "← Back" and "View Rotation Options →"
 *
 * Preserves 100% of existing backend data (GET /api/v2/evidence/{field_id}), error/404 states,
 * strict separation of MERRA-2 vs GPM IMERG, and all scientific disclosures.
 */

import React, { useMemo, useState } from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import {
  Droplet,
  Leaf,
  Sprout,
  Waves,
  Mountain,
  Info,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { AlertBanner } from '../common/AlertBanner';
import { Badge } from '../common/Badge';
import {
  InteractiveEnvironmentalChart,
  InteractiveChartDataset,
} from '../evidence/InteractiveEnvironmentalChart';

type EvidenceTab = 'Rainfall' | 'NDVI' | 'Soil Moisture' | 'Soil Properties' | 'Elevation';
type ViewMode = 'charts' | 'tables' | 'both';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SOIL_PROPERTY_META: Record<string, { label: string; description: string }> = {
  phh2o: { label: 'Soil pH in H₂O', description: 'Acidity / alkalinity index' },
  soc: { label: 'Soil Organic Carbon (SOC)', description: 'Organic matter carbon concentration' },
  nitrogen: { label: 'Total Nitrogen', description: 'Total soil nitrogen content' },
  sand: { label: 'Sand Fraction', description: 'Coarse mineral particle share' },
  clay: { label: 'Clay Fraction', description: 'Fine mineral particle share' },
  bdod: { label: 'Bulk Density', description: 'Dry soil mass per unit volume' },
};

const SOIL_DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm'];

function formatNum(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || Number.isNaN(val)) return 'Unavailable';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const DataEvidenceScreen: React.FC = () => {
  const {
    selectedFieldId,
    setSelectedFieldId,
    evidenceData,
    isLoadingEvidence,
    evidenceError,
    isEvidenceNotFound,
    loadEvidence,
    fieldDataSource,
    evaluationResult,
    nextStep,
    prevStep,
  } = useAgroShift();

  const [activeTab, setActiveTab] = useState<EvidenceTab>('Rainfall');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const powerAnnual = evidenceData?.evidence?.power_annual || [];
  const soilgrids = evidenceData?.evidence?.soilgrids || [];
  const srtmSamples = evidenceData?.evidence?.srtm_elevation_samples || [];
  const smapSnapshots = evidenceData?.evidence?.smap_monthly_snapshots || [];
  const modisSeries = evidenceData?.evidence?.modis_ndvi_nov_jun_usable || [];
  const methodology = evidenceData?.methodology;
  const refPeriod = evidenceData?.reference_period;

  // Dynamic years list from backend
  const availableYears = useMemo(
    () => Array.from(new Set(powerAnnual.map((p) => p.year))).sort((a, b) => b - a),
    [powerAnnual]
  );

  // Filtered annual rainfall series
  const displayPower = useMemo(
    () => (selectedYear === 'all' ? powerAnnual : powerAnnual.filter((p) => String(p.year) === selectedYear)),
    [powerAnnual, selectedYear]
  );

  // NASA POWER (MERRA-2) stats — kept strictly independent from GPM IMERG
  const merra2Stats = useMemo(() => {
    const vals = displayPower
      .map((p) => p.merra2.rain_total_mm)
      .filter((v): v is number => v !== null && v !== undefined);
    if (!vals.length) return null;
    return {
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length,
      missingDaysTotal: displayPower.reduce((acc, p) => acc + (p.merra2.rain_missing_days || 0), 0),
    };
  }, [displayPower]);

  // GPM IMERG stats — kept strictly independent from MERRA-2
  const imergStats = useMemo(() => {
    const vals = displayPower
      .map((p) => p.imerg.rain_total_mm)
      .filter((v): v is number => v !== null && v !== undefined);
    const spellSeasons = displayPower.filter(
      (p) => p.imerg.dry_spells_ge7_days !== null && p.imerg.dry_spells_ge7_days > 0
    ).length;
    const longestSpellVals = displayPower
      .map((p) => p.imerg.longest_dry_spell_days)
      .filter((v): v is number => v !== null && v !== undefined);
    if (!vals.length) return null;
    return {
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length,
      spellSeasons,
      maxDrySpell: longestSpellVals.length ? Math.max(...longestSpellVals) : null,
      missingDaysTotal: displayPower.reduce((acc, p) => acc + (p.imerg.rain_missing_days || 0), 0),
    };
  }, [displayPower]);

  // MODIS NDVI dynamic calculations from modis_ndvi_nov_jun_usable
  const modisStats = useMemo(() => {
    const filtered =
      selectedYear === 'all' ? modisSeries : modisSeries.filter((m) => String(m.year) === selectedYear);
    if (!filtered.length) return null;

    const values = filtered.map((m) => m.ndvi).filter((v): v is number => v !== null && v !== undefined);
    const goodCount = filtered.filter((m) => m.reliability === 0).length;
    const marginalCount = filtered.filter((m) => m.reliability === 1).length;

    const monthly = Array.from({ length: 12 }, (_, idx) => {
      const mNum = idx + 1;
      const items = filtered.filter((item) => {
        const parts = String(item.month).split('-');
        const parsed = parts.length === 2 ? Number(parts[1]) : Number(item.month);
        return parsed === mNum;
      });
      const mean = items.length ? items.reduce((s, it) => s + it.ndvi, 0) / items.length : null;
      return {
        monthNum: mNum,
        label: MONTH_NAMES[idx],
        count: items.length,
        mean,
      };
    });

    return {
      totalUsable: filtered.length,
      goodCount,
      marginalCount,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      monthly,
    };
  }, [modisSeries, selectedYear]);

  // SMAP soil moisture dynamic calculations
  const smapStats = useMemo(() => {
    const filtered =
      selectedYear === 'all' ? smapSnapshots : smapSnapshots.filter((s) => String(s.year) === selectedYear);
    if (!filtered.length) return null;

    const surfaceVals = filtered
      .map((s) => s.surface_soil_moisture_m3_m3)
      .filter((v): v is number => v !== null && v !== undefined);
    const rootVals = filtered
      .map((s) => s.rootzone_soil_moisture_m3_m3)
      .filter((v): v is number => v !== null && v !== undefined);
    const validSurface = filtered.filter((s) => s.surface_quality === 'valid').length;
    const distanceKm = filtered[0]?.distance_from_pilot_km ?? null;

    const byMonth = [7, 8, 9, 10].map((mNum) => {
      const items = filtered.filter((s) => s.month === mNum);
      const surf = items
        .map((i) => i.surface_soil_moisture_m3_m3)
        .filter((v): v is number => v !== null && v !== undefined);
      const root = items
        .map((i) => i.rootzone_soil_moisture_m3_m3)
        .filter((v): v is number => v !== null && v !== undefined);
      return {
        month: mNum,
        label: MONTH_NAMES[mNum - 1],
        surfaceMean: surf.length ? surf.reduce((a, b) => a + b, 0) / surf.length : null,
        rootMean: root.length ? root.reduce((a, b) => a + b, 0) / root.length : null,
        count: items.length,
      };
    });

    return {
      snapshotsCount: filtered.length,
      validSurfaceCount: validSurface,
      distanceKm,
      surfaceMin: surfaceVals.length ? Math.min(...surfaceVals) : null,
      surfaceMax: surfaceVals.length ? Math.max(...surfaceVals) : null,
      rootMin: rootVals.length ? Math.min(...rootVals) : null,
      rootMax: rootVals.length ? Math.max(...rootVals) : null,
      byMonth,
      recentRows: filtered.slice(-12).reverse(),
    };
  }, [smapSnapshots, selectedYear]);

  // SoilGrids dynamic grouping
  const soilGridsGrouped = useMemo(() => {
    const propsOrder = ['phh2o', 'soc', 'nitrogen', 'sand', 'clay', 'bdod'];
    const presentProps = propsOrder.filter((p) => soilgrids.some((s) => s.property === p));
    soilgrids.forEach((s) => {
      if (!presentProps.includes(s.property)) presentProps.push(s.property);
    });

    return presentProps.map((prop) => {
      const rows = soilgrids.filter((s) => s.property === prop);
      const byDepth: Record<string, number | null> = {};
      SOIL_DEPTHS.forEach((d) => {
        const match = rows.find((r) => r.depth === d);
        byDepth[d] = match ? match.value : null;
      });
      return {
        property: prop,
        label: SOIL_PROPERTY_META[prop]?.label || prop,
        description: SOIL_PROPERTY_META[prop]?.description || '',
        unit: rows[0]?.unit || '',
        quantile: rows[0]?.quantile || 'Q0.5',
        source: rows[0]?.source || 'ISRIC SoilGrids 2.0',
        byDepth,
      };
    });
  }, [soilgrids]);

  const getSoilVal = (prop: string, depth: string) => {
    const item = soilgrids.find((s) => s.property === prop && s.depth === depth);
    if (!item || item.value === null || item.value === undefined) return 'Unavailable';
    return `${item.value} ${item.unit}`;
  };

  // SRTM Elevation dynamic stats
  const srtmStats = useMemo(() => {
    if (!srtmSamples.length) return null;
    const center = srtmSamples.find((s) => s.row_offset === 0 && s.column_offset === 0) || srtmSamples[4];
    const elevs = srtmSamples.map((s) => s.elevation_m).filter((v): v is number => v !== null && v !== undefined);
    const ordered = [...srtmSamples].sort((a, b) =>
      a.row_offset !== b.row_offset ? a.row_offset - b.row_offset : a.column_offset - b.column_offset
    );
    return {
      centerElevation: center?.elevation_m ?? null,
      min: elevs.length ? Math.min(...elevs) : null,
      max: elevs.length ? Math.max(...elevs) : null,
      ordered,
    };
  }, [srtmSamples]);

  const toggleSourceInfo = (sourceKey: string, tabToFocus?: EvidenceTab) => {
    if (tabToFocus) setActiveTab(tabToFocus);
    setExpandedSource((prev) => (prev === sourceKey ? null : sourceKey));
  };

  // Single unified chart dataset for time-series tabs (Rainfall | NDVI | Soil Moisture)
  const activeChartDataset: InteractiveChartDataset | null = useMemo(() => {
    if (activeTab === 'Rainfall') {
      const maxVal = displayPower.reduce((mx, row) => {
        const m = row.merra2.rain_total_mm ?? 0;
        const i = row.imerg.rain_total_mm ?? 0;
        return Math.max(mx, m, i);
      }, 0);
      const yMax = Math.max(1600, Math.ceil(maxVal / 400) * 400);
      const step = yMax / 4;
      const yTicks = [0, step, step * 2, step * 3, yMax];

      return {
        metric: 'Rainfall',
        subtitle:
          selectedYear === 'all'
            ? 'June–October Seasonal Totals (mm) — Separate Datasets'
            : `${selectedYear} June–October Total (mm) — Separate Datasets`,
        contextNote:
          'MERRA-2 (~50 km) and GPM IMERG (~10 km) are plotted independently and never averaged. Amber outer rings mark seasons where GPM IMERG detected ≥1 Jul–Sep dry spell of ≥7 days (<1 mm/day).',
        xLabels: displayPower.map((r) => String(r.year)),
        xFullLabels: displayPower.map((r) => `${r.year} Season (Jun–Oct)`),
        yMin: 0,
        yMax,
        yTicks,
        yUnit: 'mm',
        formatValue: (v: number) => Math.round(v).toLocaleString(),
        series: [
          {
            id: 'merra2',
            label: 'NASA POWER (MERRA-2)',
            color: '#116b37',
            unit: 'mm',
            source: 'MERRA-2 reanalysis (~50 km)',
            points: displayPower.map((r) => ({
              value: r.merra2.rain_total_mm,
              meta: r.merra2.rain_missing_days > 0 ? `${r.merra2.rain_missing_days} missing d` : undefined,
            })),
          },
          {
            id: 'imerg',
            label: 'GPM IMERG',
            color: '#ea7b15',
            unit: 'mm',
            source: 'GPM IMERG satellite (~10 km)',
            points: displayPower.map((r) => {
              const spells = r.imerg.dry_spells_ge7_days ?? 0;
              const longest = r.imerg.longest_dry_spell_days;
              return {
                value: r.imerg.rain_total_mm,
                highlightRing: spells > 0,
                meta:
                  spells > 0
                    ? `${spells} dry spell${spells > 1 ? 's' : ''} ≥7d${longest ? ` (max ${longest}d)` : ''}`
                    : r.imerg.rain_missing_days > 0
                    ? `${r.imerg.rain_missing_days} missing d`
                    : undefined,
              };
            }),
          },
        ],
      };
    }

    if (activeTab === 'NDVI') {
      const monthly = modisStats?.monthly || [];
      const gapIndices = monthly
        .map((m, idx) => (m.mean === null ? idx : -1))
        .filter((idx) => idx !== -1);

      return {
        metric: 'NDVI',
        subtitle:
          selectedYear === 'all'
            ? 'Mean Usable NDVI by Month (Nov–Jun retained; Jul–Sep cloud gap)'
            : `${selectedYear} Usable MODIS NDVI by Month (Jul–Sep cloud gap)`,
        contextNote:
          'MODIS MOD13Q1 (250 m, ~6.25 ha/pixel) reflects landscape vegetation-cover context, not direct crop stress. Jul–Sep monsoon cloud-gap months are never interpolated or zero-filled.',
        xLabels: monthly.map((m) => m.label),
        xFullLabels: monthly.map((m) =>
          selectedYear === 'all' ? `${m.label} (2015–2025 mean)` : `${m.label} ${selectedYear}`
        ),
        gapIndices,
        gapLabel: 'Jul–Sep cloud gap (Nov–Jun usable)',
        yMin: 0,
        yMax: 1.0,
        yTicks: [0, 0.25, 0.5, 0.75, 1.0],
        yUnit: 'NDVI',
        formatValue: (v: number) => v.toFixed(2),
        series: [
          {
            id: 'modis_ndvi',
            label: 'MODIS MOD13Q1 (Usable Mean)',
            color: '#116b37',
            unit: 'NDVI',
            source: '250 m landscape vegetation cover',
            points: monthly.map((m) => ({
              value: m.mean,
              meta: m.count > 0 ? `${m.count} usable obs` : undefined,
            })),
          },
        ],
      };
    }

    if (activeTab === 'Soil Moisture') {
      const byMonth = smapStats?.byMonth || [];
      return {
        metric: 'Soil Moisture',
        subtitle:
          selectedYear === 'all'
            ? 'Mid-Month Regional Soil Moisture Snapshots (Jul–Oct, m³/m³)'
            : `${selectedYear} Mid-Month Regional Snapshots (Jul–Oct, m³/m³)`,
        contextNote: `Coarse regional SMAP L4_SM (~9 km grid, ${
          smapStats?.distanceKm ?? '—'
        } km from pilot coordinate) mid-month snapshots — regional context only, not a field soil sensor.`,
        xLabels: byMonth.map((m) => m.label),
        xFullLabels: byMonth.map((m) =>
          selectedYear === 'all' ? `${m.label} Snapshot Mean` : `${m.label} ${selectedYear} Snapshot`
        ),
        yMin: 0,
        yMax: 0.4,
        yTicks: [0, 0.1, 0.2, 0.3, 0.4],
        yUnit: 'm³/m³',
        formatValue: (v: number) => v.toFixed(2),
        series: [
          {
            id: 'smap_surface',
            label: 'Surface (0–5 cm)',
            color: '#0284c7',
            unit: 'm³/m³',
            source: 'SMAP L4_SM ~9 km regional snapshot',
            points: byMonth.map((m) => ({
              value: m.surfaceMean,
              meta: m.count > 0 ? `${m.count} snapshot${m.count > 1 ? 's' : ''}` : undefined,
            })),
          },
          {
            id: 'smap_root',
            label: 'Root-zone (0–100 cm)',
            color: '#116b37',
            unit: 'm³/m³',
            source: 'SMAP L4_SM ~9 km regional snapshot',
            points: byMonth.map((m) => ({
              value: m.rootMean,
              meta: m.count > 0 ? `${m.count} snapshot${m.count > 1 ? 's' : ''}` : undefined,
            })),
          },
        ],
      };
    }

    return null;
  }, [activeTab, displayPower, modisStats, smapStats, selectedYear]);

  // Loading state
  if (isLoadingEvidence && !evidenceData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#116b37] animate-spin mx-auto" />
        <div>
          <h3 className="text-base font-bold text-gray-900">Loading Environmental Evidence</h3>
          <p className="text-xs text-gray-500 mt-1">
            Fetching cached NASA POWER, GPM IMERG, MODIS NDVI, SMAP, SRTM, and ISRIC SoilGrids records for{' '}
            <span className="font-mono font-semibold">{selectedFieldId}</span>...
          </p>
        </div>
      </div>
    );
  }

  // Error / 404 Unavailable state (never silently replaced with fabricated data!)
  if (evidenceError && !evidenceData) {
    return (
      <div className="space-y-6">
        <AlertBanner
          type={isEvidenceNotFound ? 'warning' : 'error'}
          title={
            isEvidenceNotFound
              ? `No Environmental Evidence Cached for "${selectedFieldId}"`
              : 'Unable to Load Environmental Evidence'
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => loadEvidence(selectedFieldId, true)}
                className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              {isEvidenceNotFound && selectedFieldId !== 'field-001' && (
                <button
                  onClick={() => setSelectedFieldId('field-001')}
                  className="px-3.5 py-2 bg-[#116b37] hover:bg-[#0d542b] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Load Pilot Field (field-001) Evidence
                </button>
              )}
            </div>
          }
        >
          <p>{evidenceError}</p>
          {isEvidenceNotFound && (
            <p className="mt-1 text-xs">
              We do not invent or copy satellite measurements from another location. You can continue to view the crop-rotation rule engine results for your selected field preferences, or switch to pilot field <span className="font-mono font-semibold">field-001</span> to inspect Brikama Manduar&apos;s cached NASA datasets.
            </p>
          )}
        </AlertBanner>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={prevStep}
            className="px-5 py-2.5 bg-white hover:bg-gray-50 text-[#116b37] border border-gray-200 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] text-white rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
          >
            <span>View Rotation Options</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const indicatorCards: Array<{
    tab: EvidenceTab;
    sourceKey: string;
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    iconColor: string;
  }> = [
    {
      tab: 'Rainfall',
      sourceKey: 'power',
      title: 'Rainfall',
      value:
        merra2Stats || imergStats
          ? `${merra2Stats ? `${formatNum(merra2Stats.mean, 1)} mm` : '—'} · ${
              imergStats ? `${formatNum(imergStats.mean, 1)} mm` : '—'
            }`
          : 'Unavailable',
      subtitle: 'MERRA-2 · GPM IMERG (never averaged)',
      icon: Droplet,
      iconColor: 'text-sky-600',
    },
    {
      tab: 'Soil Moisture',
      sourceKey: 'smap',
      title: 'Soil Moisture',
      value:
        smapStats?.surfaceMin !== null && smapStats?.surfaceMax !== null && smapStats
          ? `${smapStats.surfaceMin.toFixed(2)}–${smapStats.surfaceMax.toFixed(2)} m³/m³`
          : 'Unavailable',
      subtitle: `SMAP surface 0–5 cm${
        smapStats?.rootMin !== null && smapStats?.rootMax !== null && smapStats
          ? ` (root ${smapStats.rootMin.toFixed(2)}–${smapStats.rootMax.toFixed(2)})`
          : ''
      }`,
      icon: Leaf,
      iconColor: 'text-[#116b37]',
    },
    {
      tab: 'NDVI',
      sourceKey: 'modis',
      title: 'Vegetation (NDVI)',
      value:
        modisStats?.mean !== null && modisStats?.mean !== undefined
          ? `${modisStats.mean.toFixed(2)} (${modisStats.totalUsable} obs)`
          : 'Unavailable',
      subtitle: `${methodology?.modis_season || 'Nov–Jun'} usable · Jul–Sep cloud gap`,
      icon: Sprout,
      iconColor: 'text-[#116b37]',
    },
    {
      tab: 'Soil Properties',
      sourceKey: 'soilgrids',
      title: 'Soil Properties',
      value: `pH ${getSoilVal('phh2o', '0-5cm')} · SOC ${getSoilVal('soc', '0-5cm')}`,
      subtitle: `Sand ${getSoilVal('sand', '0-5cm')} / Clay ${getSoilVal('clay', '0-5cm')} (0–5 cm)`,
      icon: Waves,
      iconColor: 'text-amber-700',
    },
    {
      tab: 'Elevation',
      sourceKey: 'srtm',
      title: 'Elevation & Terrain',
      value:
        srtmStats?.centerElevation !== null && srtmStats?.centerElevation !== undefined
          ? `${srtmStats.centerElevation} m`
          : 'Unavailable',
      subtitle:
        srtmStats?.min !== null && srtmStats?.max !== null && srtmStats
          ? `3×3: ${srtmStats.min}–${srtmStats.max} m · Slope not inferred`
          : 'SRTM 30 m (EGM96)',
      icon: Mountain,
      iconColor: 'text-[#ea7b15]',
    },
  ];

  const dataSourcesRows = [
    {
      key: 'power',
      tab: 'Rainfall' as EvidenceTab,
      name: 'NASA POWER & GPM IMERG',
      category: `Weather & dry spells (${methodology?.rainfall_window || 'Jun–Oct'})`,
      details: (
        <div className="space-y-1.5 text-[11px] text-gray-600 leading-relaxed">
          <p>
            <strong>Separate Datasets:</strong> MERRA-2 (~50 km reanalysis) and GPM IMERG (~10 km satellite) are displayed side-by-side and never averaged. MERRA-2 records &ge;1 mm on ~90% of Jul–Sep days and cannot resolve dry spells, so dry-spell counts come from GPM IMERG only (1 mm threshold, unverified).
          </p>
          <p>
            <strong>2026 GPM IMERG Partial Year:</strong> 2026 IMERG has 47 trailing missing days (2026-09-15 to 2026-10-31, including 16 days in Jul–Sep) and is excluded from the {refPeriod?.start_year}–{refPeriod?.end_year} mean; missing totals stay <code className="bg-gray-100 px-1 rounded">null</code>.
          </p>
        </div>
      ),
    },
    {
      key: 'modis',
      tab: 'NDVI' as EvidenceTab,
      name: 'MODIS (NDVI)',
      category: `Vegetation index (${methodology?.modis_season || 'Nov–Jun'})`,
      details: (
        <p className="text-[11px] text-gray-600 leading-relaxed">
          MOD13Q1 V6.1 (250 m, ~6.25 ha/pixel) filtered to usable quality (reliability 0 Good, 1 Marginal). July–September rainy-season months are excluded due to monsoon cloud cover and never interpolated. Reflects landscape greenness rather than direct crop health.
        </p>
      ),
    },
    {
      key: 'smap',
      tab: 'Soil Moisture' as EvidenceTab,
      name: 'SMAP',
      category: `Soil moisture (~9 km, ${smapStats?.distanceKm ?? '—'} km offset)`,
      details: (
        <p className="text-[11px] text-gray-600 leading-relaxed">
          NASA SMAP L4_SM V8.1 (~9 km EASE-Grid 2.0) provides mid-month surface (0–5 cm) and root-zone (0–100 cm) snapshots for July–October, not monthly averages or field-level probe measurements.
        </p>
      ),
    },
    {
      key: 'soilgrids',
      tab: 'Soil Properties' as EvidenceTab,
      name: 'Global Soil Maps & SRTM',
      category: 'ISRIC SoilGrids (250 m) & SRTM 30 m elevation',
      details: (
        <p className="text-[11px] text-gray-600 leading-relaxed">
          SoilGrids 2.0 (Q0.5 median, 4 depths 0–60 cm) provides statistical predictions rather than lab tests; silt fraction was not extracted (<code className="bg-gray-100 px-1 rounded">{methodology?.soil_texture || 'not_inferred_without_silt'}</code>). SRTM slope is <code className="bg-gray-100 px-1 rounded">{methodology?.slope || 'not_inferred'}</code>.
        </p>
      ),
    },
  ];

  const showCharts = viewMode === 'charts' || viewMode === 'both';
  const showTables = viewMode === 'tables' || viewMode === 'both';

  return (
    <div className="space-y-6">
      {/* Fallback Distinction Notice */}
      {fieldDataSource === 'fallback' && (
        <AlertBanner type="warning" title="Fallback Field Metadata Active">
          Live field metadata could not be reached, so static fallback metadata is shown alongside cached evidence. Fallback entries are demonstration placeholders and are distinct from measured observations.
        </AlertBanner>
      )}

      {/* Top Filter Row matching reference design: Year dropdown (left) & View dropdown (right) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter observation period"
              className="appearance-none px-4 py-2 pr-9 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#116b37] cursor-pointer"
            >
              <option value="all">
                Last {powerAnnual.length || 10} years ({refPeriod ? `${refPeriod.start_year}–${refPeriod.end_year}` : 'All'})
              </option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr} Season
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {evidenceData?.location && (
            <span className="text-[11px] text-gray-500">
              {evidenceData.location.name} · {evidenceData.location.latitude.toFixed(4)}° N,{' '}
              {evidenceData.location.longitude.toFixed(4)}° E
            </span>
          )}
        </div>

        <div className="relative">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            aria-label="Select data view mode"
            className="appearance-none px-4 py-2 pr-9 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#116b37] cursor-pointer"
          >
            <option value="charts">View: Charts</option>
            <option value="tables">View: Tables</option>
            <option value="both">View: Charts &amp; Tables</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Main Two-Column Reference Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (4/12): 5 Compact Indicator Cards */}
        <div className="lg:col-span-4 space-y-3.5">
          {indicatorCards.map((card) => {
            const Icon = card.icon;
            const isActive = activeTab === card.tab;
            return (
              <div
                key={card.tab}
                onClick={() => setActiveTab(card.tab)}
                className={`bg-white rounded-2xl border p-4 cursor-pointer transition flex items-center justify-between gap-3 ${
                  isActive
                    ? 'border-[#116b37] ring-1 ring-[#116b37]/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="pt-0.5 shrink-0">
                    <Icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{card.value}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">{card.subtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSourceInfo(card.sourceKey, card.tab);
                  }}
                  title={`Inspect ${card.title} source details & limitations`}
                  aria-label={`Inspect ${card.title} source details`}
                  className="p-1 text-sky-600 hover:text-sky-800 rounded-full hover:bg-sky-50 transition shrink-0 cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN (8/12): Top Chart/Table Card + Bottom Data Sources & Details Card */}
        <div className="lg:col-span-8 space-y-5">
          {/* TOP RIGHT CARD: Seasonal Trend / Dataset Detail Viewer */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  {activeTab === 'Rainfall' && 'Seasonal Rainfall & Dry Spells (MERRA-2 vs GPM IMERG)'}
                  {activeTab === 'NDVI' && 'Landscape Vegetation Cover (MODIS NDVI, Nov–Jun)'}
                  {activeTab === 'Soil Moisture' && 'Regional Soil Moisture Snapshots (NASA SMAP)'}
                  {activeTab === 'Soil Properties' && 'Modelled Soil Depth Profile (ISRIC SoilGrids)'}
                  {activeTab === 'Elevation' && 'Elevation Neighbourhood (NASA SRTM 30 m)'}
                </h2>
                <span className="text-[11px] text-gray-500">
                  {activeTab === 'Rainfall' &&
                    `${refPeriod ? `${refPeriod.start_year}–${refPeriod.end_year}` : ''} · ${
                      methodology?.rainfall_window || 'June–October'
                    }`}
                  {activeTab === 'NDVI' && 'MOD13Q1 V6.1 · 250 m'}
                  {activeTab === 'Soil Moisture' && 'SMAP L4_SM V8.1 · ~9 km'}
                  {activeTab === 'Soil Properties' && 'Q0.5 median · 0–60 cm'}
                  {activeTab === 'Elevation' && '3×3 pixel grid · EGM96'}
                </span>
              </div>

              {/* Pill Tab Bar matching reference screenshot */}
              <div className="flex flex-wrap items-center gap-2">
                {(['Rainfall', 'NDVI', 'Soil Moisture', 'Soil Properties', 'Elevation'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                      activeTab === tab
                        ? 'bg-[#116b37] text-white border-[#116b37]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* SINGLE UNIFIED INTERACTIVE LINE CHART (Rainfall | NDVI | Soil Moisture) */}
            {showCharts && activeChartDataset && (
              <InteractiveEnvironmentalChart
                dataset={activeChartDataset}
                emptyMessage={
                  activeTab === 'Rainfall'
                    ? 'No annual rainfall records returned by backend.'
                    : activeTab === 'NDVI'
                    ? 'No usable MODIS NDVI observations for this selection.'
                    : 'No SMAP soil moisture snapshots available for this selection.'
                }
              />
            )}

            {/* TAB 1 DETAILS & TABLE: RAINFALL */}
            {activeTab === 'Rainfall' && (
              <div className="space-y-4">
                {showTables && (
                  <div className="overflow-x-auto border-t border-gray-100 pt-3">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600 font-semibold bg-gray-50">
                          <th className="py-2.5 px-3">Year</th>
                          <th className="py-2.5 px-3">MERRA-2 Rain</th>
                          <th className="py-2.5 px-3">IMERG Rain</th>
                          <th className="py-2.5 px-3">IMERG Max Dry Spell</th>
                          <th className="py-2.5 px-3">Spells &ge;7d</th>
                          <th className="py-2.5 px-3">Missing Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayPower.map((row) => (
                          <tr key={row.year} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-semibold text-gray-900">{row.year}</td>
                            <td className="py-2 px-3 text-gray-800">
                              {row.merra2.rain_total_mm !== null ? `${row.merra2.rain_total_mm} mm` : 'Unavailable'}
                            </td>
                            <td className="py-2 px-3 text-gray-800">
                              {row.imerg.rain_total_mm !== null ? `${row.imerg.rain_total_mm} mm` : 'Unavailable'}
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {row.imerg.longest_dry_spell_days !== null
                                ? `${row.imerg.longest_dry_spell_days} days`
                                : 'Unavailable'}
                            </td>
                            <td className="py-2 px-3 font-medium text-gray-900">
                              {row.imerg.dry_spells_ge7_days !== null ? row.imerg.dry_spells_ge7_days : 'Unavailable'}
                            </td>
                            <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                              M:{row.merra2.rain_missing_days} / I:{row.imerg.rain_missing_days}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[11px] text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ea7b15] shrink-0 mt-0.5" />
                  <span>
                    <strong>2026 GPM IMERG Disclosure:</strong> 2026 GPM IMERG has 47 trailing missing days (2026-09-15 to 2026-10-31, 16 in Jul–Sep) and is excluded from the {refPeriod?.start_year}–{refPeriod?.end_year} mean (<code className="bg-amber-100 px-1 rounded">null</code>, never zero).
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2 DETAILS & TABLE: MODIS NDVI */}
            {activeTab === 'NDVI' && (
              <div className="space-y-4">
                {modisStats ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <span className="text-[10px] text-gray-500 font-semibold block">Usable Nov–Jun Obs</span>
                        <span className="text-base font-bold text-gray-900">{modisStats.totalUsable}</span>
                        <span className="text-[10px] text-gray-500 block">
                          {modisStats.goodCount} Good · {modisStats.marginalCount} Marginal
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <span className="text-[10px] text-gray-500 font-semibold block">Mean Usable NDVI</span>
                        <span className="text-base font-bold text-[#116b37]">
                          {modisStats.mean !== null ? modisStats.mean.toFixed(3) : 'Unavailable'}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <span className="text-[10px] text-gray-500 font-semibold block">Minimum NDVI</span>
                        <span className="text-base font-bold text-gray-900">
                          {modisStats.min !== null ? modisStats.min.toFixed(3) : 'Unavailable'}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <span className="text-[10px] text-gray-500 font-semibold block">Maximum NDVI</span>
                        <span className="text-base font-bold text-[#116b37]">
                          {modisStats.max !== null ? modisStats.max.toFixed(3) : 'Unavailable'}
                        </span>
                      </div>
                    </div>

                    {showTables && (
                      <div className="overflow-x-auto border-t border-gray-100 pt-3">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-600 font-semibold bg-gray-50">
                              <th className="py-2 px-3">Month</th>
                              <th className="py-2 px-3">Mean NDVI</th>
                              <th className="py-2 px-3">Usable Composites</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {modisStats.monthly.map((m) => (
                              <tr key={m.label}>
                                <td className="py-2 px-3 font-medium text-gray-900">{m.label}</td>
                                <td className="py-2 px-3 text-gray-700">
                                  {m.mean !== null ? m.mean.toFixed(3) : 'Cloud gap (excluded)'}
                                </td>
                                <td className="py-2 px-3 text-gray-600">{m.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  !showCharts && (
                    <p className="text-xs text-gray-500">No usable MODIS NDVI observations for this selection.</p>
                  )
                )}
              </div>
            )}

            {/* TAB 3 DETAILS & TABLE: SMAP SOIL MOISTURE */}
            {activeTab === 'Soil Moisture' && (
              <div className="space-y-4">
                {smapStats ? (
                  showTables ? (
                    <div className="overflow-x-auto border-t border-gray-100 pt-3">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-600 font-semibold bg-gray-50">
                            <th className="py-2.5 px-3">Snapshot</th>
                            <th className="py-2.5 px-3">Surface (0–5 cm)</th>
                            <th className="py-2.5 px-3">Root-zone (0–100 cm)</th>
                            <th className="py-2.5 px-3">Grid Distance</th>
                            <th className="py-2.5 px-3">Quality</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {smapStats.recentRows.map((snap, i) => (
                            <tr key={`${snap.year}-${snap.month}-${i}`} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                {snap.year} · {MONTH_NAMES[snap.month - 1]}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                {snap.surface_soil_moisture_m3_m3 !== null
                                  ? `${snap.surface_soil_moisture_m3_m3.toFixed(3)} m³/m³`
                                  : 'Unavailable'}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                {snap.rootzone_soil_moisture_m3_m3 !== null
                                  ? `${snap.rootzone_soil_moisture_m3_m3.toFixed(3)} m³/m³`
                                  : 'Unavailable'}
                              </td>
                              <td className="py-2 px-3 text-gray-500">{snap.distance_from_pilot_km} km</td>
                              <td className="py-2 px-3">
                                <Badge variant={snap.surface_quality === 'valid' ? 'green' : 'amber'} size="sm">
                                  {snap.surface_quality}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null
                ) : (
                  !showCharts && (
                    <p className="text-xs text-gray-500">No SMAP soil moisture snapshots available for this selection.</p>
                  )
                )}
              </div>
            )}

            {/* TAB 4: SOILGRIDS PROPERTIES */}
            {activeTab === 'Soil Properties' && (
              <div className="space-y-4">
                {soilGridsGrouped.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600 font-semibold bg-gray-50">
                          <th className="py-2.5 px-3">Property</th>
                          {SOIL_DEPTHS.map((d) => (
                            <th key={d} className="py-2.5 px-3">{d}</th>
                          ))}
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3">Quantile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {soilGridsGrouped.map((row) => (
                          <tr key={row.property} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{row.label}</td>
                            {SOIL_DEPTHS.map((d) => (
                              <td key={d} className="py-2.5 px-3 font-medium text-gray-800">
                                {row.byDepth[d] !== null && row.byDepth[d] !== undefined ? row.byDepth[d] : 'Unavailable'}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-gray-500 font-mono">{row.unit || '—'}</td>
                            <td className="py-2.5 px-3 text-gray-500 font-mono">{row.quantile}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/60">
                          <td className="py-2.5 px-3 font-semibold text-gray-600">Silt Fraction / USDA Texture</td>
                          <td colSpan={4} className="py-2.5 px-3 text-amber-800 font-medium">
                            Unavailable (silt fraction not extracted; full texture class withheld)
                          </td>
                          <td className="py-2.5 px-3 text-gray-400 font-mono">—</td>
                          <td className="py-2.5 px-3 text-gray-400 font-mono">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No SoilGrids records returned by backend.</p>
                )}
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <strong>Modelled Predictions (250 m, Q0.5):</strong> Not laboratory soil tests. Silt fraction was not extracted (<code className="bg-gray-100 px-1 rounded">{methodology?.soil_texture || 'not_inferred_without_silt'}</code>).
                </p>
              </div>
            )}

            {/* TAB 5: SRTM ELEVATION */}
            {activeTab === 'Elevation' && (
              <div className="space-y-4">
                {srtmStats ? (
                  <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center font-mono text-xs">
                    {srtmStats.ordered.map((sample, idx) => {
                      const isCenter = sample.row_offset === 0 && sample.column_offset === 0;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border ${
                            isCenter
                              ? 'bg-[#116b37] text-white border-[#116b37] font-bold'
                              : 'bg-white text-gray-800 border-gray-200'
                          }`}
                        >
                          <span className="text-[10px] block opacity-75">
                            {isCenter ? 'Pilot Pixel' : `(${sample.row_offset}, ${sample.column_offset})`}
                          </span>
                          <span className="text-sm font-bold">
                            {sample.elevation_m !== null ? `${sample.elevation_m} m` : 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No SRTM elevation samples returned by backend.</p>
                )}
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <strong>SRTM 30 m (EGM96):</strong> Shows the 3×3 pixel neighbourhood around the pilot coordinate. Slope is <code className="bg-gray-100 px-1 rounded">{methodology?.slope || 'not_inferred'}</code> because 1 m integer steps cannot confirm field micro-topography.
                </p>
              </div>
            )}
          </div>

          {/* BOTTOM RIGHT CARD: Data Sources & Details matching reference screenshot */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-gray-900">Data Sources &amp; Details</h2>
              {evidenceData?.handoff_generated && (
                <span className="text-[11px] font-mono text-gray-400">
                  Handoff {evidenceData.handoff_generated}
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {dataSourcesRows.map((row) => {
                const isExpanded = expandedSource === row.key;
                return (
                  <div key={row.key} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTab(row.tab)}
                        className="font-semibold text-gray-900 hover:text-[#116b37] text-left cursor-pointer"
                      >
                        {row.name}
                      </button>
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-gray-500 truncate">{row.category}</span>
                        <button
                          type="button"
                          onClick={() => toggleSourceInfo(row.key)}
                          title={`Toggle ${row.name} limitations & provenance`}
                          aria-label={`Toggle ${row.name} details`}
                          className="p-1 text-sky-600 hover:text-sky-800 rounded-full hover:bg-sky-50 transition shrink-0 cursor-pointer"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        {row.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {evaluationResult?.climate_evidence?.note && (
              <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                <strong>Engine Note:</strong> {evaluationResult.climate_evidence.note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation matching reference design */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={prevStep}
          className="px-5 py-2.5 bg-white hover:bg-gray-50 text-[#116b37] border border-gray-200 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={nextStep}
          className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] text-white rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <span>View Rotation Options</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
