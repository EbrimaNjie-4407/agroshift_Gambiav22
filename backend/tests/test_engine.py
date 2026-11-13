"""
AgroShift Gambia — Backend & Recommendation Engine Test Suite
Tests NASA data integrity, agronomic principles, hard constraints,
weighted scoring, and FastAPI REST endpoints.
"""

import json
from pathlib import Path
import sys
import unittest

# Ensure backend root is in sys.path
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from engine.evaluator import evaluate_field
from engine.rules import (
    CROPS_DATABASE,
    ESTABLISHED_PRINCIPLES,
    check_hard_constraints,
    evaluate_crop_history_health,
)
from engine.scoring import calculate_weighted_score
from engine.validation import validate_evaluation_input, validate_field_data
from fastapi.testclient import TestClient


class TestAgroShiftEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cache_path = BACKEND_ROOT / "pipeline" / "cache" / "pilot_field_001.json"
        with open(cls.cache_path, "r", encoding="utf-8") as f:
            cls.field_cache = json.load(f)
        cls.client = TestClient(app)

    # --------------------------------------------------------------------------
    # 1. NASA DATA INTEGRITY TESTS
    # --------------------------------------------------------------------------
    def test_nasa_data_integrity(self):
        features = self.field_cache["features"]
        
        # 1.1 Verify separate precipitation sources
        self.assertIn("MERRA-2", features["rain_total_mm"]["datasets"])
        self.assertIn("GPM IMERG", features["rain_total_mm"]["datasets"])
        self.assertIsNotNone(features["rain_total_mm"]["merra2_mean"])
        self.assertIsNotNone(features["rain_total_mm"]["imerg_mean"])
        self.assertNotEqual(
            features["rain_total_mm"]["merra2_mean"],
            features["rain_total_mm"]["imerg_mean"],
            "MERRA-2 and IMERG means must not be arbitrarily merged into one single value"
        )

        # 1.2 Verify 2026 IMERG is incomplete and NOT zero-filled
        status_2026 = features["rain_total_mm"]["year_2026_status"]
        self.assertEqual(status_2026["status"], "incomplete")
        self.assertIsNone(status_2026["imerg_rain_mm"], "2026 IMERG missing days must remain None/null, never 0")
        self.assertNotEqual(status_2026["imerg_rain_mm"], 0, "Missing data must NEVER be coerced to 0")

        # 1.3 Verify dry-spell window definition
        self.assertIn("July 1 - September 30", features["dry_spell_max_days"]["period"])
        self.assertIn("July 1 - September 30", features["dry_spells_ge7d"]["period"])

        # 1.4 Verify MODIS landscape context
        self.assertEqual(features["ndvi_cover_nov_jun"]["dataset"], "MODIS MOD13Q1")
        self.assertIn("Landscape", features["ndvi_cover_nov_jun"]["notes"])

        # 1.5 Verify SMAP regional context
        self.assertIn("SMAP", features["soil_moisture_regional"]["dataset"])
        self.assertIn("6.168 km", features["soil_moisture_regional"]["notes"])

        # 1.6 Verify SoilGrids is labelled as modelled prediction
        self.assertIn("Modelled", features["ph"]["notes"])
        self.assertIn("Modelled", features["soc"]["notes"])

    # --------------------------------------------------------------------------
    # 2. AGRONOMIC VALIDATION TESTS
    # --------------------------------------------------------------------------
    def test_agronomic_principles_citations(self):
        for key, principle in ESTABLISHED_PRINCIPLES.items():
            self.assertTrue(len(principle["citations"]) > 0, f"Principle {key} must include documented citations")
            self.assertTrue(len(principle["description"]) > 50, f"Principle {key} must have detailed description")

    def test_repeated_legume_not_automatically_disqualified(self):
        # 3 seasons of groundnut
        eval_result = evaluate_crop_history_health(["Groundnut", "Groundnut", "Groundnut"], intercropping=False)
        self.assertTrue(len(eval_result["warnings"]) > 0, "Continuous groundnut should produce risk warnings")
        # Ensure it didn't raise exception or disqualify
        self.assertGreater(eval_result["soil_health_baseline"], 0, "Baseline should be downgraded, not zeroed")

        # Test intercropping mitigates warning
        intercropped_eval = evaluate_crop_history_health(["Groundnut", "Groundnut", "Groundnut"], intercropping=True)
        self.assertGreater(
            intercropped_eval["soil_health_baseline"],
            eval_result["soil_health_baseline"],
            "Intercropping should moderate the soil health penalty"
        )

    def test_hard_constraint_screening(self):
        features = self.field_cache["features"]
        # Rainfed maize with dry spells
        result = check_hard_constraints(
            "Maize",
            {"water_source": "Rain-fed only", "budget_level": "Low / Minimal input"},
            features
        )
        self.assertEqual(result["status"], "Conditional")
        self.assertIn("Maize is susceptible", result["reason"])

        # Rainfed early millet should pass cleanly
        millet_result = check_hard_constraints(
            "Early Millet",
            {"water_source": "Rain-fed only", "budget_level": "Low / Minimal input"},
            features
        )
        self.assertEqual(millet_result["status"], "Passed")

    # --------------------------------------------------------------------------
    # 3. WEIGHTED SCORING TESTS
    # --------------------------------------------------------------------------
    def test_scoring_skips_missing_and_respects_weights(self):
        criteria = {"water": 80.0, "soil": 90.0, "unknown": None}
        weights = {"water": 0.5, "soil": 0.5, "unknown": 0.2}
        score = calculate_weighted_score(criteria, weights)
        self.assertEqual(score, 85.0)

        # Non-positive weights skipped
        zero_weight = calculate_weighted_score({"water": 100}, {"water": 0})
        self.assertIsNone(zero_weight)

    # --------------------------------------------------------------------------
    # 4. DECISION ENGINE EVALUATION INTEGRATION TESTS
    # --------------------------------------------------------------------------
    def test_evaluate_field_produces_three_strategies(self):
        request_payload = {
            "field_id": "field-001",
            "field_details": {"name": "Test Field", "size_ha": 3.0, "observed_soil": "Sandy loam"},
            "crop_history": {
                "season_1": "Groundnut",
                "season_2": "Groundnut",
                "season_3": "Early Millet"
            },
            "farming_system": {"intercropping": False, "farmer_observations": "Sandy upland"},
            "priorities": {
                "conserve_water": 30,
                "improve_soil_health": 30,
                "increase_food_production": 20,
                "generate_income": 10,
                "reduce_labour": 10
            },
            "constraints": {
                "water_source": "Rain-fed only",
                "seed_availability": "Medium / Local market",
                "labour_availability": "Moderate hired labour",
                "budget_level": "Low / Minimal input"
            }
        }
        response = evaluate_field(self.field_cache, request_payload)

        # Verify top-level structure
        self.assertEqual(response["field_id"], "field-001")
        self.assertIn("features", response)
        self.assertIn("constraints_check", response)
        self.assertIn("strategies", response)
        self.assertEqual(len(response["strategies"]), 3)

        strategy_ids = [s["id"] for s in response["strategies"]]
        self.assertIn("current", strategy_ids)
        self.assertIn("A", strategy_ids)
        self.assertIn("B", strategy_ids)

        # Verify strategy contract fields
        for s in response["strategies"]:
            self.assertIn("name", s)
            self.assertIn("score", s)
            self.assertIn("score_range", s)
            self.assertIn("rank", s)
            self.assertIn("feasibility_status", s)
            self.assertIn("confidence", s)
            self.assertIn("sequence", s)
            self.assertIn("why", s)
            self.assertIn("evidence", s)
            self.assertIn("benefits", s)
            self.assertIn("trade_offs", s)
            self.assertIn("gaps", s)
            self.assertIn("risks_for_local_review", s)

        # Verify no guaranteed yield claims
        self.assertIn("Decision-support suggestions only", response["disclaimer"])
        self.assertIn("do not constitute guaranteed agricultural outcomes", response["disclaimer"])

    # --------------------------------------------------------------------------
    # 5. FASTAPI REST ENDPOINTS TESTS
    # --------------------------------------------------------------------------
    def test_api_health(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "healthy"})

    def test_api_get_field(self):
        res = self.client.get("/api/v2/fields/field-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["field_id"], "field-001")
        self.assertIn("features", data)
        self.assertIn("rain_total_mm", data["features"])

    def test_api_get_static_fallback(self):
        res = self.client.get("/api/v2/fallback/field-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["field_id"], "field-001")
        self.assertIn("strategies", data)

    def test_api_post_evaluate(self):
        payload = {
            "field_id": "field-001",
            "field_details": {"name": "Brikama Pilot", "size_ha": 2.5, "field_type": "Upland"},
            "crop_history": {
                "season_1": "Groundnut",
                "season_2": "Groundnut",
                "season_3": "Early Millet"
            },
            "farming_system": {"intercropping": True, "farmer_observations": "Good drainage"},
            "priorities": {
                "conserve_water": 20,
                "improve_soil_health": 30,
                "increase_food_production": 20,
                "generate_income": 20,
                "reduce_labour": 10
            },
            "constraints": {
                "water_source": "Rain-fed only",
                "seed_availability": "Medium / Local market",
                "labour_availability": "Moderate hired labour",
                "budget_level": "Low / Minimal input"
            }
        }
        res = self.client.post("/api/v2/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["field_id"], "field-001")
        self.assertEqual(len(data["strategies"]), 3)
        self.assertIn("Option A", [s["name"] for s in data["strategies"]][0] + [s["name"] for s in data["strategies"]][1])


if __name__ == "__main__":
    unittest.main()
