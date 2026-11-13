
# AgroShift Gambia – Decision Engine Contract

## 1. Purpose

The decision engine evaluates environmental and agricultural data for a selected field and produces three possible agricultural strategies.

It translates field-level features into structured recommendations that can be displayed by the AgroShift Gambia interface.

The engine must use transparent, explainable rules rather than unsupported assumptions.

## 2. Input Data

The engine receives field data from the backend API.

Expected input features:

| Feature | Description | Source |
|---|---|---|
| rain_total_mm | Seasonal rainfall information, including ranges and rankings | MERRA-2 and IMERG |
| dry_spell_max_days | Maximum consecutive dry-spell duration | MERRA-2 and IMERG |
| dry_spells_ge7d | Number of dry spells lasting at least seven days | MERRA-2 and IMERG |
| ndvi_cover_nov_jun | Landscape vegetation-cover context | MODIS MOD13Q1 |
| slope_pct | Area-level slope information | SRTM |
| soil_texture | Soil texture information | SoilGrids |
| soc | Soil organic carbon | SoilGrids |
| ph | Soil acidity or alkalinity | SoilGrids |

Each feature should retain its source, resolution, observation period, data type and confidence information.

## 3. Data Validation

Before evaluating a field, the engine must:

- Check whether required features are available.
- Identify missing or invalid values.
- Preserve the original source metadata.
- Avoid treating missing values as zero.
- Distinguish observed, satellite-derived and modelled information.
- Identify conflicting information between datasets.

If important data is missing, the engine must record the limitation rather than inventing a value.

## 4. Strategy Generation

The engine produces three alternative strategies:

### Strategy A
A strategy based on the most suitable conditions identified by the available field data.

### Strategy B
An alternative strategy that considers different field conditions, constraints or management priorities.

### Strategy C
A third alternative that accounts for additional limitations, uncertainty or risk.

The exact agricultural practices must be based on the approved crop knowledge base and reviewed rules.

The engine must not invent crop requirements or present unverified practices as established recommendations.

## 5. Evaluation Criteria

Strategies may be evaluated using:

- Rainfall availability and seasonal distribution.
- Dry-spell frequency and duration.
- Soil texture.
- Soil organic carbon.
- Soil pH.
- Slope and terrain conditions.
- Available vegetation-cover context.
- Data completeness and confidence.

The importance assigned to each criterion must be documented.

Weights should be configurable rather than permanently hardcoded.

## 6. Expected Output

Each field evaluation must return:

- field_id
- strategies
- weights
- constraints
- disclaimer

Each strategy must contain:

- id
- name
- score
- score_range
- confidence
- criteria
- sequence
- why
- evidence
- benefits
- trade_offs
- gaps
- risks_for_local_review

Strategies must use IDs A, B and C.

Scores must not imply scientific certainty. Their meaning and calculation method must be documented.

## 7. Confidence and Uncertainty

The engine must communicate uncertainty clearly.

Confidence should consider:

- Data availability.
- Data quality.
- Source agreement.
- Spatial resolution.
- Relevance of the data to the selected field.
- Strength of the supporting agricultural rules.

Missing or conflicting information must lower confidence where relevant.

The engine must not assign high confidence simply because a strategy has a high score.

## 8. Evidence and Explainability

Every strategy must explain why it was generated.

Evidence should identify the feature, value or range, source and relevant interpretation supporting the strategy.

The system should make it possible for users and reviewers to understand how a recommendation was reached.

## 9. Important Technical Restrictions

- Rainfall sources must be compared using ranges and rankings where appropriate.
- Do not make unsupported absolute rainfall claims.
- Dry-spell calculations must use the July–September period specified in the technical plan.
- NDVI must represent landscape vegetation-cover context, not direct crop stress.
- SoilGrids and SRTM data must be treated as area-level context.
- Rainfall-based strategy evidence must not exceed medium confidence under the project rules.
- Missing data must never silently become zero.

## 10. Integration

The intended system flow is:

1. The data pipeline produces processed field features.
2. The backend provides the features through the API.
3. The decision engine validates and evaluates the input.
4. The engine returns three structured strategies.
5. The frontend displays the strategies, evidence, benefits, trade-offs and limitations.

The engine should be independent of the user interface.

## 11. Review and Disclaimer

All strategies are decision-support suggestions, not guaranteed agricultural outcomes.

Farmers and local agricultural experts must review recommendations before implementation.

The engine must clearly communicate missing information, uncertainty and risks requiring local review.

## 12. Current Development Status

The current API uses demonstration data.

The decision engine has not yet been integrated with validated pipeline data.

Rules, scoring weights and crop-specific recommendations remain subject to team agreement and agricultural review.
