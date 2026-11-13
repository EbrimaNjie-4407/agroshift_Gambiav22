AGROSHIFT GAMBIA
PILOT ENVIRONMENTAL DATA HANDOFF
Generated: 11 November 2026
PILOT LOCATION
Latitude: 13.24890667
Longitude: -16.61527333
Location: Brikama Manduar, The Gambia
1. NASA POWER
Files:
- daily_raw.csv
- annual_features.csv
- missing_days_report.csv
Period: 2015-01-01 to 2026-10-31
Daily records: 4,322
Variables:
- T2M_MAX: maximum temperature
- T2M_MIN: minimum temperature
- PRECTOTCORR: MERRA-2 precipitation
- IMERG_PRECTOT: GPM IMERG precipitation
Rainfall window: 1 June to 31 October
Dry-spell window: 1 July to 30 September
Dry day threshold: precipitation below 1 mm
Dry-spell threshold: at least 7 consecutive days
IMPORTANT:
IMERG has 47 trailing missing days from 2026-09-15
to 2026-10-31. Sixteen of these fall within the
July-September dry-spell window.
Incomplete IMERG seasonal statistics are left blank.
Do not replace missing rainfall with zero.
Use annual_features.csv as the selected UTC feature
dataset. The LST baseline is excluded.
2. MODIS
Product: MOD13Q1
Resolution: 250 metres
Composite interval: 16 days
Observations: 272
Usable observations: 219
Usable percentage: 80.51%
Reliability values 0 and 1 are treated as usable.
Cloudy and unreliable observations are not imputed.
NDVI measures vegetation greenness, not crop yield.
One 250 m pixel covers approximately 6.25 hectares.
The pixel may not represent the whole farm.
3. SMAP
Product: SMAP L4_SM Geophysical Data
Version: 8.1
Grid: EASE-Grid 2.0
Approximate resolution: 9 km
Period: July, August, September and October,
2015-2025
Observations: 44 monthly snapshots
Variables:
- sm_surface: 0-5 cm soil moisture
- sm_rootzone: 0-100 cm soil moisture
Units: m3/m3
Nearest grid-cell distance: 6.168 km
IMPORTANT:
These are mid-month snapshots, not monthly averages.
The nearest grid cell is not located directly on the
pilot field. Do not interpret it as field measurement.
4. SRTM
Tile: N13W017
Approximate resolution: 30 metres
Vertical datum: EGM96
Pilot pixel elevation: 25 metres
Neighbourhood: 3 x 3 pixels
Satellite-derived elevation, not ground survey data.
5. SOILGRIDS
Source: ISRIC SoilGrids WCS 2.0.1
Prediction quantile: Q0.5
Approximate resolution: 250 metres
Properties: pH, SOC, clay, sand, nitrogen, bulk density
Depths: 0-5, 5-15, 15-30, 30-60 cm
Successful extractions: 24 of 24
Values are converted using property-specific scale
factors and units. These are modelled soil predictions,
not laboratory measurements.
No silt fraction was extracted. Do not infer a complete
soil texture classification from sand and clay alone.
GENERAL SCIENTIFIC LIMITATIONS
- All datasets represent different spatial resolutions.
- A single pilot coordinate cannot represent every
  condition across an entire farm.
- Satellite and modelled products are not substitutes
  for local field measurements or farmer knowledge.
- Preserve missing values as missing.
- Preserve source identity and units when integrating
  the datasets.
- Do not combine observations from different spatial
  scales without documenting the method.
PURPOSE
This package supplies environmental inputs for the
AgroShift crop-rotation decision-support prototype.
It does not independently establish crop suitability,
yield, or guaranteed farm outcomes.
