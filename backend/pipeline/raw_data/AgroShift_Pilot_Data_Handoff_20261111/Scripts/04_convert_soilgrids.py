
import csv
from pathlib import Path

source = Path("data/SoilGrids/pilot_soilgrids.csv")
output = Path("data/SoilGrids/pilot_soilgrids_converted.csv")

FACTORS = {
    "phh2o": 10,
    "soc": 10,
    "clay": 10,
    "sand": 10,
    "nitrogen": 100,
    "bdod": 100,
}

UNITS = {
    "phh2o": "pH",
    "soc": "g/kg",
    "clay": "%",
    "sand": "%",
    "nitrogen": "g/kg",
    "bdod": "kg/dm3",
}

with source.open("r", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

converted = []

for row in rows:
    prop = row["property"]
    raw = float(row["raw_value"])
    factor = FACTORS[prop]

    converted.append({
        "property": prop,
        "depth": row["depth"],
        "raw_value": raw,
        "converted_value": round(raw / factor, 4),
        "unit": UNITS[prop],
        "quantile": row["quantile"],
        "coverage_id": row["coverage_id"],
        "latitude": 13.24890667,
        "longitude": -16.61527333,
        "source": "ISRIC SoilGrids 2.0",
    })

with output.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=list(converted[0].keys())
    )
    writer.writeheader()
    writer.writerows(converted)

print("=" * 55)
print("AGROSHIFT SOILGRIDS CONVERSION")
print("=" * 55)
print("Input rows:", len(rows))
print("Converted rows:", len(converted))
print("Output:", output)

if len(converted) == 24:
    print("SUCCESS: All 24 values converted.")
else:
    print("WARNING: Expected 24 rows.")

print("=" * 55)
