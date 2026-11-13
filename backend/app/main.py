import json
import os
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure backend root is on sys.path for engine imports
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from engine.evaluator import evaluate_field

app = FastAPI(
    title="AgroShift Gambia API",
    description="Agricultural decision-support API for rain-fed farmers in The Gambia",
    version="2.0.0"
)

# Configure CORS with explicit allowed origins for Google AI Studio previews and local dev
DEFAULT_ALLOWED_ORIGINS = [
    "https://ais-dev-tahlthfvfhvnjuay6dt352-804795482522.us-east1.run.app",
    "https://ais-pre-tahlthfvfhvnjuay6dt352-804795482522.us-east1.run.app",
    "http://localhost:3000",
]

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
env_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip() and o.strip() != "*"]
allowed_origins = env_origins if env_origins else DEFAULT_ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "data.json"
FALLBACK_FILE = Path(__file__).parent / "static_fallback.json"
CACHE_FILE = BACKEND_ROOT / "pipeline" / "cache" / "pilot_field_001.json"


class Feature(BaseModel):
    value: Any = None
    range: Any = None
    rank: Any = None
    quality_filter: str | None = None
    unit: str | None = None
    dataset: str | None = None
    datasets: list[str] | None = None
    merra2_mean: float | None = None
    merra2_range: list[float] | None = None
    imerg_mean: float | None = None
    imerg_range: list[float] | None = None
    year_2026_status: dict[str, Any] | None = None
    elevation_m: float | None = None
    topsoil_0_5cm: float | None = None
    sand_pct: float | None = None
    clay_pct: float | None = None
    surface_value: float | None = None
    resolution: str | None = None
    period: str | None = None
    data_type: str | None = None
    confidence: str = "unassessed"
    notes: str | None = None


class Strategy(BaseModel):
    id: str
    name: str
    role: str | None = None
    score: float | None = None
    score_range: list[float] | None = None
    rank: int | None = None
    feasibility_status: str | None = None
    confidence: str = "unassessed"
    criteria: list[Any] = Field(default_factory=list)
    sequence: list[Any] = Field(default_factory=list)
    why: str
    evidence: list[Any] = Field(default_factory=list)
    benefits: list[Any] = Field(default_factory=list)
    trade_offs: list[Any] = Field(default_factory=list)
    gaps: list[Any] = Field(default_factory=list)
    risks_for_local_review: list[Any] = Field(default_factory=list)


class FieldData(BaseModel):
    field_id: str
    location: dict[str, Any]
    features: dict[str, Any]
    strategies: list[Strategy] = Field(default_factory=list)
    weights: dict[str, Any] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    disclaimer: str


class EvaluationRequest(BaseModel):
    field_id: str = "field-001"
    location: dict[str, Any] = Field(default_factory=dict)
    field_details: dict[str, Any] = Field(default_factory=dict)
    crop_history: dict[str, str] = Field(default_factory=dict)
    farming_system: dict[str, Any] = Field(default_factory=dict)
    priorities: dict[str, Any] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)


def load_field_data(file_path: Path):
    # Prefer precomputed cache if available
    target_path = file_path
    if file_path == DATA_FILE and CACHE_FILE.exists():
        target_path = CACHE_FILE

    try:
        with open(target_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        # Fallback to base DATA_FILE if cache doesn't exist
        if target_path != file_path and file_path.exists():
            with open(file_path, "r", encoding="utf-8") as file:
                return json.load(file)
        raise HTTPException(
            status_code=500,
            detail="Field data file is missing"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Field data contains invalid JSON"
        )


def verify_field_id(field_data: dict, field_id: str):
    if field_data.get("field_id") != field_id:
        raise HTTPException(
            status_code=404,
            detail="Field not found"
        )
    return field_data


@app.get("/")
def home():
    return {
        "message": "AgroShift Gambia API is running",
        "version": "2.0.0"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/api/v2/fields/{field_id}")
def get_field(field_id: str):
    field_data = load_field_data(DATA_FILE)
    return verify_field_id(field_data, field_id)


@app.get("/api/v2/fallback/{field_id}")
def get_static_fallback(field_id: str):
    field_data = load_field_data(FALLBACK_FILE)
    return verify_field_id(field_data, field_id)


@app.post("/api/v2/evaluate")
def evaluate_field_endpoint(request: EvaluationRequest):
    """
    Evaluates field conditions, crop history, practical constraints, and farmer priorities.
    Returns 3 structured rotation strategies with full provenance, evidence, and risk disclosures.
    """
    field_cache = load_field_data(DATA_FILE)
    verify_field_id(field_cache, request.field_id)

    try:
        result = evaluate_field(field_cache, request.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
