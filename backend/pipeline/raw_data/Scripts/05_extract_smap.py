import csv
import math
import re
from pathlib import Path
from datetime import datetime, timezone
import h5py
# --------------------------------------------------
# PILOT LOCATION
# --------------------------------------------------
PILOT_LAT = 13.24890667
PILOT_LON = -16.61527333
INPUT_DIR = Path("data/SMAP_midmonth")
OUTPUT_CSV = INPUT_DIR / "smap_pilot_moisture.csv"
OUTPUT_REPORT = INPUT_DIR / "smap_extraction_report.txt"
VALID_MIN = 0.0
VALID_MAX = 0.9
FILL_VALUE = -9999.0
def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate great-circle distance in kilometres."""
    radius = 6371.0
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))
def read_text_attribute(value):
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)
def granule_timestamp(h5_file, fallback_name):
    """Read actual granule time from the NASA Filename attribute."""
    filename = read_text_attribute(
        h5_file.attrs.get("Filename", "")
    )
    match = re.search(r"(\d{8}T\d{6})", filename)
    if match:
        return match.group(1), filename
    match = re.search(r"SMAP_(\d{4})_(\d{2})", fallback_name)
    if match:
        return match.group(0), filename
    return "UNKNOWN", filename
def read_smap_file(path, variable):
    with h5py.File(path, "r") as f:
        latitudes = f["cell_lat"][...]
        longitudes = f["cell_lon"][...]
        values = f[variable][...]
        timestamp, granule_name = granule_timestamp(
            f, path.name
        )
        coordinates = []
        for row in range(latitudes.shape[0]):
            for col in range(latitudes.shape[1]):
                lat = float(latitudes[row, col])
                lon = float(longitudes[row, col])
                if not math.isfinite(lat) or not math.isfinite(lon):
                    continue
                if lat == FILL_VALUE or lon == FILL_VALUE:
                    continue
                distance = haversine_km(
                    PILOT_LAT, PILOT_LON, lat, lon
                )
                coordinates.append(
                    (distance, row, col, lat, lon)
                )
        if not coordinates:
            raise ValueError(
                f"No valid grid coordinates in {path}"
            )
        nearest = min(coordinates, key=lambda item: item[0])
        distance, row, col, cell_lat, cell_lon = nearest
        raw_value = float(values[row, col])
        valid = (
            math.isfinite(raw_value)
            and raw_value != FILL_VALUE
            and VALID_MIN <= raw_value <= VALID_MAX
        )
        return {
            "value": raw_value,
            "valid": valid,
            "timestamp": timestamp,
            "granule_name": granule_name,
            "row": row,
            "col": col,
            "cell_lat": cell_lat,
            "cell_lon": cell_lon,
            "distance_km": distance,
            "grid_shape": str(values.shape),
        }
def main():
    if not INPUT_DIR.exists():
        raise FileNotFoundError(
            f"Input directory not found: {INPUT_DIR}"
        )
    surface_files = sorted(
        INPUT_DIR.glob("SMAP_*_surface.nc")
    )
    rootzone_files = sorted(
        INPUT_DIR.glob("SMAP_*_rootzone.nc")
    )
    print("SMAP EXTRACTION")
    print("=" * 55)
    print("Surface files:", len(surface_files))
    print("Root-zone files:", len(rootzone_files))
    if len(surface_files) != 44 or len(rootzone_files) != 44:
        raise ValueError(
            "Expected 44 surface and 44 root-zone files. "
            "Check the input folder before continuing."
        )
    rows = []
    errors = []
    for surface_path in surface_files:
        rootzone_path = INPUT_DIR / surface_path.name.replace(
            "_surface.nc", "_rootzone.nc"
        )
        if not rootzone_path.exists():
            errors.append(
                f"Missing root-zone partner: {rootzone_path.name}"
            )
            continue
        try:
            surface = read_smap_file(
                surface_path,
                "Geophysical_Data/sm_surface"
            )
            rootzone = read_smap_file(
                rootzone_path,
                "Geophysical_Data/sm_rootzone"
            )
            if surface["timestamp"] != rootzone["timestamp"]:
                raise ValueError(
                    "Surface and root-zone granule timestamps differ"
                )
            if (
                surface["row"] != rootzone["row"]
                or surface["col"] != rootzone["col"]
            ):
                raise ValueError(
                    "Surface and root-zone nearest cells differ"
                )
            if (
                abs(surface["cell_lat"] - rootzone["cell_lat"]) > 0.0001
                or abs(surface["cell_lon"] - rootzone["cell_lon"]) > 0.0001
            ):
                raise ValueError(
                    "Surface and root-zone grid coordinates differ"
                )
            date_text = surface_path.name.replace(
                "SMAP_", ""
            ).replace("_surface.nc", "")
            year, month = date_text.split("_")
            rows.append({
                "year": year,
                "month": month,
                "granule_time_utc": surface["timestamp"],
                "pilot_latitude": PILOT_LAT,
                "pilot_longitude": PILOT_LON,
                "grid_cell_latitude": surface["cell_lat"],
                "grid_cell_longitude": surface["cell_lon"],
                "grid_cell_row": surface["row"],
                "grid_cell_column": surface["col"],
                "distance_from_pilot_km": round(
                    surface["distance_km"], 3
                ),
                "surface_soil_moisture_m3_m3": (
                    surface["value"] if surface["valid"] else ""
                ),
                "surface_raw_value": surface["value"],
                "surface_quality": (
                    "valid" if surface["valid"] else "missing_or_invalid"
                ),
                "rootzone_soil_moisture_m3_m3": (
                    rootzone["value"] if rootzone["valid"] else ""
                ),
                "rootzone_raw_value": rootzone["value"],
                "rootzone_quality": (
                    "valid" if rootzone["valid"] else "missing_or_invalid"
                ),
                "surface_source_file": surface_path.name,
                "rootzone_source_file": rootzone_path.name,
            })
            print(
                f"Processed {year}-{month}: "
                f"surface={surface['value']:.5f}, "
                f"rootzone={rootzone['value']:.5f}, "
                f"distance={surface['distance_km']:.2f} km"
            )
        except Exception as exc:
            errors.append(
                f"{surface_path.name}: {type(exc).__name__}: {exc}"
            )
    if rows:
        with OUTPUT_CSV.open(
            "w", newline="", encoding="utf-8-sig"
        ) as f:
            writer = csv.DictWriter(
                f, fieldnames=list(rows[0].keys())
            )
            writer.writeheader()
            writer.writerows(rows)
    valid_surface = sum(
        row["surface_quality"] == "valid" for row in rows
    )
    valid_rootzone = sum(
        row["rootzone_quality"] == "valid" for row in rows
    )
    distances = [
        row["distance_from_pilot_km"] for row in rows
    ]
    report = [
        "NASA SMAP L4 SOIL MOISTURE EXTRACTION REPORT",
        "=" * 55,
        f"Extraction time UTC: {datetime.now(timezone.utc).isoformat()}",
        f"Pilot latitude: {PILOT_LAT}",
        f"Pilot longitude: {PILOT_LON}",
        "Product: SMAP L4_SM Geophysical Data, Version 8.1",
        "Grid: EASE-Grid 2.0, approximately 9 km",
        "Surface variable: sm_surface, 0-5 cm",
        "Root-zone variable: sm_rootzone, 0-100 cm",
        "Units: m3/m3",
        "Valid range: 0.0 to 0.9",
        "Fill value: -9999",
        "Sampling: One mid-month granule per selected month",
        "Important: These are snapshots, not monthly averages.",
        "",
        f"Surface files found: {len(surface_files)}",
        f"Root-zone files found: {len(rootzone_files)}",
        f"Successfully paired and extracted months: {len(rows)}",
        f"Valid surface observations: {valid_surface}",
        f"Valid root-zone observations: {valid_rootzone}",
        f"Extraction errors: {len(errors)}",
    ]
    if distances:
        report.extend([
            f"Nearest-cell distance, minimum: {min(distances):.3f} km",
            f"Nearest-cell distance, maximum: {max(distances):.3f} km",
        ])
    report.extend([
        "",
        "ERROR DETAILS:",
        *(errors if errors else ["None"]),
        "",
        f"Output CSV: {OUTPUT_CSV}",
    ])
    OUTPUT_REPORT.write_text(
        "\n".join(report), encoding="utf-8"
    )
    print("\n" + "=" * 55)
    print("EXTRACTION SUMMARY")
    print("=" * 55)
    print("Months extracted:", len(rows))
    print("Valid surface values:", valid_surface)
    print("Valid root-zone values:", valid_rootzone)
    print("Errors:", len(errors))
    print("CSV:", OUTPUT_CSV)
    print("Report:", OUTPUT_REPORT)
    if errors:
        print("\nERRORS:")
        for error in errors:
            print("-", error)
    if len(rows) != 44 or errors:
        print("\nWARNING: Extraction needs further validation.")
    else:
        print("\nSUCCESS: All 44 monthly pairs processed.")
if __name__ == "__main__":
    main()
