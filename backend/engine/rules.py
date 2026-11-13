"""
AgroShift Gambia — Agronomic Rules & Knowledge Base
Defines crop profiles, established agronomic principles, proposed decision heuristics,
and validation requirements for Gambian rain-fed agriculture.

IMPORTANT PRINCIPLES:
1. Established principles are clearly separated from heuristic decision rules.
2. Every established principle includes documented scientific citations.
3. Repeated legumes are NEVER automatically disqualified without defensible rules
   and appropriate context (e.g. intercropping mitigation, advisory warnings).
4. Rules requiring validation by Gambian agricultural experts are explicitly flagged.
5. Scores represent decision-support suitability (0-100), NEVER guaranteed yield.
"""

from typing import Any, Dict, List, Optional


# ==============================================================================
# TIER 1: ESTABLISHED AGRONOMIC PRINCIPLES (Documented Science)
# ==============================================================================
ESTABLISHED_PRINCIPLES = {
    "biological_nitrogen_fixation": {
        "title": "Biological Nitrogen Fixation (BNF) in Legumes",
        "description": (
            "Legumes (Groundnut, Cowpea) form symbiotic relationships with Bradyrhizobium "
            "bacteria in root nodules, converting atmospheric N2 into bio-available nitrogen. "
            "Dual-purpose cowpea can fix 30-60 kg N/ha, while groundnut fixes 20-40 kg N/ha. "
            "Incorporating legume residues provides a net positive nitrogen contribution to "
            "subsequent cereal crops, reducing chemical nitrogen requirements."
        ),
        "citations": [
            "Peoples, M.B., et al. (1995). Biological nitrogen fixation: Investments, expectations and actual contributions to agriculture. Plant and Soil, 174(1), 3-28.",
            "Giller, K.E. (2001). Nitrogen Fixation in Tropical Cropping Systems (2nd ed.). CABI Publishing.",
            "FAO (2004). Fertilizer and Plant Nutrition Bulletin 16: Use of phosphate rocks for sustainable agriculture."
        ]
    },
    "cereal_legume_disease_break": {
        "title": "Cereal-Legume Rotation & Pathogen Disruption",
        "description": (
            "Rotating non-host cereals (Early Millet / Souna, Sorghum) with legumes breaks "
            "host-specific fungal spore cycles (Cercospora arachidicola / early leaf spot, "
            "Phaeoisariopsis personata / late leaf spot) and soil-borne pathogens (Macrophomina "
            "phaseolina, Sclerotium rolfsii), while legume rotation helps suppress cereal "
            "parasitic weeds like Striga hermonthica through suicidal germination induction."
        ),
        "citations": [
            "ICRISAT (1992). Groundnut Virus Diseases in Africa. Summary Proceedings.",
            "Bationo, A., et al. (2012). Innovations as Key to the Green Revolution in Africa. Springer Netherlands.",
            "Subrahmanyam, P., et al. (1995). Screening methods and sources of resistance to rust and late leaf spot of groundnut. Information Bulletin no. 47. ICRISAT."
        ]
    },
    "soil_organic_carbon_maintenance": {
        "title": "Soil Organic Matter Depletion on Sandy West African Soils",
        "description": (
            "Upland soils in The Gambia (predominantly Arenosols and ferric Luvisols) have high "
            "sand fractions (55-65%) and naturally low organic carbon (<10 g/kg). Under tropical "
            "heat and oxidation, SOC mineralizes rapidly. Incorporating leafy cowpea residue, "
            "millet stover, and compost is essential to maintain cation exchange capacity (CEC), "
            "soil aggregation, and water-holding capacity during dry spells."
        ),
        "citations": [
            "Pieri, C. (1989). Fertilité des terres de savanes: Bilan de trente ans de recherche et de développement agricoles au sud du Sahara. Ministère de la Coopération et CIRAD.",
            "Bationo, A., & Buerkert, A. (2001). Soil organic carbon management for sustainable land use in Sudano-Sahelian West Africa. Nutrient Cycling in Agroecosystems, 61(1), 131-142."
        ]
    },
    "root_architecture_drought_buffering": {
        "title": "Root Architecture and Subsoil Moisture Access",
        "description": (
            "Pearl millet and sorghum develop extensive, deep rooting systems (1.5 to 2.0 m depth) "
            "with osmotic adjustment capabilities, allowing them to access deeper soil moisture "
            "during mid-season dry spells. Groundnut develops a shallower taproot (0.6 to 0.9 m) "
            "that is more susceptible to topsoil desiccation when dry spells exceed 7 days."
        ),
        "citations": [
            "Payne, W.A. (2000). Optimizing crop water use in sparse stands of pearl millet. Agronomy Journal, 92(5), 808-814.",
            "Winkel, T., et al. (2001). Assessing the drought vulnerability of pearl millet in the Sahel. Agricultural and Forest Meteorology, 107(1), 1-13."
        ]
    }
}


# ==============================================================================
# CROPS CATALOGUE (Rain-fed Gambian Context)
# ==============================================================================
CROPS_DATABASE: Dict[str, Dict[str, Any]] = {
    "Groundnut": {
        "scientific_name": "Arachis hypogaea",
        "local_name": "Tio (Mandinka) / Gerte (Wolof)",
        "family": "Fabaceae (Legume)",
        "role": "Cash crop & legume staple",
        "duration_days": (90, 110),
        "water_need_mm": (450, 600),
        "drought_tolerance": "Moderate",
        "min_ph": 5.0,
        "max_ph": 6.8,
        "nitrogen_contribution_kg_ha": 25.0,
        "soil_health_rating": 65,  # Moderate: fixes N, but loose soil during lifting can accelerate erosion
        "food_security_rating": 75,
        "income_rating": 88,
        "labour_demand": "High (harvest lifting, stripping, curing)",
        "continuous_crop_risk": "High (Cercospora leaf spot, rosette virus, aflatoxin in storage)",
        "notes": "Dominant cash crop in The Gambia. Tolerates sandy soils well; harvest requires timely lifting before soil bakes hard."
    },
    "Early Millet": {
        "scientific_name": "Pennisetum glaucum",
        "local_name": "Souna (Mandinka/Wolof)",
        "family": "Poaceae (Cereal)",
        "role": "Primary hunger-breaker staple cereal",
        "duration_days": (75, 90),
        "water_need_mm": (350, 500),
        "drought_tolerance": "Very High",
        "min_ph": 5.0,
        "max_ph": 7.2,
        "nitrogen_contribution_kg_ha": -45.0,  # Feeder
        "soil_health_rating": 70,  # Fibrous roots bind sandy soil; leaves stover residue
        "food_security_rating": 95,
        "income_rating": 60,
        "labour_demand": "Moderate (bird scaring, threshing)",
        "continuous_crop_risk": "Moderate (Striga weed build-up)",
        "notes": "Fastest-maturing staple grain (Souna). Harvested in September to relieve the hungry season (lean period)."
    },
    "Sorghum": {
        "scientific_name": "Sorghum bicolor",
        "local_name": "Kinto / Basso (Mandinka) / Kinto (Wolof)",
        "family": "Poaceae (Cereal)",
        "role": "Drought-resilient grain and high-biomass fodder",
        "duration_days": (95, 120),
        "water_need_mm": (400, 550),
        "drought_tolerance": "Very High",
        "min_ph": 5.0,
        "max_ph": 7.5,
        "nitrogen_contribution_kg_ha": -50.0,
        "soil_health_rating": 75,  # Substantial root biomass and dense stover
        "food_security_rating": 85,
        "income_rating": 65,
        "labour_demand": "Moderate",
        "continuous_crop_risk": "Moderate",
        "notes": "Excellent subsoil exploration; tolerates temporary waterlogging or dry spells; stover provides dry-season animal feed."
    },
    "Cowpea": {
        "scientific_name": "Vigna unguiculata",
        "local_name": "Sosso (Mandinka) / Niébé (Wolof)",
        "family": "Fabaceae (Legume)",
        "role": "Fast-maturing protein pulse, soil-improver & green manure",
        "duration_days": (65, 80),
        "water_need_mm": (300, 450),
        "drought_tolerance": "High",
        "min_ph": 5.2,
        "max_ph": 7.0,
        "nitrogen_contribution_kg_ha": 45.0,  # Substantial net N fixation
        "soil_health_rating": 90,  # Rapid canopy cover protects soil; high N fixation
        "food_security_rating": 85,
        "income_rating": 75,
        "labour_demand": "Low to Moderate",
        "continuous_crop_risk": "Low to Moderate (pod borer Maruca vitrata)",
        "notes": "Ideal break crop for groundnut sick soils. Foliage shades out weeds and provides nutritious early food."
    },
    "Maize": {
        "scientific_name": "Zea mays",
        "local_name": "Tubanyo (Mandinka) / Mbay (Wolof)",
        "family": "Poaceae (Cereal)",
        "role": "High-yielding homestead grain (requires fertile soil)",
        "duration_days": (90, 110),
        "water_need_mm": (550, 750),
        "drought_tolerance": "Low",
        "min_ph": 5.8,
        "max_ph": 7.2,
        "nitrogen_contribution_kg_ha": -80.0,
        "soil_health_rating": 50,
        "food_security_rating": 85,
        "income_rating": 70,
        "labour_demand": "Moderate to High",
        "continuous_crop_risk": "High (stem borer, nutrient exhaustion)",
        "notes": "Demands high fertility and steady rainfall. Sensitive to mid-season dry spells during flowering/tasseling."
    },
    "Sesame": {
        "scientific_name": "Sesamum indicum",
        "local_name": "Benniseed (Krio) / Benne (Mandinka)",
        "family": "Pedaliaceae (Oilseed)",
        "role": "Drought-hardy oilseed cash crop",
        "duration_days": (80, 100),
        "water_need_mm": (300, 450),
        "drought_tolerance": "Very High",
        "min_ph": 5.5,
        "max_ph": 7.0,
        "nitrogen_contribution_kg_ha": 0.0,
        "soil_health_rating": 65,
        "food_security_rating": 50,
        "income_rating": 85,
        "labour_demand": "Moderate (careful harvesting to avoid seed shattering)",
        "continuous_crop_risk": "Low",
        "notes": "Thrives in low-moisture environments; valuable cash crop with export market demand in The Gambia."
    },
    "Cassava": {
        "scientific_name": "Manihot esculenta",
        "local_name": "Banyaro (Mandinka) / Mbay (Wolof)",
        "family": "Euphorbiaceae (Tuber)",
        "role": "Perennial drought-reserve food crop",
        "duration_days": (240, 360),
        "water_need_mm": (500, 800),
        "drought_tolerance": "Very High",
        "min_ph": 5.0,
        "max_ph": 6.8,
        "nitrogen_contribution_kg_ha": -40.0,
        "soil_health_rating": 60,
        "food_security_rating": 90,
        "income_rating": 70,
        "labour_demand": "Low during growth, High at harvest",
        "continuous_crop_risk": "Moderate (mosaic virus)",
        "notes": "Underground storage allows flexible harvest timing during hungry gap."
    },
    "Fallow": {
        "scientific_name": "Natural / Cover crop fallow",
        "local_name": "Wula / Kando",
        "family": "Mixed species",
        "role": "Soil biological rest and weed suppression",
        "duration_days": (90, 150),
        "water_need_mm": (200, 400),
        "drought_tolerance": "Very High",
        "min_ph": 4.5,
        "max_ph": 8.0,
        "nitrogen_contribution_kg_ha": 15.0,
        "soil_health_rating": 95,
        "food_security_rating": 0,
        "income_rating": 0,
        "labour_demand": "Very Low",
        "continuous_crop_risk": "None",
        "notes": "Resting soil restores microbial activity and soil structure, but provides no seasonal grain yield."
    }
}


# ==============================================================================
# TIER 2: PROPOSED DECISION RULES (Heuristic Evaluators)
# ==============================================================================

def evaluate_crop_history_health(history: List[str], intercropping: bool = False) -> Dict[str, Any]:
    """
    Evaluates the past 3 seasons of crop history.
    
    IMPORTANT: Repeated legumes are NEVER automatically disqualified.
    Instead, contextual risk warnings and score adjustments are assigned.
    """
    legume_count = sum(1 for c in history if CROPS_DATABASE.get(c, {}).get("family", "").startswith("Fabaceae"))
    cereal_count = sum(1 for c in history if CROPS_DATABASE.get(c, {}).get("family", "").startswith("Poaceae"))
    
    warnings = []
    advisories = []
    soil_health_baseline = 75
    
    # Check for consecutive groundnut
    consecutive_groundnut = (
        len(history) >= 2 and history[-1] == "Groundnut" and history[-2] == "Groundnut"
    )
    three_year_groundnut = (
        len(history) == 3 and all(c == "Groundnut" for c in history)
    )
    
    if three_year_groundnut:
        if intercropping:
            advisories.append(
                "Field has been in Groundnut for 3 consecutive seasons. Intercropping has helped "
                "mitigate pathogen pressure, but a full cereal or cowpea break is strongly advised."
            )
            soil_health_baseline = 55
        else:
            warnings.append(
                "Field has experienced 3 consecutive years of Groundnut monoculture. High risk of "
                "Cercospora leaf spot, root rot, and depleted boron/molybdenum. A non-legume or cowpea break is critical."
            )
            soil_health_baseline = 45
    elif consecutive_groundnut:
        if intercropping:
            advisories.append(
                "Consecutive groundnut detected with intercropping. Moderate pathogen risk; rotate with cereal."
            )
            soil_health_baseline = 65
        else:
            advisories.append(
                "Two consecutive seasons of Groundnut. Elevated fungal leaf spot and nematode risk. "
                "Rotating with Souna millet or Sorghum is recommended to disrupt the pest cycle."
            )
            soil_health_baseline = 55
            
    # Check for uninterrupted cereal monoculture (Striga risk)
    if cereal_count == 3:
        warnings.append(
            "Three consecutive seasons of cereals increase vulnerability to parasitic Striga weed "
            "(Striga hermonthica) and soil nitrogen depletion. A nitrogen-fixing legume break is urgently recommended."
        )
        soil_health_baseline = 48

    return {
        "legume_count": legume_count,
        "cereal_count": cereal_count,
        "warnings": warnings,
        "advisories": advisories,
        "soil_health_baseline": soil_health_baseline
    }


def check_hard_constraints(
    candidate_crop: str,
    constraints: Dict[str, Any],
    environmental_features: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Performs hard-constraint validation before scoring.
    Returns feasibility status, passed boolean, and explanatory reasons.
    """
    crop_info = CROPS_DATABASE.get(candidate_crop, {})
    if not crop_info:
        return {"feasible": False, "status": "Rejected", "reason": f"Unknown crop: {candidate_crop}"}
        
    water_source = constraints.get("water_source", "Rain-fed only")
    budget_level = constraints.get("budget_level", "Moderate")
    
    # 1. Water Feasibility
    dry_spell_max = environmental_features.get("dry_spell_max_days", {}).get("value")
    dry_spell_ge7d = environmental_features.get("dry_spells_ge7d", {}).get("value")
    
    # Maize under rain-fed conditions with dry spells >= 7 days
    if candidate_crop == "Maize" and water_source == "Rain-fed only":
        if dry_spell_ge7d is not None and dry_spell_ge7d > 0:
            return {
                "feasible": True,
                "status": "Conditional",
                "reason": (
                    "Maize is susceptible to water stress during the July-Sept flowering window. "
                    "Under rain-fed conditions with historical >7d dry spells, yield variability is high. "
                    "Planting in homestead plots or intercropping with cowpea is recommended."
                )
            }
            
    # 2. Budget Feasibility
    if budget_level == "Low / Minimal input":
        if candidate_crop == "Maize":
            return {
                "feasible": True,
                "status": "Conditional",
                "reason": "Hybrid maize requires mineral fertilizer (NPK/Urea) to perform. Under minimal budget, Early Millet or Sorghum provides higher reliability."
            }

    return {"feasible": True, "status": "Passed", "reason": "Crop satisfies environmental and resource constraints."}


# ==============================================================================
# TIER 3: EXPERT VALIDATION FLAGS
# ==============================================================================
EXPERT_VALIDATION_NOTES = [
    "Verify local cowpea variety response to sandy loam soils with pH 5.2 - 5.4.",
    "Extension officers should inspect the field for Striga weed seedbank presence prior to cereal planting.",
    "Validate certified seed germination rate at the local Brikama agricultural station before planting.",
    "Verify labour availability for peak harvest stripping during late October."
]
