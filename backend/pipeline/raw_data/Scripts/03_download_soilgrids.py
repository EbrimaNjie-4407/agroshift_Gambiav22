
"""
AGROSHIFT GAMBIA
SOILGRIDS DATA EXTRACTION

Pilot: Manduar
Coordinates: 13.24890667, -16.61527333

Source: ISRIC SoilGrids WCS 2.0.1
Prediction: Q0.5 (median)
Depths: 0-5, 5-15, 15-30, 30-60 cm

Uses requests and Pillow.
No NumPy or pandas.
"""

import csv
import json
import math
import sys
import time
from pathlib import Path

try:
    import requests
    from PIL import Image
except ImportError as exc:
    print("MISSING LIBRARY:", exc)
    print("Install with:")
    print(".\\.venv\\Scripts\\python.exe -m pip install requests Pillow")
    sys.exit(1)


# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------

LATITUDE = 13.24890667
LONGITUDE = -16.61527333

BASE_URL = "https://maps.isric.org/mapserv"

EPSG_4326 = (
    "http://www.opengis.net/def/crs/EPSG/0/4326"
)

PROPERTIES = {
    "phh2o": "Soil pH in water",
    "soc": "Soil organic carbon",
    "clay": "Clay content",
    "sand": "Sand content",
    "nitrogen": "Total nitrogen",
    "bdod": "Bulk density",
}

DEPTHS = [
    "0-5cm",
    "5-15cm",
    "15-30cm",
    "30-60cm",
]

QUANTILE = "Q0.5"

# Small geographic window around the pilot point.
HALF_WIDTH = 0.0015

OUTPUT_DIR = Path("data") / "SoilGrids"
RAW_DIR = OUTPUT_DIR / "raw"

CSV_OUTPUT = OUTPUT_DIR / "pilot_soilgrids.csv"
JSON_OUTPUT = OUTPUT_DIR / "metadata.json"

TIMEOUT = 120


# ---------------------------------------------------------
# DIRECTORY SETUP
# ---------------------------------------------------------

RAW_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------
# GEO TIFF PIXEL EXTRACTION
# ---------------------------------------------------------

def extract_pilot_pixel(tiff_path):
    """
    Read the GeoTIFF and identify the pixel containing
    the pilot coordinate using GeoTIFF georeferencing.
    """

    with Image.open(tiff_path) as image:

        tags = image.tag_v2

        pixel_scale = tags.get(33550)
        tiepoints = tags.get(33922)
        nodata = tags.get(42113)

        if not pixel_scale or not tiepoints:
            raise ValueError(
                "GeoTIFF georeferencing tags are missing."
            )

        scale_x = float(pixel_scale[0])
        scale_y = float(pixel_scale[1])

        # First tiepoint:
        # raster_i, raster_j, raster_k, model_x, model_y, model_z
        tie = tiepoints

        raster_i = float(tie[0])
        raster_j = float(tie[1])
        model_x = float(tie[3])
        model_y = float(tie[4])

        if scale_x == 0 or scale_y == 0:
            raise ValueError("Invalid GeoTIFF pixel scale.")

        # Convert pilot coordinate into raster column/row.
        col = math.floor(
            raster_i + (LONGITUDE - model_x) / scale_x
        )

        row = math.floor(
            raster_j + (model_y - LATITUDE) / scale_y
        )

        width, height = image.size

        if not (0 <= col < width and 0 <= row < height):
            raise ValueError(
                f"Pilot pixel outside downloaded image: "
                f"row={row}, col={col}, "
                f"image={width}x{height}"
            )

        value = image.getpixel((col, row))

        if isinstance(value, tuple):
            if len(value) != 1:
                raise ValueError(
                    f"Unexpected multi-band TIFF: {value}"
                )
            value = value[0]

        value = float(value)

        if nodata is not None:
            nodata_value = float(str(nodata).strip())

            if value == nodata_value:
                raise ValueError("Pilot pixel contains NoData.")

        if not math.isfinite(value):
            raise ValueError("Pilot pixel is not a finite value.")

        return {
            "raw_value": value,
            "pixel_row": row,
            "pixel_col": col,
            "image_width": width,
            "image_height": height,
            "pixel_scale_x": scale_x,
            "pixel_scale_y": scale_y,
        }


# ---------------------------------------------------------
# DOWNLOAD ONE SOILGRID COVERAGE
# ---------------------------------------------------------

def download_coverage(property_name, depth):

    coverage_id = (
        f"{property_name}_{depth}_{QUANTILE}"
    )

    output_file = RAW_DIR / f"{coverage_id}.tif"

    url = (
        f"{BASE_URL}?map=/map/{property_name}.map"
    )

    west = LONGITUDE - HALF_WIDTH
    east = LONGITUDE + HALF_WIDTH
    south = LATITUDE - HALF_WIDTH
    north = LATITUDE + HALF_WIDTH

    params = [
        ("SERVICE", "WCS"),
        ("VERSION", "2.0.1"),
        ("REQUEST", "GetCoverage"),
        ("COVERAGEID", coverage_id),
        ("FORMAT", "image/tiff"),
        ("SUBSET", f"long({west},{east})"),
        ("SUBSET", f"lat({south},{north})"),
        ("SUBSETTINGCRS", EPSG_4326),
        ("OUTPUTCRS", EPSG_4326),
    ]

    response = requests.get(
        url,
        params=params,
        timeout=TIMEOUT,
    )

    response.raise_for_status()

    content_type = response.headers.get(
        "Content-Type", ""
    ).lower()

    if "image" not in content_type and not response.content.startswith(
        (b"II*\x00", b"MM\x00*")
    ):
        raise ValueError(
            f"Server did not return a TIFF for {coverage_id}. "
            f"Content-Type: {content_type}. "
            f"Response: {response.text[:500]}"
        )

    if len(response.content) < 100:
        raise ValueError(
            f"Downloaded file is unexpectedly small: {coverage_id}"
        )

    output_file.write_bytes(response.content)

    result = extract_pilot_pixel(output_file)

    return {
        "property": property_name,
        "property_description": PROPERTIES[property_name],
        "depth": depth,
        "coverage_id": coverage_id,
        "quantile": QUANTILE,
        "raw_value": result["raw_value"],
        "pixel_row": result["pixel_row"],
        "pixel_col": result["pixel_col"],
        "image_width": result["image_width"],
        "image_height": result["image_height"],
        "tiff_file": str(output_file),
        "file_size_bytes": len(response.content),
    }


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():

    print("=" * 65)
    print("AGROSHIFT GAMBIA")
    print("SOILGRIDS DATA COLLECTION")
    print("=" * 65)

    print(f"Pilot latitude:  {LATITUDE}")
    print(f"Pilot longitude: {LONGITUDE}")
    print(f"Prediction:      {QUANTILE}")
    print(f"Properties:      {len(PROPERTIES)}")
    print(f"Soil depths:     {len(DEPTHS)}")
    print(f"Expected layers: {len(PROPERTIES) * len(DEPTHS)}")

    print("\nStarting downloads...\n")

    results = []
    failures = []

    total = len(PROPERTIES) * len(DEPTHS)
    completed = 0

    for property_name in PROPERTIES:

        print(f"\nPROPERTY: {property_name}")
        print("-" * 50)

        for depth in DEPTHS:

            completed += 1
            coverage_id = (
                f"{property_name}_{depth}_{QUANTILE}"
            )

            print(
                f"[{completed}/{total}] "
                f"Downloading {coverage_id}..."
            )

            try:
                result = download_coverage(
                    property_name,
                    depth,
                )

                results.append(result)

                print(
                    "  SUCCESS | "
                    f"Raw value: {result['raw_value']} | "
                    f"Pixel: ({result['pixel_row']}, "
                    f"{result['pixel_col']}) | "
                    f"File: {result['file_size_bytes']} bytes"
                )

            except Exception as exc:

                failures.append({
                    "coverage_id": coverage_id,
                    "error": str(exc),
                })

                print(f"  FAILED: {exc}")

            time.sleep(0.5)

    # -----------------------------------------------------
    # SAVE CSV
    # -----------------------------------------------------

    if results:

        fieldnames = list(results[0].keys())

        with open(
            CSV_OUTPUT,
            "w",
            newline="",
            encoding="utf-8",
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=fieldnames,
            )

            writer.writeheader()
            writer.writerows(results)

    # -----------------------------------------------------
    # SAVE METADATA
    # -----------------------------------------------------

    metadata = {
        "project": "AgroShift Gambia",
        "source": "ISRIC SoilGrids WCS 2.0.1",
        "pilot_latitude": LATITUDE,
        "pilot_longitude": LONGITUDE,
        "prediction_quantile": QUANTILE,
        "properties": PROPERTIES,
        "depths": DEPTHS,
        "expected_layers": total,
        "successful_layers": len(results),
        "failed_layers": len(failures),
        "results": results,
        "failures": failures,
        "interpretation": (
            "Values are raw SoilGrids GeoTIFF pixel values. "
            "Apply property-specific scale factors and units "
            "before scientific interpretation."
        ),
        "resolution_note": (
            "SoilGrids predictions are approximately 250m "
            "resolution and are not field laboratory measurements."
        ),
    }

    with open(
        JSON_OUTPUT,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=4,
        )

    # -----------------------------------------------------
    # FINAL REPORT
    # -----------------------------------------------------

    print("\n" + "=" * 65)
    print("SOILGRIDS DOWNLOAD REPORT")
    print("=" * 65)

    print(f"Expected layers:   {total}")
    print(f"Successful layers: {len(results)}")
    print(f"Failed layers:     {len(failures)}")

    print(f"\nCSV output:  {CSV_OUTPUT}")
    print(f"JSON output: {JSON_OUTPUT}")
    print(f"TIFF files:  {RAW_DIR}")

    if failures:
        print("\nFAILED COVERAGES:")
        for failure in failures:
            print(
                f"- {failure['coverage_id']}: "
                f"{failure['error']}"
            )

    if len(results) == total:
        print("\nALL SOILGRIDS LAYERS DOWNLOADED AND EXTRACTED.")
    else:
        print("\nDOWNLOAD INCOMPLETE. REVIEW FAILED COVERAGES.")

    print("=" * 65)


if __name__ == "__main__":
    main()
