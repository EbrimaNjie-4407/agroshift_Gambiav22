/**
 * AgroShift Gambia — Shared Application Context
 * Governs navigation steps, farmer input state, NASA feature retrieval,
 * backend health monitoring, and decision engine evaluation results.
 *
 * Fully integrated with the authoritative Python FastAPI backend.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  BackendHealth,
  BackendStrategyRequest,
  BackendStrategyResponse,
  CropHistory,
  EvidenceData,
  FarmerPriorities,
  FarmingSystem,
  FieldData,
  FieldDetails,
  LocationData,
  PracticalConstraints,
  ScreenStep,
  StrategyId,
} from '../types/agroshift';
import { agroShiftApi, API_BASE_URL, ApiError } from '../services/api';

const DEFAULT_LOCATION: LocationData = {
  district: 'Brikama Manduar',
  region: 'West Coast Region',
  country: 'The Gambia',
  latitude: 13.24890667,
  longitude: -16.61527333,
  coordinates: [13.24890667, -16.61527333],
};

const DEFAULT_FIELD_DETAILS: FieldDetails = {
  name: 'Brikama Manduar Pilot Field',
  size_ha: 2.5,
  field_type: 'Upland',
  observed_soil: 'Sandy loam',
};

const DEFAULT_CROP_HISTORY: CropHistory = {
  season_1: 'Groundnut', // Season 1 (2022/2023)
  season_2: 'Maize',     // Season 2 (2023/2024)
  season_3: 'Groundnut', // Season 3 (2024/2025 - most recent)
};

const DEFAULT_FARMING_SYSTEM: FarmingSystem = {
  intercropping: false,
  farmer_observations: 'Sandy loam topsoil, noted early season dry spells in July.',
};

// 0 to 3 scale (matches backend rules.py DEFAULT_REQUESTED)
const DEFAULT_PRIORITIES: FarmerPriorities = {
  water: 2,
  soil_health: 3,
  food: 3,
  income: 3,
  labour: 3,
};

const DEFAULT_CONSTRAINTS: PracticalConstraints = {
  water_source: 'Rain-fed only',
  seed_availability: 'Medium / Local market',
  labour_availability: 'Moderate hired labour',
  budget_level: 'Low / Minimal input',
};

const STEP_ORDER: ScreenStep[] = [
  'overview',
  'choose-field',
  'field-details',
  'priorities-limits',
  'analysis',
  'evidence',
  'strategies',
  'strategy-detail',
  'compare-report',
];

export type DataSourceKind = 'live' | 'fallback' | 'none';

interface AgroShiftContextType {
  // Navigation
  currentStep: ScreenStep;
  goToStep: (step: ScreenStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  stepIndex: number;
  totalSteps: number;

  // Farmer Inputs
  selectedFieldId: string;
  setSelectedFieldId: (id: string) => void;
  location: LocationData;
  setLocation: React.Dispatch<React.SetStateAction<LocationData>>;
  fieldDetails: FieldDetails;
  setFieldDetails: React.Dispatch<React.SetStateAction<FieldDetails>>;
  cropHistory: CropHistory;
  setCropHistory: React.Dispatch<React.SetStateAction<CropHistory>>;
  farmingSystem: FarmingSystem;
  setFarmingSystem: React.Dispatch<React.SetStateAction<FarmingSystem>>;
  priorities: FarmerPriorities;
  setPriorities: React.Dispatch<React.SetStateAction<FarmerPriorities>>;
  constraints: PracticalConstraints;
  setConstraints: React.Dispatch<React.SetStateAction<PracticalConstraints>>;

  // Backend Health, Field Data & Environmental Evidence
  backendHealth: BackendHealth;
  checkHealth: () => Promise<void>;
  fieldData: FieldData | null;
  fieldDataSource: DataSourceKind;
  isLoadingFieldData: boolean;
  fieldDataError: string | null;
  loadFieldData: (fieldId?: string) => Promise<void>;

  evidenceData: EvidenceData | null;
  isLoadingEvidence: boolean;
  evidenceError: string | null;
  isEvidenceNotFound: boolean;
  loadEvidence: (fieldId?: string, force?: boolean) => Promise<void>;

  // Evaluation Execution (POST /api/v2/strategies)
  isEvaluating: boolean;
  evaluationResult: BackendStrategyResponse | null;
  evaluationError: string | null;
  runEvaluation: () => Promise<void>;
  useOfflineFallback: () => Promise<void>;

  // Results Navigation
  selectedStrategyId: StrategyId;
  setSelectedStrategyId: (id: StrategyId) => void;
  activeDetailSection: number;
  setActiveDetailSection: (section: number) => void;
}

const AgroShiftContext = createContext<AgroShiftContextType | undefined>(undefined);

export const AgroShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<ScreenStep>('overview');

  // Input states
  const [selectedFieldId, setSelectedFieldId] = useState<string>('field-001');
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [fieldDetails, setFieldDetails] = useState<FieldDetails>(DEFAULT_FIELD_DETAILS);
  const [cropHistory, setCropHistory] = useState<CropHistory>(DEFAULT_CROP_HISTORY);
  const [farmingSystem, setFarmingSystem] = useState<FarmingSystem>(DEFAULT_FARMING_SYSTEM);
  const [priorities, setPriorities] = useState<FarmerPriorities>(DEFAULT_PRIORITIES);
  const [constraints, setConstraints] = useState<PracticalConstraints>(DEFAULT_CONSTRAINTS);

  // Backend state
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({
    status: 'checking',
    url: API_BASE_URL || 'Vite Proxy -> agroshift-gambia.onrender.com',
    lastChecked: null,
  });
  const [fieldData, setFieldData] = useState<FieldData | null>(null);
  const [fieldDataSource, setFieldDataSource] = useState<DataSourceKind>('none');
  const [isLoadingFieldData, setIsLoadingFieldData] = useState<boolean>(false);
  const [fieldDataError, setFieldDataError] = useState<string | null>(null);

  // Environmental Evidence state
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [isEvidenceNotFound, setIsEvidenceNotFound] = useState<boolean>(false);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<BackendStrategyResponse | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  // Strategy exploration state
  const [selectedStrategyId, setSelectedStrategyId] = useState<StrategyId>('A');
  const [activeDetailSection, setActiveDetailSection] = useState<number>(1);

  // Duplicate-request prevention refs
  const inFlightHealthRef = useRef<boolean>(false);
  const inFlightFieldRef = useRef<string | null>(null);
  const inFlightEvidenceRef = useRef<string | null>(null);
  const inFlightEvalRef = useRef<boolean>(false);

  // Navigation helpers
  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;

  const goToStep = useCallback((step: ScreenStep) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const nextStep = useCallback(() => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEP_ORDER.length) {
      goToStep(STEP_ORDER[nextIdx]);
    }
  }, [stepIndex, goToStep]);

  const prevStep = useCallback(() => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      goToStep(STEP_ORDER[prevIdx]);
    }
  }, [stepIndex, goToStep]);

  // Health check handler
  const checkHealth = useCallback(async () => {
    if (inFlightHealthRef.current) return;
    inFlightHealthRef.current = true;
    setBackendHealth((prev) => ({ ...prev, status: 'checking', error: null }));
    try {
      const res = await agroShiftApi.checkHealth();
      if (res?.status === 'healthy' || res?.status === 'ok') {
        setBackendHealth({
          status: 'online',
          url: API_BASE_URL || 'Vite Proxy -> agroshift-gambia.onrender.com',
          lastChecked: new Date().toLocaleTimeString(),
          error: null,
        });
      } else {
        setBackendHealth({
          status: 'offline',
          url: API_BASE_URL || 'Vite Proxy -> agroshift-gambia.onrender.com',
          lastChecked: new Date().toLocaleTimeString(),
          error: `Unexpected health status: ${res?.status ?? 'unknown'}`,
        });
      }
    } catch (err: any) {
      setBackendHealth({
        status: 'offline',
        url: API_BASE_URL || 'Vite Proxy -> agroshift-gambia.onrender.com',
        lastChecked: new Date().toLocaleTimeString(),
        error: err?.message || 'Backend unreachable.',
      });
    } finally {
      inFlightHealthRef.current = false;
    }
  }, []);

  // Field data loader (with clear fallback distinction; never silently replaces 404s)
  const loadFieldData = useCallback(async (fieldId: string = 'field-001') => {
    if (inFlightFieldRef.current === fieldId) return;
    inFlightFieldRef.current = fieldId;
    setIsLoadingFieldData(true);
    setFieldDataError(null);
    try {
      const data = await agroShiftApi.getField(fieldId);
      setFieldData(data);
      setFieldDataSource('live');
    } catch (err: any) {
      if (err instanceof ApiError && err.isNotFound) {
        setFieldData(null);
        setFieldDataSource('none');
        setFieldDataError(
          `Field '${fieldId}' has no precomputed field record on the backend (HTTP 404). Only pilot field 'field-001' has cached field records.`
        );
      } else {
        // Live field fetch failed due to outage/5xx; try static fallback endpoint
        try {
          const fallback = await agroShiftApi.getFallback(fieldId);
          setFieldData(fallback);
          setFieldDataSource('fallback');
          setFieldDataError(
            `Live field record unavailable (${err?.message || 'connection error'}). Showing static fallback metadata.`
          );
        } catch {
          setFieldData(null);
          setFieldDataSource('none');
          setFieldDataError(err?.message || 'Unable to load field data from backend.');
        }
      }
    } finally {
      inFlightFieldRef.current = null;
      setIsLoadingFieldData(false);
    }
  }, []);

  // Environmental Evidence loader (GET /api/v2/evidence/{field_id})
  const loadEvidence = useCallback(async (fieldId: string = 'field-001', force: boolean = false) => {
    if (!force && inFlightEvidenceRef.current === fieldId) return;
    inFlightEvidenceRef.current = fieldId;
    setIsLoadingEvidence(true);
    setEvidenceError(null);
    setIsEvidenceNotFound(false);
    try {
      const data = await agroShiftApi.getEvidence(fieldId);
      setEvidenceData(data);
    } catch (err: any) {
      setEvidenceData(null);
      if (err instanceof ApiError && err.isNotFound) {
        setIsEvidenceNotFound(true);
        setEvidenceError(
          `No cached NASA or SoilGrids environmental evidence exists on the backend for '${fieldId}'. Cached pilot datasets are currently available for 'field-001' (Brikama Manduar).`
        );
      } else {
        setEvidenceError(err?.message || 'Unable to load environmental evidence from backend.');
      }
    } finally {
      inFlightEvidenceRef.current = null;
      setIsLoadingEvidence(false);
    }
  }, []);

  // Normalize UI crop labels to backend knowledge-base canonical names
  const normalizeCropName = (name: string): string => {
    const lower = name.trim().toLowerCase();
    if (!lower) return '';
    if (lower.includes('groundnut')) return 'groundnut';
    if (lower.includes('maize')) return 'maize';
    if (lower.includes('cowpea')) return 'cowpea';
    if (lower.includes('millet')) return 'millet';
    if (lower.includes('sorghum')) return 'sorghum';
    if (lower.includes('sesame')) return 'sesame';
    if (lower.includes('fallow')) return 'fallow';
    return lower;
  };

  // Run full evaluation via POST /api/v2/strategies
  const runEvaluation = useCallback(async () => {
    if (inFlightEvalRef.current) return;
    inFlightEvalRef.current = true;
    setIsEvaluating(true);
    setEvaluationError(null);
    setCurrentStep('analysis');

    // Chronological order: Season 1 (2022/2023) -> Season 2 (2023/2024) -> Season 3 (2024/2025)
    const rotationHistory = [
      { year: 2023, crop: normalizeCropName(cropHistory.season_1) },
      { year: 2024, crop: normalizeCropName(cropHistory.season_2) },
      { year: 2025, crop: normalizeCropName(cropHistory.season_3) },
    ].filter((item) => item.crop && item.crop !== 'fallow');

    // Map practical constraints to backend engine/feasibility.py expectations
    let seedAccess: Record<string, string>;
    let availableCrops: string[];
    if (constraints.seed_availability === 'Low / Saved seed only') {
      seedAccess = {
        groundnut: 'available',
        maize: 'available',
        cowpea: 'unavailable',
        millet: 'unavailable',
        sorghum: 'unavailable',
      };
      availableCrops = ['groundnut', 'maize'];
    } else if (constraints.seed_availability === 'High / Certified') {
      seedAccess = {
        groundnut: 'available',
        maize: 'available',
        cowpea: 'available',
        millet: 'available',
        sorghum: 'available',
      };
      availableCrops = ['groundnut', 'maize', 'cowpea', 'millet', 'sorghum'];
    } else {
      // 'Medium / Local market': groundnut & maize locally confirmed; candidate crops remain unconfirmed/limited
      seedAccess = {
        groundnut: 'available',
        maize: 'available',
        cowpea: 'limited',
        millet: 'limited',
        sorghum: 'limited',
      };
      availableCrops = ['groundnut', 'maize'];
    }

    const budgetLevelBackend =
      constraints.budget_level === 'Low / Minimal input'
        ? 'low'
        : constraints.budget_level === 'Moderate'
        ? 'moderate'
        : 'high';

    const labourAvailableBool = constraints.labour_availability !== 'Scarce / Family only';
    const labourWordBackend =
      constraints.labour_availability === 'Scarce / Family only'
        ? 'family_only'
        : constraints.labour_availability === 'Abundant family labour'
        ? 'abundant'
        : 'moderate';

    const drySeasonWaterBackend =
      constraints.water_source === 'Rain-fed only' ? 'none' : 'available';

    const payload: BackendStrategyRequest = {
      field_id: selectedFieldId,
      features: {},
      farmer_context: {
        priorities: {
          water: priorities.water,
          soil_health: priorities.soil_health,
          food: priorities.food,
          income: priorities.income,
          labour: priorities.labour,
        },
        rotation_history: rotationHistory,
        available_crops: availableCrops,
        labour: labourWordBackend,
        budget_level: budgetLevelBackend,
        dry_season_water_access: drySeasonWaterBackend,
      },
      field_context: {
        size_ha: fieldDetails.size_ha,
        field_type: fieldDetails.field_type,
        observed_soil: fieldDetails.observed_soil,
        district: location.district,
        region: location.region,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      weights: {},
      constraints: {
        seed_access: seedAccess,
        budget_level: budgetLevelBackend,
        budget_available: true,
        labour_available: labourAvailableBool,
        dry_season_water: drySeasonWaterBackend,
        water_source: constraints.water_source,
        labour_availability: constraints.labour_availability,
      },
    };

    try {
      const [result] = await Promise.all([
        agroShiftApi.recommendStrategies(payload),
        new Promise((resolve) => setTimeout(resolve, 1200)),
        evidenceData && evidenceData.field_id === selectedFieldId
          ? Promise.resolve()
          : loadEvidence(selectedFieldId),
      ]);

      setEvaluationResult(result);

      if (result.suggestion?.ready_option) {
        setSelectedStrategyId(result.suggestion.ready_option as StrategyId);
      } else if (result.strategies.length > 0) {
        setSelectedStrategyId(result.strategies[0].id);
      }

      setCurrentStep('evidence');
    } catch (err: any) {
      setEvaluationError(err?.message || 'Decision engine evaluation failed.');
    } finally {
      inFlightEvalRef.current = false;
      setIsEvaluating(false);
    }
  }, [
    selectedFieldId,
    cropHistory,
    priorities,
    constraints,
    fieldDetails,
    location,
    evidenceData,
    loadEvidence,
  ]);

  // Explicit static fallback loader (only triggered if user requests fallback during an outage)
  const useOfflineFallback = useCallback(async () => {
    setIsEvaluating(true);
    setEvaluationError(null);
    try {
      const targetId = 'field-001';
      const fallback = await agroShiftApi.getFallback(targetId);
      setFieldData(fallback);
      setFieldDataSource('fallback');
      const fallbackResponse: BackendStrategyResponse = {
        field_id: fallback.field_id,
        engine_version: 'static-fallback',
        strategies: fallback.strategies || [],
        reference_rotation: null,
        suggestion: {
          ready_option: null,
          text: 'Displaying static demonstration fallback records because the live recommendation endpoint was unreachable. Do not treat placeholder fallback records as evaluated farm guidance.',
          confidence: 'unassessed',
          score_ranges_overlap: false,
          conditional_options: [],
        },
        weights: fallback.weights || {},
        weights_requested: {
          water: priorities.water,
          soil_health: priorities.soil_health,
          food: priorities.food,
          income: priorities.income,
          labour: priorities.labour,
        },
        weights_source: 'static_fallback',
        warnings: [
          'Static fallback data loaded from GET /api/v2/fallback/field-001. Scores and sequences are pending live decision-engine evaluation.',
        ],
        constraints: fallback.constraints || {},
        farmer_context: {},
        field_context: {},
        evidence_base: {
          site: `${fallback.location.district}, ${fallback.location.region}`,
          farmers_interviewed: 0,
          fields_seen: 0,
          fields_recorded: 0,
          agronomist_reviewed: false,
          note: 'Static fallback endpoint only — not measured field evidence.',
        },
        climate_evidence: {
          reference_period: 'Unavailable in static fallback',
          dry_spells: {},
          rainfall_agreement: {},
          ndvi_context: {},
          note: 'Static fallback mode.',
        },
        data_quality: {
          status: 'static_fallback',
          missing_features: Object.keys(fallback.features || {}),
          missing_inputs: [],
          notes: ['Static fallback placeholder data loaded due to backend unavailability.'],
          gaps: ['Live strategy evaluation did not complete.'],
        },
        not_evaluated: ['Live decision-engine scoring was not executed.'],
        recommendation_status: 'fallback_only',
        assumptions: [],
        disclaimer: fallback.disclaimer || 'Static demonstration fallback only.',
      };
      setEvaluationResult(fallbackResponse);
      setCurrentStep('evidence');
    } catch (err: any) {
      setEvaluationError(err?.message || 'Failed to load static fallback data.');
    } finally {
      setIsEvaluating(false);
    }
  }, [priorities]);

  // Initial health check once on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Reload field & evidence when selectedFieldId changes
  useEffect(() => {
    loadFieldData(selectedFieldId);
    loadEvidence(selectedFieldId);
  }, [selectedFieldId, loadFieldData, loadEvidence]);

  const value: AgroShiftContextType = {
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    stepIndex,
    totalSteps,

    selectedFieldId,
    setSelectedFieldId,
    location,
    setLocation,
    fieldDetails,
    setFieldDetails,
    cropHistory,
    setCropHistory,
    farmingSystem,
    setFarmingSystem,
    priorities,
    setPriorities,
    constraints,
    setConstraints,

    backendHealth,
    checkHealth,
    fieldData,
    fieldDataSource,
    isLoadingFieldData,
    fieldDataError,
    loadFieldData,

    evidenceData,
    isLoadingEvidence,
    evidenceError,
    isEvidenceNotFound,
    loadEvidence,

    isEvaluating,
    evaluationResult,
    evaluationError,
    runEvaluation,
    useOfflineFallback,

    selectedStrategyId,
    setSelectedStrategyId,
    activeDetailSection,
    setActiveDetailSection,
  };

  return <AgroShiftContext.Provider value={value}>{children}</AgroShiftContext.Provider>;
};

export const useAgroShift = (): AgroShiftContextType => {
  const context = useContext(AgroShiftContext);
  if (!context) {
    throw new Error('useAgroShift must be used within an AgroShiftProvider');
  }
  return context;
};
