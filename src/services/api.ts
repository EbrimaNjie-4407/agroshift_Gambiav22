/**
 * AgroShift Gambia — Centralized API Service Layer
 * Interfaces directly with the Python FastAPI backend.
 * Uses VITE_API_URL when configured, or relative paths (proxied by Vite in dev).
 *
 * Verified Backend Endpoints (commit f37f542):
 * - GET  /health                      -> Health check
 * - GET  /api/v2/fields/{field_id}    -> Field metadata and baseline features
 * - GET  /api/v2/fallback/{field_id}  -> Static fallback data
 * - GET  /api/v2/evidence/{field_id}  -> Detailed NASA & ISRIC environmental evidence
 * - POST /api/v2/strategies           -> Rule-based crop-rotation recommendation engine
 * - GET  /api/v2/engine               -> Engine metadata and criteria definitions
 */

import {
  BackendStrategyRequest,
  BackendStrategyResponse,
  EvidenceData,
  FieldData,
} from '../types/agroshift';

const RAW_ENV_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const VALID_PROD_API_URL =
  RAW_ENV_API_URL && /^https?:\/\/\S+$/i.test(RAW_ENV_API_URL)
    ? RAW_ENV_API_URL.replace(/\/+$/, '')
    : '';

// In Vite development mode, always use relative URLs (/health, /api/v2/...) so requests pass
// through the local Vite dev proxy without triggering browser CORS restrictions.
// In production builds, honor a valid VITE_API_URL if configured, or fall back to relative URLs.
export const API_BASE_URL = import.meta.env.DEV ? '' : VALID_PROD_API_URL;

export class ApiError extends Error {
  status?: number;
  data?: any;
  isTimeout?: boolean;
  isNotFound?: boolean;
  isNetworkError?: boolean;

  constructor(
    message: string,
    status?: number,
    data?: any,
    flags?: { isTimeout?: boolean; isNotFound?: boolean; isNetworkError?: boolean }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isTimeout = flags?.isTimeout;
    this.isNotFound = flags?.isNotFound;
    this.isNetworkError = flags?.isNetworkError;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  // 35-second timeout to handle Render free-tier cold starts gracefully
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail =
            typeof errorJson.detail === 'string'
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Response wasn't JSON
      }

      if (response.status === 404) {
        throw new ApiError(
          errorDetail || 'The requested field record was not found on the backend.',
          404,
          undefined,
          { isNotFound: true }
        );
      }

      if (response.status === 422) {
        throw new ApiError(
          `The backend could not process the submitted request: ${errorDetail}`,
          422
        );
      }

      throw new ApiError(errorDetail, response.status);
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err?.name === 'AbortError') {
      throw new ApiError(
        `Connection timed out waiting for the AgroShift backend. Render may be waking up from sleep (cold start). Please wait a few seconds and retry.`,
        408,
        undefined,
        { isTimeout: true }
      );
    }
    throw new ApiError(
      `Unable to reach the AgroShift backend${API_BASE_URL ? ` at ${API_BASE_URL}` : ''}. Please check your connection or retry.`,
      0,
      undefined,
      { isNetworkError: true }
    );
  }
}

export const agroShiftApi = {
  async checkHealth(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },

  async getField(fieldId: string): Promise<FieldData> {
    if (!fieldId || !fieldId.trim()) {
      throw new ApiError('A valid field ID is required.', 400);
    }
    return request<FieldData>(`/api/v2/fields/${encodeURIComponent(fieldId)}`);
  },

  async getFallback(fieldId: string): Promise<FieldData> {
    if (!fieldId || !fieldId.trim()) {
      throw new ApiError('A valid field ID is required.', 400);
    }
    return request<FieldData>(`/api/v2/fallback/${encodeURIComponent(fieldId)}`);
  },

  async getEvidence(fieldId: string): Promise<EvidenceData> {
    if (!fieldId || !fieldId.trim()) {
      throw new ApiError('A valid field ID is required.', 400);
    }
    return request<EvidenceData>(`/api/v2/evidence/${encodeURIComponent(fieldId)}`);
  },

  async recommendStrategies(payload: BackendStrategyRequest): Promise<BackendStrategyResponse> {
    return request<BackendStrategyResponse>('/api/v2/strategies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getEngineInfo(): Promise<any> {
    return request<any>('/api/v2/engine');
  },
};
