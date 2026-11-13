def calculate_weighted_score(criteria_scores, weights):
    """
    Calculate a weighted score from validated criteria.

    criteria_scores: dictionary of criterion scores.
    weights: dictionary of criterion weights.

    Missing criteria are excluded, not treated as zero.
    """

    weighted_total = 0
    total_weight = 0

    for criterion, weight in weights.items():
        score = criteria_scores.get(criterion)

        if score is None:
            continue

        if not isinstance(score, (int, float)):
            continue

        if not isinstance(weight, (int, float)) or weight <= 0:
            continue

        weighted_total += score * weight
        total_weight += weight

    if total_weight == 0:
        return None

    return round(weighted_total / total_weight, 2)
