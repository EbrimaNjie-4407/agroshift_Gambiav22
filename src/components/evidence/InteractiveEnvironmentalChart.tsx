import React, { useEffect, useMemo, useState } from 'react';

export type TimeSeriesMetric = 'Rainfall' | 'NDVI' | 'Soil Moisture';

export interface ChartSeriesPoint {
  value: number | null;
  meta?: string;
  highlightRing?: boolean;
}

export interface ChartSeriesConfig {
  id: string;
  label: string;
  color: string;
  unit: string;
  source: string;
  points: ChartSeriesPoint[];
}

export interface InteractiveChartDataset {
  metric: TimeSeriesMetric;
  subtitle: string;
  contextNote: string;
  xLabels: string[];
  xFullLabels?: string[];
  gapIndices?: number[];
  gapLabel?: string;
  yMin: number;
  yMax: number;
  yTicks: number[];
  yUnit: string;
  formatValue: (v: number) => string;
  series: ChartSeriesConfig[];
}

interface InteractiveEnvironmentalChartProps {
  dataset: InteractiveChartDataset;
  emptyMessage?: string;
}

const SVG_WIDTH = 640;
const SVG_HEIGHT = 248;
const MARGIN = { top: 22, right: 22, bottom: 38, left: 52 };
const PLOT_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

function buildLineSegments(coords: Array<{ x: number; y: number } | null>): string[] {
  const segments: string[] = [];
  let current: Array<{ x: number; y: number }> = [];

  for (const pt of coords) {
    if (pt !== null) {
      current.push(pt);
    } else {
      if (current.length >= 2) {
        segments.push(
          current.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
        );
      }
      current = [];
    }
  }

  if (current.length >= 2) {
    segments.push(
      current.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    );
  }

  return segments;
}

export const InteractiveEnvironmentalChart: React.FC<InteractiveEnvironmentalChartProps> = ({
  dataset,
  emptyMessage = 'No observations available for this selection.',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Reset hover state cleanly when switching dataset or time range
  useEffect(() => {
    setHoveredIdx(null);
  }, [dataset.metric, dataset.xLabels.length, dataset.subtitle]);

  const count = dataset.xLabels.length;

  const getX = (idx: number): number => {
    if (count <= 1) return MARGIN.left + PLOT_WIDTH / 2;
    const padX = Math.min(26, PLOT_WIDTH / (count * 2));
    return MARGIN.left + padX + (idx / (count - 1)) * (PLOT_WIDTH - padX * 2);
  };

  const getY = (val: number): number => {
    const span = dataset.yMax - dataset.yMin || 1;
    const clamped = Math.max(dataset.yMin, Math.min(dataset.yMax, val));
    return MARGIN.top + PLOT_HEIGHT - ((clamped - dataset.yMin) / span) * PLOT_HEIGHT;
  };

  const mappedSeries = useMemo(() => {
    return dataset.series.map((s) => {
      const coords = s.points.map((pt, idx) => {
        if (pt.value === null || pt.value === undefined || Number.isNaN(pt.value)) {
          return null;
        }
        return {
          x: getX(idx),
          y: getY(pt.value),
          value: pt.value,
          meta: pt.meta,
          highlightRing: pt.highlightRing,
          idx,
        };
      });
      const segments = buildLineSegments(coords);
      return { ...s, coords, segments };
    });
  }, [dataset]);

  const hasAnyPoint = mappedSeries.some((s) => s.coords.some((c) => c !== null));

  // Compute contiguous gap ranges (e.g., Jul–Sep MODIS cloud cover) for clean subtle shading
  const gapBands = useMemo(() => {
    const indices = dataset.gapIndices || [];
    if (!indices.length || count === 0) return [];
    const sorted = [...indices].sort((a, b) => a - b);
    const runs: Array<{ start: number; end: number }> = [];
    for (const idx of sorted) {
      const last = runs[runs.length - 1];
      if (last && idx === last.end + 1) {
        last.end = idx;
      } else {
        runs.push({ start: idx, end: idx });
      }
    }
    const step = count > 1 ? (PLOT_WIDTH - Math.min(26, PLOT_WIDTH / (count * 2)) * 2) / (count - 1) : 48;
    return runs.map((r) => {
      const xStart = getX(r.start) - step * 0.44;
      const xEnd = getX(r.end) + step * 0.44;
      return {
        x: Math.max(MARGIN.left, xStart),
        width: Math.min(MARGIN.left + PLOT_WIDTH, xEnd) - Math.max(MARGIN.left, xStart),
      };
    });
  }, [dataset.gapIndices, count]);

  const hitBandWidth = useMemo(() => {
    if (count <= 1) return PLOT_WIDTH * 0.5;
    return Math.max(24, PLOT_WIDTH / count);
  }, [count]);

  const activeXLabel =
    hoveredIdx !== null
      ? dataset.xFullLabels?.[hoveredIdx] || dataset.xLabels[hoveredIdx]
      : null;

  const isHoveredGap = hoveredIdx !== null && (dataset.gapIndices || []).includes(hoveredIdx);

  return (
    <div className="space-y-3">
      {/* Compact Header & Series Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-gray-600 font-medium">{dataset.subtitle}</span>
        <div className="flex flex-wrap items-center gap-4">
          {dataset.series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-gray-700 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-300"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Unified Chart Canvas */}
      {hasAnyPoint ? (
        <div className="relative select-none" onMouseLeave={() => setHoveredIdx(null)}>
          {/* Floating Interactive Hover Tooltip */}
          {hoveredIdx !== null && activeXLabel && (
            <div
              className="pointer-events-none absolute z-20 top-1 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl shadow-sm px-3 py-2 text-[11px] min-w-[185px] max-w-[260px] transition-all duration-150"
              style={{
                left: `${Math.min(
                  72,
                  Math.max(4, ((getX(hoveredIdx) / SVG_WIDTH) * 100) - 12)
                )}%`,
              }}
            >
              <div className="font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-1.5 flex items-center justify-between gap-2">
                <span>{activeXLabel}</span>
                <span className="text-[10px] font-normal text-gray-400">{dataset.yUnit}</span>
              </div>

              {isHoveredGap ? (
                <p className="text-gray-500 leading-snug">
                  {dataset.gapLabel || 'Cloud cover gap — excluded and not interpolated.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {mappedSeries.map((s) => {
                    const pt = s.coords[hoveredIdx];
                    return (
                      <div key={s.id} className="space-y-0.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.label}
                          </span>
                          <span className="font-semibold text-gray-900 tabular-nums">
                            {pt ? `${dataset.formatValue(pt.value)} ${s.unit}` : 'Unavailable'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 pl-3.5">
                          <span className="truncate">{s.source}</span>
                          {pt?.meta && <span className="text-amber-700 font-medium shrink-0">{pt.meta}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label={`${dataset.metric} interactive line chart`}
          >
            {/* Horizontal Grid Lines & Y-Axis Ticks */}
            {dataset.yTicks.map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick} className="transition-opacity duration-200">
                  <line
                    x1={MARGIN.left}
                    y1={y}
                    x2={SVG_WIDTH - MARGIN.right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                  />
                  <text
                    x={MARGIN.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="#6b7280"
                    className="tabular-nums"
                  >
                    {dataset.formatValue(tick)}
                  </text>
                </g>
              );
            })}

            {/* Y-axis unit label */}
            <text
              x={MARGIN.left - 8}
              y={12}
              textAnchor="end"
              fontSize="9.5"
              fontWeight={600}
              fill="#9ca3af"
            >
              {dataset.yUnit}
            </text>

            {/* Baseline X-axis */}
            <line
              x1={MARGIN.left}
              y1={MARGIN.top + PLOT_HEIGHT}
              x2={SVG_WIDTH - MARGIN.right}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {/* Missing / Cloud-Cover Gap Band (e.g. MODIS Jul–Sep) */}
            {gapBands.map((band, idx) => (
              <g key={`gap-${idx}`}>
                <rect
                  x={band.x}
                  y={MARGIN.top}
                  width={band.width}
                  height={PLOT_HEIGHT}
                  rx={6}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                {dataset.gapLabel && (
                  <text
                    x={band.x + band.width / 2}
                    y={MARGIN.top + PLOT_HEIGHT / 2}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight={500}
                    fill="#64748b"
                  >
                    {dataset.gapLabel}
                  </text>
                )}
              </g>
            ))}

            {/* Active Hover Vertical Guide Line */}
            {hoveredIdx !== null && (
              <line
                x1={getX(hoveredIdx)}
                y1={MARGIN.top}
                x2={getX(hoveredIdx)}
                y2={MARGIN.top + PLOT_HEIGHT}
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {/* Animated Dataset Series Layer */}
            <g key={dataset.metric} className="agroshift-chart-enter">
              {mappedSeries.map((s) => (
                <g key={s.id}>
                  {/* Thin Connecting Line Segments (breaks cleanly across nulls) */}
                  {s.segments.map((d, segIdx) => (
                    <path
                      key={`${s.id}-seg-${segIdx}`}
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300 ease-out"
                    />
                  ))}

                  {/* Circular Data Points */}
                  {s.coords.map((pt) => {
                    if (!pt) return null;
                    const isHovered = hoveredIdx === pt.idx;
                    return (
                      <g key={`${s.id}-pt-${pt.idx}`}>
                        {pt.highlightRing && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 8.5 : 6.5}
                            fill="none"
                            stroke="#b45309"
                            strokeWidth={1.25}
                            strokeOpacity={0.75}
                            className="transition-all duration-150"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 5.5 : 3.75}
                          fill={s.color}
                          stroke="#ffffff"
                          strokeWidth={1.75}
                          className="transition-all duration-150 ease-out"
                        />
                      </g>
                    );
                  })}
                </g>
              ))}
            </g>

            {/* X-Axis Labels */}
            {dataset.xLabels.map((lbl, idx) => {
              const x = getX(idx);
              const isHovered = hoveredIdx === idx;
              const isGap = (dataset.gapIndices || []).includes(idx);
              return (
                <text
                  key={`${lbl}-${idx}`}
                  x={x}
                  y={SVG_HEIGHT - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered ? 600 : 500}
                  fill={isHovered ? '#111827' : isGap ? '#94a3b8' : '#6b7280'}
                  className="transition-colors duration-150"
                >
                  {lbl}
                </text>
              );
            })}

            {/* Full-Column Hover & Keyboard Hit Targets */}
            {dataset.xLabels.map((lbl, idx) => {
              const cx = getX(idx);
              return (
                <rect
                  key={`hit-${lbl}-${idx}`}
                  x={cx - hitBandWidth / 2}
                  y={MARGIN.top}
                  width={hitBandWidth}
                  height={PLOT_HEIGHT + 24}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect ${dataset.xFullLabels?.[idx] || lbl} values`}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
          {emptyMessage}
        </div>
      )}

      {/* Concise Context & Provenance Note */}
      <p className="text-[11px] text-gray-500 leading-relaxed">{dataset.contextNote}</p>
    </div>
  );
};
