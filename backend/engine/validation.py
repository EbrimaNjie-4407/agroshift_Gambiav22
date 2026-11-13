def validate_field_data(field_data):
    """
    Check whether field data has the required structure.
    Missing values are not treated as zero.
    """

    errors = []

    if not isinstance(field_data, dict):
        return ["Field data must be a dictionary."]

    if not field_data.get("field_id"):
        errors.append("Missing field_id.")

    if not isinstance(field_data.get("features"), dict):
        errors.append("Missing or invalid features.")

    if not isinstance(field_data.get("location"), dict):
        errors.append("Missing or invalid location.")

    if errors:
        return errors

    required_features = [
        "rain_total_mm",
        "dry_spell_max_days",
        "dry_spells_ge7d",
        "ndvi_cover_nov_jun",
        "slope_pct",
        "soil_texture",
        "soc",
        "ph"
    ]

    features = field_data["features"]

    for feature in required_features:
        if feature not in features:
            errors.append(f"Missing feature: {feature}")

    return errors


def validate_evaluation_input(payload: dict) -> list[str]:
    """
    Validates farmer evaluation payload structure.
    Checks field_id, crop_history (3 seasons), priorities, and constraints.
    Missing values are not converted to zero.
    """
    errors = []
    if not isinstance(payload, dict):
        return ["Payload must be a dictionary."]

    if not payload.get("field_id"):
        errors.append("Missing field_id in evaluation payload.")

    history = payload.get("crop_history")
    if not isinstance(history, dict):
        errors.append("crop_history must be a dictionary with season_1, season_2, and season_3.")
    else:
        for s in ["season_1", "season_2", "season_3"]:
            if not history.get(s):
                errors.append(f"Missing {s} in crop_history.")

    priorities = payload.get("priorities")
    if not isinstance(priorities, dict):
        errors.append("priorities must be a dictionary of priority weights.")

    constraints = payload.get("constraints")
    if not isinstance(constraints, dict):
        errors.append("constraints must be a dictionary.")

    return errors

