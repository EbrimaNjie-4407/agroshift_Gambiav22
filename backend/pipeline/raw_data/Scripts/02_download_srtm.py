"""
AGROSHIFT GAMBIA
SRTM ELEVATION DOWNLOAD

Source: SRTM 1 Arc-Second Global
Resolution: Approximately 30 metres
Output: Elevation sample CSV
"""

import csv
import gzip
import math
import struct
import urllib.request
from pathlib import Path

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

LATITUDE = 13.24890667
LONGITUDE = -16.61527333

OUTPUT_DIR = Path("data/SRTM")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Determine the SRTM tile name.
south = math.floor(LATITUDE)
west = math.floor(LONGITUDE)

north = south + 1
east = west + 1

tile_name = (
    f"N{south:02d}W{abs(west):03d}.hgt"
)

tile_url = (
    "https://s3.amazonaws.com/elevation-tiles-prod/"
    f"skadi/N{south:02d}/"
    f"{tile_name}.gz"
)

compressed_file = OUTPUT_DIR / f"{tile_name}.gz"
hgt_file = OUTPUT_DIR / tile_name
csv_file = OUTPUT_DIR / "pilot_elevation_samples.csv"

# --------------------------------------------------
# DOWNLOAD
# --------------------------------------------------

if not hgt_file.exists():

    print("Downloading SRTM tile:", tile_name)

    urllib.request.urlretrieve(
        tile_url,
        compressed_file,
    )

    print("Extracting elevation tile...")

    with gzip.open(compressed_file, "rb") as source:
        with open(hgt_file, "wb") as destination:
            destination.write(source.read())

    compressed_file.unlink()

else:
    print("SRTM tile already exists.")

# --------------------------------------------------
# READ HGT DATA
# --------------------------------------------------

with open(hgt_file, "rb") as file:
    raw_data = file.read()

expected_size = 3601 * 3601 * 2

if len(raw_data) != expected_size:
    raise ValueError(
        f"Unexpected HGT file size: {len(raw_data)} bytes"
    )

GRID_SIZE = 3601

# Pixel location inside the tile.
row = int(round((north - LATITUDE) * 3600))
col = int(round((LONGITUDE - west) * 3600))

row = max(0, min(3600, row))
col = max(0, min(3600, col))

def get_elevation(r, c):
    if not (0 <= r < GRID_SIZE and 0 <= c < GRID_SIZE):
        return None

    index = (r * GRID_SIZE + c) * 2

    value = struct.unpack(
        ">h",
        raw_data[index:index + 2],
    )[0]

    if value == -32768:
        return None

    return value

# --------------------------------------------------
# EXTRACT 3 X 3 NEIGHBOURHOOD
# --------------------------------------------------

records = []

for row_offset in range(-1, 2):

    for col_offset in range(-1, 2):

        r = row + row_offset
        c = col + col_offset

        elevation = get_elevation(r, c)

        sample_lat = north - (r / 3600)
        sample_lon = west + (c / 3600)

        records.append({
            "latitude": sample_lat,
            "longitude": sample_lon,
            "row_offset": row_offset,
            "column_offset": col_offset,
            "elevation_m": elevation,
        })

# --------------------------------------------------
# SAVE CSV
# --------------------------------------------------

with open(
    csv_file,
    "w",
    newline="",
    encoding="utf-8",
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=[
            "latitude",
            "longitude",
            "row_offset",
            "column_offset",
            "elevation_m",
        ],
    )

    writer.writeheader()
    writer.writerows(records)

# --------------------------------------------------
# REPORT
# --------------------------------------------------

pilot_elevation = get_elevation(row, col)

print("\nSRTM DOWNLOAD COMPLETE")
print("Tile:", tile_name)
print("Pilot latitude:", LATITUDE)
print("Pilot longitude:", LONGITUDE)
print("Pilot elevation:", pilot_elevation, "metres")
print("Output:", csv_file)
print("Vertical datum: EGM96")