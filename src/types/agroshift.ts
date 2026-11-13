/**
 * AgroShift Gambia — TypeScript Domain Types & API Contracts
 * Fully synchronized with the authoritative FastAPI backend (commit f37f542).
 */

export type ScreenStep =
  | 'overview'           // Page 1: Hero Landing
  | 'choose-field'       // Page 2: Step 1 Choose a Field & Polygon Map
  | 'field-details'      // Page 3: Step 2 Field Info & 3-Season History
  | 'priorities-limits'  // Page 4: Step 3 Farmer Priorities & Practical Constraints
  | 'analysis'           // Page 5: Step 4 Loading / Inspection Animation
  | 'evidence'           // Page 6: Step 5 What the Data Says (Environmental Dashboard)
  | 'strategies'         // Page 7: Step 6 Three Options Overview (Current, Option A, Option B, Option C)
  | 'strategy-detail'    // Page 8: Step 7 Strategy Deep Dive (8 sections & calendar)
  | 'compare-report';    // Page 9: Step 8 Strategic Comparison, Trade-off Plot & Farmer Report

export type StrategyId = 'current' | 'A' | 'B' | 'C';

export type FeasibilityStatus =
  | 'feasible_candidate'
  | 'conditional_candidate'
  | 'not_recommended'
  | 'reference';

export type ConfidenceLevel = 'high' | 'moderate' | 'medium' | 'low' | 'unassessed';

export interface LocationData {
  district: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  coordinates?: [number, number];
  boundary_geojson?: any;
}

// Features in GET /api/v2/fields/{field_id}, /fallback/{field_id}, and /evidence/{field_id}
export interface FeatureItem {
  value: number | string | null;
  range?: [number, number] | null;
  rank?: number | string | null;
  unit?: string | null;
  dataset?: string | null;
  datasets?: string[] | null;
  resolution?: string | null;
  period?: string | null;
  data_type?: string | null;
  quality_filter?: string | null;
  confidence?: ConfidenceLevel;
  notes?: string | null;
  status?: string | null;
}

export type FeaturesMap = Record<string, FeatureItem>;

export interface FieldDetails {
  name: string;
  size_ha: number;
  field_type: 'Upland' | 'Lowland' | 'Fallow' | 'Homestead';
  observed_soil: string;
}

export interface CropHistory {
  season_1: string; // 2022/2023 (oldest)
  season_2: string; // 2023/2024
  season_3: string; // 2024/2025 (most recent)
}

export interface FarmingSystem {
  intercropping: boolean;
  farmer_observations: string;
}

// 0-3 scale matching backend engine rules.py DEFAULT_REQUESTED
export interface FarmerPriorities {
  water: number;        // 0 to 3
  soil_health: number;  // 0 to 3
  food: number;         // 0 to 3
  income: number;       // 0 to 3
  labour: number;       // 0 to 3
}

export interface PracticalConstraints {
  water_source: 'Rain-fed only' | 'Well / Borehole' | 'River / Stream' | 'Supplemental irrigation';
  seed_availability: 'High / Certified' | 'Medium / Local market' | 'Low / Saved seed only';
  labour_availability: 'Abundant family labour' | 'Moderate hired labour' | 'Scarce / Family only';
  budget_level: 'Low / Minimal input' | 'Moderate' | 'High / Commercial inputs';
  seed_access?: Record<string, 'available' | 'limited' | 'unavailable' | 'unknown'>;
}

export interface StrategyCriterion {
  name: string;
  label: string;
  score: number;
  weight: number;
  weighted_points?: number;
  reason?: string;
  supported_trait_share?: number | null;
}

export interface SequenceItem {
  season?: string;
  year?: number | string;
  crop: string;
  role?: string;
}

export interface StructuredEvidenceItem {
  id?: string;
  statement: string;
  evidence_class: string;
  trait_status?: string;
  source_ids?: string[];
}

export interface StrategyConstraints {
  feasible: boolean;
  failures: string[];
  conditions: string[];
  unavailable_crops: string[];
  unconfirmed_candidate_crops: string[];
  would_become_feasible_if: string[];
}

export interface Strategy {
  id: StrategyId;
  kind?: string;
  display_name?: string;
  name: string;
  score: number | null;
  score_range: [number, number] | null;
  suitability_index?: number | null;
  confidence: ConfidenceLevel;
  confidence_detail?: {
    level: ConfidenceLevel;
    reasons?: string[];
    explanation?: string;
    trait_support_share?: number;
    [key: string]: any;
  };
  recommendation_status?: FeasibilityStatus;
  status_note?: string;
  sequence: SequenceItem[];
  criteria: StrategyCriterion[];
  soil_health_components?: Record<string, number> | null;
  rotation_effects?: {
    legume_to_cereal_transitions: number;
    repeat_transitions: number;
    cereal_to_legume_transitions?: number;
  };
  why: string;
  evidence: string[];
  evidence_items?: StructuredEvidenceItem[];
  benefits: string[];
  trade_offs: string[];
  gaps: string[];
  risks_for_local_review: string[];
  constraints?: StrategyConstraints;
  note?: string;
}

// Backend StrategyRequest payload for POST /api/v2/strategies
export interface BackendStrategyRequest {
  field_id: string;
  features?: Record<string, any>;
  farmer_context: {
    priorities?: Record<string, number>;
    rotation_history?: Array<{ year: number; crop: string }>;
    crop_history?: Array<string | { year?: number; crop: string }>;
    available_crops?: string[];
    unavailable_crops?: string[];
    seed_available?: string[];
    labour?: string;
    budget_level?: string;
    dry_season_water_access?: string;
  };
  field_context: {
    size_ha?: number;
    field_type?: string;
    observed_soil?: string;
    district?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  };
  weights?: Record<string, number>;
  constraints: {
    seed_access?: Record<string, string>;
    budget_level?: string;
    budget_available?: boolean;
    labour_available?: boolean;
    dry_season_water?: string;
    water_source?: string;
    labour_availability?: string;
  };
  evidence_base?: Record<string, any>;
}

export interface Suggestion {
  ready_option: string | null;
  text: string;
  confidence: string;
  score_ranges_overlap: boolean;
  conditional_options: Array<{
    id: string;
    name: string;
    conditions: string[];
  }>;
}

// Backend Response from POST /api/v2/strategies
export interface BackendStrategyResponse {
  field_id: string;
  engine_version: string;
  strategies: Strategy[];
  reference_rotation: Strategy | null;
  suggestion: Suggestion;
  weights: Record<string, number>;
  weights_requested: Record<string, number>;
  weights_source: string;
  warnings: string[];
  constraints: Record<string, any>;
  farmer_context: Record<string, any>;
  field_context: Record<string, any>;
  evidence_base: {
    site: string;
    farmers_interviewed: number;
    fields_seen: number;
    fields_recorded: number;
    agronomist_reviewed: boolean;
    note: string;
  };
  climate_evidence: {
    reference_period: string;
    dry_spells: any;
    rainfall_agreement: any;
    ndvi_context: any;
    note: string;
  };
  data_quality: {
    status: string;
    missing_features: string[];
    missing_inputs: string[];
    notes: string[];
    gaps: string[];
  };
  not_evaluated: string[];
  recommendation_status: string;
  assumptions: string[];
  disclaimer: string;
}

// GET /api/v2/fields/{field_id} & /api/v2/fallback/{field_id}
export interface FieldData {
  field_id: string;
  location: Partial<LocationData> & { district: string; region: string; country: string };
  features: FeaturesMap;
  strategies?: Strategy[];
  weights?: Record<string, any>;
  constraints?: Record<string, any>;
  disclaimer?: string;
}

// GET /api/v2/evidence/{field_id}
export interface EvidencePowerItem {
  year: number;
  rainfall_window_days: number;
  dry_spell_window_days: number;
  merra2: {
    rain_total_mm: number | null;
    rainy_days: number | null;
    longest_dry_spell_days: number | null;
    dry_spells_ge7_days: number | null;
    rain_missing_days: number;
    spell_missing_days: number;
  };
  imerg: {
    rain_total_mm: number | null;
    rainy_days: number | null;
    longest_dry_spell_days: number | null;
    dry_spells_ge7_days: number | null;
    rain_missing_days: number;
    spell_missing_days: number;
  };
}

export interface EvidenceModisItem {
  date: string;
  year: number;
  month: string; // e.g. "2015-01"
  ndvi: number;
  reliability: number;
  quality_label: string;
}

export interface EvidenceSoilGridsItem {
  property: string;
  depth: string;
  value: number | null;
  unit: string;
  quantile: string;
  source: string;
}

export interface EvidenceSrtmItem {
  latitude: number;
  longitude: number;
  row_offset: number;
  column_offset: number;
  elevation_m: number | null;
}

export interface EvidenceSmapItem {
  year: number;
  month: number;
  granule_time_utc: string;
  distance_from_pilot_km: number;
  surface_soil_moisture_m3_m3: number | null;
  surface_quality: string;
  rootzone_soil_moisture_m3_m3: number | null;
  rootzone_quality: string;
}

export interface EvidenceData {
  schema_version: string;
  field_id: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  handoff_generated: string;
  reference_period: {
    start_year: number;
    end_year: number;
  };
  features: FeaturesMap;
  evidence: {
    power_annual: EvidencePowerItem[];
    modis_ndvi_nov_jun_usable: EvidenceModisItem[];
    soilgrids: EvidenceSoilGridsItem[];
    srtm_elevation_samples: EvidenceSrtmItem[];
    smap_monthly_snapshots: EvidenceSmapItem[];
  };
  methodology: {
    modis_usable_reliability_values: number[];
    modis_season: string;
    rainfall_window: string;
    dry_spell_window: string;
    dry_day_threshold_mm: number;
    dry_spell_threshold_days: number;
    missing_values: string;
    slope: string;
    soil_texture: string;
    soil_depths: string;
    smap: string;
  };
}

export interface BackendHealth {
  status: 'online' | 'offline' | 'checking';
  url: string;
  lastChecked: string | null;
  error?: string | null;
}
