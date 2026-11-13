import csv
from pathlib import Path
path = Path("data/SMAP_midmonth/smap_pilot_moisture.csv")
with path.open("r", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))
print("=" * 55)
print("SMAP CSV VALIDATION")
print("=" * 55)
months = [(r["year"], r["month"]) for r in rows]
surface = [float(r["surface_soil_moisture_m3_m3"]) for r in rows]
rootzone = [float(r["rootzone_soil_moisture_m3_m3"]) for r in rows]
print("Total records:", len(rows))
print("Unique months:", len(set(months)))
print("Duplicate months:", len(months) - len(set(months)))
print("Surface valid range:", min(surface), "to", max(surface))
print("Root-zone valid range:", min(rootzone), "to", max(rootzone))
print("Surface missing:", sum(not r["surface_soil_moisture_m3_m3"] for r in rows))
print("Root-zone missing:", sum(not r["rootzone_soil_moisture_m3_m3"] for r in rows))
print("Minimum grid distance:", min(float(r["distance_from_pilot_km"]) for r in rows), "km")
print("Maximum grid distance:", max(float(r["distance_from_pilot_km"]) for r in rows), "km")
print("First observation:", rows[0]["year"], rows[0]["month"])
print("Last observation:", rows[-1]["year"], rows[-1]["month"])
expected = {
    (str(year), f"{month:02d}")
    for year in range(2015, 2026)
    for month in (7, 8, 9, 10)
}
print("Expected months complete:", set(months) == expected)
assert len(rows) == 44
assert len(set(months)) == 44
assert set(months) == expected
assert all(0 <= x <= 0.9 for x in surface + rootzone)
print("\nSUCCESS: SMAP CSV passed validation.")
