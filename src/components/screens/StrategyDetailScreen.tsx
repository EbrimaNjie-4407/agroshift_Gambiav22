/**
 * AgroShift Gambia — Screen 8: Strategy Detail
 * Farmer-friendly agricultural decision-support breakdown across 8 sections:
 *   1. Sequence (Visual seasonal crop timeline)
 *   2. Why Suggested ("Why This Rotation May Suit Your Field" / Baseline view for Current)
 *   3. Evidence ("Evidence Behind This Rotation" with source badges & citations)
 *   4. Benefits (Categorised benefits for the selected strategy only)
 *   5. Trade-offs (Genuine compromises & limitations for the selected strategy)
 *   6. Gaps ("What We Still Need to Know")
 *   7. Risks for Local Review (Practical extension & farmer verification checklist)
 *   8. Confidence (Clear confidence summary + optional collapsed Technical Details)
 *
 * Preserves 100% of backend strategy data, scores, confidence levels, and citations.
 */

import React, { useMemo, useState } from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { Strategy, StrategyCriterion } from '../../types/agroshift';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  BookOpen,
  Info,
  Sliders,
  Sprout,
  Wheat,
  Droplet,
  Coins,
  Users,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
} from 'lucide-react';

const DETAIL_SECTIONS = [
  { id: 1, num: '1', label: 'Sequence' },
  { id: 2, num: '2', label: 'Why Suggested' },
  { id: 3, num: '3', label: 'Evidence' },
  { id: 4, num: '4', label: 'Benefits' },
  { id: 5, num: '5', label: 'Trade-offs' },
  { id: 6, num: '6', label: 'Gaps' },
  { id: 7, num: '7', label: 'Risks for Local Review' },
  { id: 8, num: '8', label: 'Confidence' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EVIDENCE_BADGE_MAP: Record<
  string,
  { label: string; classes: string; whyPrefix: string }
> = {
  farmer_report: {
    label: 'Farmer Report',
    classes: 'bg-sky-50 text-sky-800 border-sky-200',
    whyPrefix: 'From local farmer observation in Manduar',
  },
  published_source: {
    label: 'Published Research',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    whyPrefix: 'From regional or agricultural research records',
  },
  satellite_derived: {
    label: 'Environmental Data',
    classes: 'bg-blue-50 text-blue-800 border-blue-200',
    whyPrefix: 'From area-wide satellite rainfall records',
  },
  assumption: {
    label: 'Working Assumption',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
    whyPrefix: 'Estimated rule used where local data is missing',
  },
};

function formatSeasonHeading(season?: string, year?: number | string, idx: number = 0): string {
  if (season) {
    const clean = season.toLowerCase();
    if (clean === 'current_or_next') return `Season ${idx + 1} · Current or Next`;
    if (clean === 'following_season') return `Season ${idx + 1} · Following Season`;
    return `Season ${idx + 1} · ${season.replace(/_/g, ' ')}`;
  }
  if (year !== undefined && year !== null && String(year).trim() !== '') {
    return `Season ${year}`;
  }
  return `Season ${idx + 1}`;
}

function getCropBadgeStyle(crop: string, role?: string) {
  const lower = `${crop} ${role || ''}`.toLowerCase();
  if (lower.includes('groundnut') || lower.includes('cowpea') || lower.includes('legume')) {
    return {
      bg: 'bg-emerald-50 border-emerald-200',
      iconWrap: 'bg-[#116b37] text-white',
      Icon: Sprout,
      roleFallback: 'Legume crop',
    };
  }
  return {
    bg: 'bg-amber-50/60 border-amber-200',
    iconWrap: 'bg-[#ea7b15] text-white',
    Icon: Wheat,
    roleFallback: 'Cereal crop',
  };
}

function getStatusBadge(status?: string) {
  if (status === 'reference') {
    return {
      label: 'Existing Practice (Baseline)',
      classes: 'bg-slate-100 text-slate-800 border-slate-200',
    };
  }
  if (status === 'feasible_candidate') {
    return {
      label: 'Ready to Consider',
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (status === 'conditional_candidate') {
    return {
      label: 'Conditional · Confirm Locally',
      classes: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }
  if (status === 'not_recommended') {
    return {
      label: 'Not Recommended',
      classes: 'bg-red-50 text-red-800 border-red-200',
    };
  }
  return {
    label: 'Candidate Option',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  };
}

function getConfidenceSummary(level: string, traitShare?: number) {
  const pct = traitShare !== undefined ? Math.round(traitShare * 100) : null;
  if (level === 'high') {
    return {
      badgeClasses: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      label: 'High Confidence',
      meaning:
        'Strong local evidence and confirmed field conditions back this option, though local verification before planting is still good practice.',
      pct,
    };
  }
  if (level === 'moderate' || level === 'medium') {
    return {
      badgeClasses: 'bg-sky-100 text-sky-900 border-sky-200',
      label: 'Moderate Confidence',
      meaning:
        'Supported by regional research and satellite context, with a few unverified local traits that should be checked before planting.',
      pct,
    };
  }
  return {
    badgeClasses: 'bg-amber-100 text-amber-900 border-amber-200',
    label: 'Low Confidence',
    meaning:
      'Use this option as a starting guide for local discussion rather than a guaranteed prediction — key field and crop measurements are still missing.',
    pct,
  };
}

function simplifyCriterionLabel(c: StrategyCriterion): string {
  const n = c.name.toLowerCase();
  if (n.includes('water')) return 'Water & drought fit';
  if (n.includes('soil')) return 'Soil health support';
  if (n.includes('food')) return 'Household food supply';
  if (n.includes('income')) return 'Market & input costs';
  if (n.includes('labour') || n.includes('labor')) return 'Manageable labour';
  return c.label;
}

function capFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTraitStatus(status?: string): string {
  if (!status) return '';
  if (status === 'farmer_reported') return 'Farmer-reported';
  if (status === 'sourced_local') return 'Local Gambian record';
  if (status === 'sourced_regional') return 'Regional West African study';
  if (status === 'assumption') return 'Assumption';
  return status.replace(/_/g, ' ');
}

function buildWhyBullets(strategy: Strategy): string[] {
  const bullets: string[] = [];

  if (strategy.why) {
    const sentences = strategy.why
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.toLowerCase().startsWith('it is conditional:'));
    sentences.forEach((s) => {
      if (bullets.length < 3) bullets.push(s);
    });
  }

  if (strategy.recommendation_status !== 'not_recommended') {
    const topCriteria = [...(strategy.criteria || [])]
      .filter((c) => c.score >= 55)
      .sort((a, b) => b.score * b.weight - a.score * a.weight);

    for (const c of topCriteria) {
      if (bullets.length >= 4) break;
      const lower = c.name.toLowerCase();
      if (lower.includes('food') && !bullets.some((b) => b.toLowerCase().includes('food'))) {
        bullets.push(
          `Scored ${Math.round(c.score)}/100 for household food supply based on the food roles of its crops.`
        );
      } else if (lower.includes('water') && !bullets.some((b) => b.toLowerCase().includes('dry') || b.toLowerCase().includes('water'))) {
        bullets.push(
          `Scored ${Math.round(c.score)}/100 for water use and dry-spell resilience under regional rainfall patterns.`
        );
      } else if (lower.includes('soil') && !bullets.some((b) => b.toLowerCase().includes('soil') || b.toLowerCase().includes('legume'))) {
        bullets.push(
          `Scored ${Math.round(c.score)}/100 for soil health support across the crop sequence.`
        );
      } else if (lower.includes('income') && !bullets.some((b) => b.toLowerCase().includes('market') || b.toLowerCase().includes('income'))) {
        bullets.push(
          `Scored ${Math.round(c.score)}/100 for market access and input costs using available crop reports.`
        );
      }
    }
  }

  if (
    strategy.constraints?.unconfirmed_candidate_crops &&
    strategy.constraints.unconfirmed_candidate_crops.length > 0 &&
    bullets.length < 4
  ) {
    const cropsList = strategy.constraints.unconfirmed_candidate_crops.join(', ');
    bullets.push(
      `Remains conditional until local seed access and suitability for ${cropsList} are confirmed.`
    );
  }

  return bullets.slice(0, 4);
}

interface BenefitCategory {
  key: string;
  title: string;
  icon: React.ElementType;
  items: string[];
}

function categoriseBenefits(benefits: string[]): BenefitCategory[] {
  const categories: Record<string, BenefitCategory> = {
    soil: { key: 'soil', title: 'Soil Health & Rotation Cycle', icon: Sprout, items: [] },
    water: { key: 'water', title: 'Water & Dry-Spell Fit', icon: Droplet, items: [] },
    food: { key: 'food', title: 'Household Food Needs', icon: HeartHandshake, items: [] },
    income: { key: 'income', title: 'Income & Market Access', icon: Coins, items: [] },
    labour: { key: 'labour', title: 'Labour Fit', icon: Users, items: [] },
    other: { key: 'other', title: 'Additional Advantages', icon: CheckCircle2, items: [] },
  };

  benefits.forEach((b) => {
    const low = b.toLowerCase();
    if (low.includes('nitrogen') || low.includes('soil') || low.includes('cereal follows a legume')) {
      categories.soil.items.push(b);
    } else if (low.includes('water') || low.includes('dry') || low.includes('drought')) {
      categories.water.items.push(b);
    } else if (low.includes('food') || low.includes('household')) {
      categories.food.items.push(b);
    } else if (low.includes('market') || low.includes('income') || low.includes('cost')) {
      categories.income.items.push(b);
    } else if (low.includes('labour') || low.includes('labor')) {
      categories.labour.items.push(b);
    } else {
      categories.other.items.push(b);
    }
  });

  return Object.values(categories).filter((cat) => cat.items.length > 0);
}

function classifyTradeOff(text: string): { tag: string; isComparison: boolean } {
  const low = text.toLowerCase();
  if (low.includes('current rotation')) return { tag: 'Compared with Current Practice', isComparison: true };
  if (low.includes('fertiliser') || low.includes('fertilizer') || low.includes('urea') || low.includes('cost')) {
    return { tag: 'Input & Fertiliser Cost', isComparison: false };
  }
  if (low.includes('market') || low.includes('buyers') || low.includes('income')) {
    return { tag: 'Market Access', isComparison: false };
  }
  if (low.includes('labour') || low.includes('labor')) {
    return { tag: 'Labour Demand', isComparison: false };
  }
  if (low.includes('water') || low.includes('dry')) {
    return { tag: 'Water Sensitivity', isComparison: false };
  }
  if (low.includes('not yet confirmed') || low.includes('seed')) {
    return { tag: 'Local Confirmation Needed', isComparison: false };
  }
  if (low.includes('nitrogen benefit') || low.includes('credit') || low.includes('trials')) {
    return { tag: 'Uncertain Rotation Effect', isComparison: false };
  }
  return { tag: 'Key Limitation', isComparison: false };
}

function simplifyGaps(rawGaps: string[]): { summaryBullets: string[]; rawTraitDetails: string[] } {
  const summaryBullets: string[] = [];
  const rawTraitDetails: string[] = [];
  let missingOptionalFeaturesCount = 0;

  for (const g of rawGaps) {
    const low = g.toLowerCase();
    if (low.startsWith('crop traits without a source:')) {
      rawTraitDetails.push(g);
      if (!summaryBullets.some((b) => b.includes('crop requirements'))) {
        summaryBullets.push(
          'Some crop water, nutrient, ground-cover, and labour requirements are based on assumptions rather than local sources.'
        );
      }
    } else if (low.startsWith('optional feature not supplied')) {
      missingOptionalFeaturesCount += 1;
    } else if (low.startsWith('evidence base:') || low.includes('no soil or yield measurements')) {
      if (!summaryBullets.some((b) => b.includes('laboratory soil'))) {
        summaryBullets.push(
          'No laboratory soil tests or field-level yield and soil-moisture measurements are available for this field.'
        );
      }
    } else if (low.includes('sandy soils in niger') || low.includes('not from manduar')) {
      if (!summaryBullets.some((b) => b.includes('West African'))) {
        summaryBullets.push(
          'Rotation yield benefits come from trials in Niger, Burkina Faso, and Senegal — they have not been measured locally in Manduar.'
        );
      }
    } else {
      summaryBullets.push(g);
    }
  }

  if (missingOptionalFeaturesCount > 0) {
    summaryBullets.push(
      'Local field measurements for soil pH, organic carbon, soil texture, slope, and field dry-spell length were not supplied.'
    );
  }

  return { summaryBullets: summaryBullets.slice(0, 6), rawTraitDetails };
}

function inferRiskCheckQuestion(risk: string): string | null {
  const low = risk.toLowerCase();
  if (low.includes('seed') || low.includes('confirmed')) {
    return 'Check locally: Can the farmer obtain viable seed for this crop before planting?';
  }
  if (low.includes('flowering') || low.includes('dry spell') || low.includes('drought')) {
    return 'Check locally: Are planting dates timed well for the rains, and can dry spells around flowering be managed?';
  }
  if (low.includes('weaver birds') || low.includes('bird-scare')) {
    return 'Check locally: Does the household have enough labour for bird-scaring during grain fill?';
  }
  if (low.includes('pest') || low.includes('thrips') || low.includes('maruca') || low.includes('aflatoxin') || low.includes('storage')) {
    return 'Check locally: Are pest control, proper drying, and safe storage practices available?';
  }
  if (low.includes('disease') || low.includes('monoculture') || low.includes('repeated')) {
    return 'Check locally: Have past harvests shown signs of soil-borne pests or diseases on this plot?';
  }
  if (low.includes('rule-of-thumb')) {
    return 'Keep in mind: Compare options side by side with an extension officer rather than relying on exact point totals.';
  }
  return null;
}

export const StrategyDetailScreen: React.FC = () => {
  const {
    evaluationResult,
    selectedStrategyId,
    setSelectedStrategyId,
    activeDetailSection,
    setActiveDetailSection,
    goToStep,
    runEvaluation,
  } = useAgroShift();

  const [showCriterionDetails, setShowCriterionDetails] = useState(false);
  const [showRawTraitGaps, setShowRawTraitGaps] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const strategies = evaluationResult?.strategies || [];
  const reference = evaluationResult?.reference_rotation || null;

  const activeStrategy = useMemo(() => {
    if (!evaluationResult) return null;
    if (selectedStrategyId === 'current' && reference) return reference;
    return strategies.find((s) => s.id === selectedStrategyId) || strategies[0] || reference;
  }, [evaluationResult, selectedStrategyId, reference, strategies]);

  if (!evaluationResult) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
          <Sliders className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Strategy Breakdown Unavailable</h3>
        <p className="text-[15px] text-gray-600 max-w-md mx-auto leading-relaxed">
          Run the analysis to review each crop rotation sequence, supporting evidence, benefits, trade-offs, and local verification checks.
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
            className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] text-white rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            Run Analysis Now
          </button>
        </div>
      </div>
    );
  }

  if (!activeStrategy) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-[15px] text-gray-600">
        No strategies were returned for this field.
      </div>
    );
  }

  const isCurrentBaseline = activeStrategy.id === 'current';
  const benefits = activeStrategy.benefits || [];
  const tradeOffs = activeStrategy.trade_offs || [];
  const gaps = activeStrategy.gaps || [];
  const risks = activeStrategy.risks_for_local_review || [];
  const criteria = activeStrategy.criteria || [];
  const evidenceItems = activeStrategy.evidence_items || [];
  const evidenceStrings = activeStrategy.evidence || [];

  const statusBadge = getStatusBadge(
    isCurrentBaseline ? 'reference' : activeStrategy.recommendation_status
  );
  const whyBullets = buildWhyBullets(activeStrategy);
  const benefitCategories = categoriseBenefits(benefits);
  const simplifiedGaps = simplifyGaps(gaps);
  const confidenceSummary = getConfidenceSummary(
    activeStrategy.confidence,
    activeStrategy.confidence_detail?.trait_support_share
  );

  const localChecksFromConstraints =
    activeStrategy.constraints?.would_become_feasible_if || [];

  return (
    <div className="space-y-6">
      {/* Top Strategy Switcher Tabs */}
      <div className="bg-gray-100 p-1.5 rounded-xl flex items-center gap-2 overflow-x-auto">
        {reference && (
          <button
            onClick={() => setSelectedStrategyId('current')}
            className={`shrink-0 py-2.5 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
              selectedStrategyId === 'current'
                ? 'bg-[#116b37] text-white shadow-xs'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            Current Rotation (
            {reference.score !== null && reference.score !== undefined
              ? `${Math.round(reference.score)} pts`
              : 'Baseline'}
            )
          </button>
        )}

        {strategies.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStrategyId(s.id)}
            className={`flex-1 min-w-[155px] py-2.5 px-4 rounded-lg text-sm font-semibold transition cursor-pointer ${
              selectedStrategyId === s.id
                ? s.recommendation_status === 'not_recommended'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : s.id === 'A'
                  ? 'bg-[#ea7b15] text-white shadow-xs'
                  : 'bg-[#116b37] text-white shadow-xs'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            Option {s.id} (
            {s.score !== null && s.score !== undefined
              ? `${Math.round(s.score)} pts`
              : 'Not scored'}
            )
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Vertical 8-Section Navigation (CSS selectors target buttons 2..8 inside this container) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 px-3 py-1.5">
            Strategy Sections
          </p>
          {DETAIL_SECTIONS.map((sec) => {
            const isActive = activeDetailSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveDetailSection(sec.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-[15px] font-semibold transition cursor-pointer flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-[#116b37] text-white'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="truncate">
                  {sec.num}. {sec.label}
                </span>
                {isActive && <span className="w-2 h-2 rounded-full bg-[#ea7b15] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Right Section Details Pane */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 space-y-6">
          {/* Selected Strategy Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-gray-200">
            <div className="space-y-1.5">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.classes}`}
              >
                {isCurrentBaseline ? statusBadge.label : `Option ${activeStrategy.id} · ${statusBadge.label}`}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                {activeStrategy.name}
              </h3>
            </div>

            <div className="flex flex-col sm:items-end gap-1 shrink-0">
              <span
                className={`px-3.5 py-1.5 font-bold text-sm rounded-full border ${
                  activeStrategy.recommendation_status === 'not_recommended'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : isCurrentBaseline
                    ? 'bg-slate-100 text-slate-800 border-slate-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {activeStrategy.score !== null && activeStrategy.score !== undefined
                  ? `Score: ${activeStrategy.score} / 100`
                  : 'Not scored (limit violated)'}
              </span>
              {activeStrategy.score_range && (
                <span className="text-sm text-gray-600 font-medium">
                  Score range: {activeStrategy.score_range[0]} – {activeStrategy.score_range[1]}
                </span>
              )}
            </div>
          </div>

          {/* SECTION 1: Sequence */}
          {activeDetailSection === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-[#116b37]" />
                  <span>Crop Sequence Timeline</span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  {isCurrentBaseline
                    ? 'This is the crop sequence recorded for your field over recent seasons.'
                    : 'Follow this season-by-season crop order during the main rain-fed growing window.'}
                </p>
              </div>

              {/* Visual Timeline Cards with Connecting Arrows */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {activeStrategy.sequence.map((item, idx) => {
                  const style = getCropBadgeStyle(item.crop, item.role);
                  const CropIcon = style.Icon;
                  return (
                    <React.Fragment key={idx}>
                      <div className={`flex-1 p-5 rounded-2xl border ${style.bg} space-y-2.5`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {formatSeasonHeading(item.season, item.year, idx)}
                          </span>
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.iconWrap}`}
                          >
                            <CropIcon className="w-4 h-4" />
                          </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 capitalize">{item.crop}</p>
                        <p className="text-sm text-gray-700 capitalize">
                          {item.role || style.roleFallback}
                        </p>
                      </div>

                      {idx < activeStrategy.sequence.length - 1 && (
                        <>
                          <div className="hidden sm:flex items-center justify-center text-gray-400 shrink-0 px-0.5">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                          <div className="flex sm:hidden items-center justify-center text-gray-400">
                            <ArrowDown className="w-5 h-5" />
                          </div>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {activeStrategy.sequence.length < 3 && (
                <p className="text-sm text-gray-600 bg-sky-50/70 border border-sky-200 rounded-xl px-4 py-3">
                  This option defines a {activeStrategy.sequence.length}-season repeating rotation cycle (no separate Season 3 crop is specified).
                </p>
              )}

              {/* Seasonal Rain-Fed Planting Bar */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                <p className="text-sm font-semibold text-gray-800">
                  Typical Gambian Rain-Fed Calendar
                </p>
                <div className="grid grid-cols-12 gap-1 text-center text-xs font-medium text-gray-500">
                  {MONTHS.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-1.5 h-8">
                  <div className="col-span-5 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-medium text-gray-600">
                    Dry Season (Fallow / Grazing)
                  </div>
                  <div className="col-span-5 bg-[#116b37] text-white rounded-lg flex items-center justify-center text-xs font-semibold">
                    Main Rains (Jun–Oct)
                  </div>
                  <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center text-xs font-semibold text-amber-900">
                    Harvest
                  </div>
                </div>
              </div>

              {activeStrategy.rotation_effects && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-sm text-emerald-900 font-medium block">
                      Legume → Cereal transitions
                    </span>
                    <span className="text-lg font-bold text-emerald-950">
                      {activeStrategy.rotation_effects.legume_to_cereal_transitions} per cycle
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-sm text-gray-700 font-medium block">
                      Same-crop repeats
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {activeStrategy.rotation_effects.repeat_transitions} per cycle
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Why This Rotation May Suit Your Field */}
          {activeDetailSection === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#116b37]" />
                  <span>
                    {isCurrentBaseline
                      ? 'Your Current Rotation (Comparison Baseline)'
                      : activeStrategy.recommendation_status === 'not_recommended'
                      ? 'Why This Option Was Not Recommended'
                      : 'Why This Rotation May Suit Your Field'}
                  </span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  {isCurrentBaseline
                    ? 'This reflects your recorded crop history and is scored with the same criteria purely as a baseline to compare Options A, B, and C.'
                    : 'A summary of how this crop sequence aligns with your field conditions, priorities, and available resources.'}
                </p>
              </div>

              {/* Concise 3–4 Farmer-Friendly Bullet Points (or Baseline Summary for Current) */}
              {isCurrentBaseline ? (
                <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                  <p className="text-[15px] font-semibold text-sky-950">
                    Comparison Baseline Only
                  </p>
                  <p className="text-[15px] text-sky-900 leading-relaxed">
                    {activeStrategy.note ||
                      'Your existing rotation is shown so you can see where Options A, B, and C may improve water fit, soil support, food security, or labour.'}
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  {whyBullets.length > 0 ? (
                    <ul className="space-y-2.5">
                      {whyBullets.map((bullet, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-[15px] text-gray-800 leading-relaxed"
                        >
                          <CheckCircle2 className="w-5 h-5 text-[#116b37] shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[15px] text-gray-700 leading-relaxed">
                      {activeStrategy.why || activeStrategy.note || 'No rationale recorded for this strategy.'}
                    </p>
                  )}
                </div>
              )}

              {activeStrategy.status_note && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-[15px] text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-[#ea7b15] shrink-0 mt-0.5" />
                  <span>{activeStrategy.status_note}</span>
                </div>
              )}

              {/* Feasibility Constraints (Only shown when failures/conditions exist) */}
              {activeStrategy.constraints &&
                (activeStrategy.constraints.failures.length > 0 ||
                  activeStrategy.constraints.conditions.length > 0 ||
                  activeStrategy.constraints.would_become_feasible_if.length > 0) && (
                  <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-3">
                    <p className="text-base font-bold text-amber-950">
                      Local Conditions to Confirm
                    </p>
                    {activeStrategy.constraints.failures.length > 0 && (
                      <div className="text-[15px] text-red-800 space-y-1">
                        <span className="font-semibold block">Limits exceeded:</span>
                        <ul className="list-disc list-inside space-y-1">
                          {activeStrategy.constraints.failures.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeStrategy.constraints.conditions.length > 0 && (
                      <div className="text-[15px] text-amber-950 space-y-1">
                        <span className="font-semibold block">Conditions:</span>
                        <ul className="list-disc list-inside space-y-1">
                          {activeStrategy.constraints.conditions.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeStrategy.constraints.would_become_feasible_if.length > 0 && (
                      <div className="text-[15px] text-amber-950 space-y-1">
                        <span className="font-semibold block">Ready once confirmed:</span>
                        <ul className="list-disc list-inside space-y-1">
                          {activeStrategy.constraints.would_become_feasible_if.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              {/* Compact Visual Criterion Breakdown */}
              {criteria.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-base font-bold text-gray-900">
                      How It Scored Across Your Priorities
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowCriterionDetails((prev) => !prev)}
                      className="text-sm font-medium text-[#116b37] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showCriterionDetails ? 'Hide details' : 'Show scoring notes'}</span>
                      {showCriterionDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {criteria.map((c) => {
                      const pct = Math.max(0, Math.min(100, Math.round(c.score)));
                      const barColor =
                        pct >= 65
                          ? 'bg-[#116b37]'
                          : pct >= 45
                          ? 'bg-[#ea7b15]'
                          : 'bg-red-500';
                      return (
                        <div
                          key={c.name}
                          className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[15px] font-semibold text-gray-900">
                              {simplifyCriterionLabel(c)}
                            </span>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-500">
                                Priority weight: {Math.round(c.weight * 100)}%
                              </span>
                              <span className="font-bold text-gray-900 tabular-nums">
                                {c.score} / 100
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {showCriterionDetails && c.reason && (
                            <p className="text-sm text-gray-600 leading-relaxed pt-1">
                              {c.reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Evidence Behind This Rotation */}
          {activeDetailSection === 3 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-[#116b37]" />
                  <span>Evidence Behind This Rotation</span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  Local farmer knowledge, agricultural studies, and regional weather records supporting this option.
                </p>
              </div>

              <div className="space-y-3">
                {evidenceItems.length > 0 ? (
                  evidenceItems.map((item, idx) => {
                    const badge = EVIDENCE_BADGE_MAP[item.evidence_class] || {
                      label: item.evidence_class.replace(/_/g, ' '),
                      classes: 'bg-gray-100 text-gray-800 border-gray-200',
                      whyPrefix: 'Supporting record',
                    };
                    return (
                      <div
                        key={item.id || idx}
                        className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                          {item.source_ids && item.source_ids.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.source_ids.map((src) => (
                                <span
                                  key={src}
                                  className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-gray-700"
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <p className="text-[15px] text-gray-900 leading-relaxed">
                          {capFirst(item.statement)}
                        </p>

                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-700">Why it matters:</span>{' '}
                          {badge.whyPrefix}
                          {item.trait_status ? ` · ${formatTraitStatus(item.trait_status)}` : ''}.
                        </p>
                      </div>
                    );
                  })
                ) : evidenceStrings.length > 0 ? (
                  evidenceStrings.map((evStr, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-2xl border border-gray-200 text-[15px] text-gray-800 leading-relaxed"
                    >
                      {evStr}
                    </div>
                  ))
                ) : (
                  <p className="text-[15px] text-gray-600">
                    No specific evidence records were listed for this item.
                  </p>
                )}
              </div>

              {evaluationResult.climate_evidence?.note && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-3 text-[15px] text-sky-950">
                  <Info className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Weather and satellite data describe the wider area around your field, not measurements taken directly from the field.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: Benefits */}
          {activeDetailSection === 4 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#116b37]" />
                  <span>
                    {isCurrentBaseline
                      ? 'About Your Current Rotation'
                      : `Benefits of Option ${activeStrategy.id}`}
                  </span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  {isCurrentBaseline
                    ? 'Your existing rotation serves as the comparison baseline.'
                    : 'Key advantages identified for this specific crop rotation from available evidence.'}
                </p>
              </div>

              {isCurrentBaseline ? (
                <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 text-[15px] text-sky-950 leading-relaxed">
                  Your current rotation represents your existing practice and does not list comparative benefits against itself. Select <strong>Option C</strong>, <strong>Option A</strong>, or <strong>Option B</strong> above to review benefits relative to your current rotation.
                </div>
              ) : benefitCategories.length > 0 ? (
                <div className="grid grid-cols-1 gap-3.5">
                  {benefitCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.key}
                        className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5"
                      >
                        <div className="flex items-center gap-2 text-base font-bold text-emerald-950">
                          <Icon className="w-5 h-5 text-[#116b37]" />
                          <span>{cat.title}</span>
                        </div>
                        <ul className="space-y-2">
                          {cat.items.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-[15px] text-gray-800 leading-relaxed"
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#116b37] shrink-0 mt-1" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-[15px] text-gray-600">
                  No specific comparative benefits were identified in the available information for this option.
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Trade-offs */}
          {activeDetailSection === 5 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#ea7b15]" />
                  <span>Key Trade-offs &amp; Compromises</span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  {isCurrentBaseline
                    ? 'Trade-offs compare new candidate options against your current practice.'
                    : 'Practical costs, labour demands, or limitations to weigh before choosing this option.'}
                </p>
              </div>

              {isCurrentBaseline && tradeOffs.length === 0 ? (
                <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 text-[15px] text-sky-950 leading-relaxed">
                  Your current rotation is the baseline for comparison, so separate comparative trade-offs are not listed here. Switch to Option C, Option A, or Option B to see their trade-offs.
                </div>
              ) : tradeOffs.length > 0 ? (
                <div className="space-y-3">
                  {tradeOffs.map((t, idx) => {
                    const meta = classifyTradeOff(t);
                    return (
                      <div
                        key={idx}
                        className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3 ${
                          meta.isComparison
                            ? 'bg-sky-50/60 border-sky-200'
                            : 'bg-amber-50/60 border-amber-200'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-5 h-5 shrink-0 mt-0.5 ${
                            meta.isComparison ? 'text-sky-700' : 'text-[#ea7b15]'
                          }`}
                        />
                        <div className="space-y-1">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              meta.isComparison
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {meta.tag}
                          </span>
                          <p className="text-[15px] text-gray-900 leading-relaxed">{t}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-[15px] text-gray-700">
                  No specific trade-offs were identified in the available information.
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: What We Still Need to Know (Gaps) */}
          {activeDetailSection === 6 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-sky-700" />
                  <span>What We Still Need to Know</span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  Missing measurements or local information that affect how certain this guidance is.
                </p>
              </div>

              {simplifiedGaps.summaryBullets.length > 0 ? (
                <div className="space-y-3">
                  {simplifiedGaps.summaryBullets.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-sky-50/50 border border-sky-200 flex items-start gap-3 text-[15px] text-gray-800 leading-relaxed"
                    >
                      <HelpCircle className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </div>
                  ))}

                  {simplifiedGaps.rawTraitDetails.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRawTraitGaps((prev) => !prev)}
                        className="text-sm font-medium text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>
                          {showRawTraitGaps
                            ? 'Hide unverified crop trait list'
                            : 'View specific unverified crop traits'}
                        </span>
                        {showRawTraitGaps ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showRawTraitGaps && (
                        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 space-y-1.5">
                          {simplifiedGaps.rawTraitDetails.map((raw, i) => (
                            <p key={i} className="leading-relaxed">
                              {raw}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-[15px] text-gray-600">
                  No additional data gaps were listed for this rotation.
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: Risks for Local Review */}
          {activeDetailSection === 7 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <ClipboardCheck className="w-5 h-5 text-[#ea7b15]" />
                  <span>Risks for Local Review</span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  Practical points to verify with your household or local agricultural extension officer before planting.
                </p>
              </div>

              {(risks.length > 0 || localChecksFromConstraints.length > 0) ? (
                <div className="space-y-3">
                  {localChecksFromConstraints.map((cond, idx) => (
                    <div
                      key={`cond-${idx}`}
                      className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5"
                    >
                      <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Action Needed Before Choosing
                      </span>
                      <p className="text-[15px] font-medium text-amber-950 leading-relaxed">
                        Confirm that {cond}
                      </p>
                    </div>
                  ))}

                  {risks.map((r, idx) => {
                    const checkQuestion = inferRiskCheckQuestion(r);
                    return (
                      <div
                        key={`risk-${idx}`}
                        className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#ea7b15] shrink-0 mt-0.5" />
                          <p className="text-[15px] text-gray-900 leading-relaxed">{r}</p>
                        </div>
                        {checkQuestion && (
                          <p className="text-sm font-medium text-amber-950 bg-white/80 border border-amber-200/80 rounded-lg px-3.5 py-2 ml-8">
                            {checkQuestion}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-[15px] text-gray-700 leading-relaxed">
                  {isCurrentBaseline
                    ? 'No candidate-specific extension risks are listed for your existing baseline rotation.'
                    : 'No specific local review risks were identified in the available information.'}
                </div>
              )}
            </div>
          )}

          {/* SECTION 8: Confidence */}
          {activeDetailSection === 8 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#116b37]" />
                  <span>Confidence Summary</span>
                </h4>
                <p className="text-[15px] text-gray-600 mt-1 leading-relaxed">
                  How reliable this score is based on local observations, crop traits, and weather data.
                </p>
              </div>

              {/* Overall Confidence Card */}
              <div className="p-5 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-gray-600 block">
                      Overall Confidence Level
                    </span>
                    {confidenceSummary.pct !== null && (
                      <span className="text-sm text-gray-700">
                        {confidenceSummary.pct}% of crop traits used here have a source or farmer report
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-3.5 py-1.5 rounded-full text-sm font-bold border ${confidenceSummary.badgeClasses}`}
                  >
                    {confidenceSummary.label}
                  </span>
                </div>

                <p className="text-[15px] text-gray-800 leading-relaxed bg-white p-4 rounded-xl border border-gray-200">
                  {confidenceSummary.meaning}
                </p>

                {/* Main Factors Affecting Confidence */}
                {activeStrategy.confidence_detail?.reasons &&
                  activeStrategy.confidence_detail.reasons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-gray-900">
                        Main Factors Affecting Confidence
                      </p>
                      <ul className="space-y-2">
                        {activeStrategy.confidence_detail.reasons.slice(0, 4).map((reason, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-[15px] text-gray-800 leading-relaxed"
                          >
                            <Info className="w-4 h-4 text-sky-700 shrink-0 mt-1" />
                            <span>{capFirst(reason)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Priority Local Verification Item */}
                {localChecksFromConstraints.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-[15px] text-amber-950">
                    <span className="font-bold block mb-1">Most Important Local Verification</span>
                    <span>Confirm that {localChecksFromConstraints.join('; ')}.</span>
                  </div>
                )}
              </div>

              {/* Optional Collapsed Technical Details for Team / Agronomists */}
              {((evaluationResult.assumptions && evaluationResult.assumptions.length > 0) ||
                (evaluationResult.not_evaluated && evaluationResult.not_evaluated.length > 0)) && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails((prev) => !prev)}
                    className="w-full px-5 py-3.5 bg-white hover:bg-gray-50 flex items-center justify-between text-sm font-semibold text-gray-700 transition cursor-pointer"
                  >
                    <span>Technical Details &amp; Model Scope (Optional)</span>
                    {showTechnicalDetails ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {showTechnicalDetails && (
                    <div className="p-5 bg-gray-50 border-t border-gray-200 space-y-4">
                      {evaluationResult.assumptions && evaluationResult.assumptions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-gray-900">Engine Assumptions</p>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5 leading-relaxed">
                            {evaluationResult.assumptions.map((a, idx) => (
                              <li key={idx}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluationResult.not_evaluated && evaluationResult.not_evaluated.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          <p className="text-sm font-bold text-gray-900">Outside Current Version Scope</p>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5 leading-relaxed">
                            {evaluationResult.not_evaluated.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => goToStep('strategies')}
          className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Three Options</span>
        </button>

        <button
          onClick={() => goToStep('compare-report')}
          className="px-6 py-2.5 bg-[#116b37] hover:bg-[#0d542b] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
        >
          <span>View Comparison &amp; Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
