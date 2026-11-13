
"""
AGROSHIFT GAMBIA
SMAP L4 SOIL MOISTURE DOWNLOAD

Product: SPL4SMGP Version 008

Variables:
- sm_surface: 0-5 cm soil moisture
- sm_rootzone: 0-100 cm soil moisture

Sampling:
- July to October
- 2015 to 2025
- One representative granule per month
- Target: 15th of each month, closest to 12:00 UTC

Output:
data/SMAP_midmonth/
"""

import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import earthaccess
from requests.exceptions import RequestException


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

LATITUDE = 13.24890667
LONGITUDE = -16.61527333

START_YEAR = 2015
END_YEAR = 2025

PRODUCT = "SPL4SMGP"
VERSION = "008"

LAT_MIN = LATITUDE - 0.05
LAT_MAX = LATITUDE + 0.05

LON_MIN = LONGITUDE - 0.05
LON_MAX = LONGITUDE + 0.05

# Separate directory to preserve previous downloads
OUTPUT_DIR = Path("data/SMAP_midmonth")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HARMONY_URL = (
    "https://harmony.earthdata.nasa.gov/"
    "SPL4SMGP/ogc-api-coverages/1.0.0/"
    "collections/parameter_vars/coverage/rangeset"
)

VARIABLES = {
    "surface": "Geophysical_Data/sm_surface",
    "rootzone": "Geophysical_Data/sm_rootzone",
}

VALID_SIGNATURES = (
    b"CDF\x01",
    b"CDF\x02",
    b"\x89HDF\r\n\x1a\n",
)


# --------------------------------------------------
# AUTHENTICATION
# --------------------------------------------------

print("=" * 55)
print("AGROSHIFT GAMBIA")
print("SMAP L4 SOIL MOISTURE DOWNLOAD")
print("=" * 55)

print("\nLogging in using saved NASA Earthdata credentials...")

earthaccess.login(strategy="netrc", persist=True)
session = earthaccess.get_requests_https_session()

print("Earthdata authentication successful.")


# --------------------------------------------------
# FILE VALIDATION
# --------------------------------------------------

def is_valid_file(file_path):

    if not file_path.exists():
        return False

    if file_path.stat().st_size < 1000:
        return False

    try:
        with open(file_path, "rb") as file:
            header = file.read(8)

        return header.startswith(VALID_SIGNATURES)

    except OSError:
        return False


# --------------------------------------------------
# GRANULE SELECTION
# --------------------------------------------------

def select_midmonth_granule(year, month):

    target_date = datetime(year, month, 15)

    # Search only the target day
    next_date = target_date + timedelta(days=1)

    start_date = target_date.strftime("%Y-%m-%d")
    end_date = next_date.strftime("%Y-%m-%d")

    print("\nSearching for representative granule:")
    print("Target date:", start_date)
    print("Target time: 12:00 UTC")

    granules = earthaccess.search_data(
        short_name=PRODUCT,
        version=VERSION,
        temporal=(start_date, end_date),
        bounding_box=(
            LON_MIN,
            LAT_MIN,
            LON_MAX,
            LAT_MAX,
        ),
        count=20,
    )

    if not granules:
        print("No granules found for this date.")
        return None

    candidates = []

    for granule in granules:

        links = granule.data_links()

        if not links:
            continue

        h5_links = [
            link for link in links
            if ".h5" in urlparse(link).path.lower()
        ]

        if not h5_links:
            continue

        granule_name = Path(
            urlparse(h5_links[0]).path
        ).name

        match = re.search(
            r"(\d{8}T\d{6})",
            granule_name
        )

        if not match:
            continue

        timestamp = datetime.strptime(
            match.group(1),
            "%Y%m%dT%H%M%S"
        )

        # Compare each granule timestamp with noon UTC
        target_time = target_date.replace(
            hour=12,
            minute=0,
            second=0
        )

        difference = abs(
            (timestamp - target_time).total_seconds()
        )

        candidates.append(
            (difference, timestamp, granule_name)
        )

    if not candidates:
        print("No usable granule timestamps found.")
        return None

    candidates.sort(key=lambda item: item[0])

    difference, timestamp, granule_name = candidates[0]

    print("Selected granule:", granule_name)
    print("Actual timestamp:", timestamp.isoformat(), "UTC")
    print(
        "Difference from target:",
        round(difference / 3600, 2),
        "hours"
    )

    return granule_name


# --------------------------------------------------
# HARMONY DOWNLOAD
# --------------------------------------------------

def download_subset(granule_name, year, month):

    for label, variable in VARIABLES.items():

        target_file = OUTPUT_DIR / (
            f"SMAP_{year}_{month:02d}_{label}.nc"
        )

        if is_valid_file(target_file):
            print("ALREADY VERIFIED:", target_file)
            continue

        params = [
            ("granuleName", granule_name),
            ("subset", f"lat({LAT_MIN}:{LAT_MAX})"),
            ("subset", f"lon({LON_MIN}:{LON_MAX})"),
            ("variable", variable),
            ("format", "application/netcdf"),
        ]

        success = False

        for attempt in range(1, 4):

            print(
                f"\nDownloading {label} soil moisture "
                f"(attempt {attempt}/3)"
            )

            try:

                response = session.get(
                    HARMONY_URL,
                    params=params,
                    timeout=(45, 600),
                    allow_redirects=True,
                )

                if response.status_code != 200:

                    print("HTTP STATUS:", response.status_code)
                    print("NASA ERROR:", response.text[:2000])

                    response.raise_for_status()

                content = response.content

                if not content.startswith(VALID_SIGNATURES):

                    print("Invalid NetCDF/HDF5 response.")
                    print("CONTENT TYPE:",
                          response.headers.get("Content-Type"))
                    print("RESPONSE:", content[:300])

                    raise RuntimeError(
                        "Invalid Harmony response."
                    )

                temporary_file = target_file.with_suffix(".part")

                with open(temporary_file, "wb") as file:
                    file.write(content)

                temporary_file.replace(target_file)

                print("SAVED:", target_file)
                print(
                    "SIZE:",
                    round(len(content) / 1024, 2),
                    "KB"
                )

                success = True
                break

            except (RequestException, RuntimeError) as error:

                print("REQUEST FAILED:", error)

                if attempt < 3:

                    wait = 20 * (2 ** (attempt - 1))

                    print(
                        f"Retrying in {wait} seconds..."
                    )

                    time.sleep(wait)

        if not success:
            print(
                "FAILED AFTER 3 ATTEMPTS:",
                year,
                month,
                label
            )


# --------------------------------------------------
# MAIN DOWNLOAD PROCESS
# --------------------------------------------------

successful_months = 0
failed_months = []

for year in range(START_YEAR, END_YEAR + 1):

    for month in range(7, 11):

        print("\n" + "=" * 55)
        print(f"PROCESSING {year}-{month:02d}")
        print("=" * 55)

        surface_file = OUTPUT_DIR / (
            f"SMAP_{year}_{month:02d}_surface.nc"
        )

        rootzone_file = OUTPUT_DIR / (
            f"SMAP_{year}_{month:02d}_rootzone.nc"
        )

        # Skip months with both verified variables
        if (
            is_valid_file(surface_file)
            and is_valid_file(rootzone_file)
        ):
            print("Both variables already verified.")
            successful_months += 1
            continue

        try:

            granule_name = select_midmonth_granule(
                year,
                month
            )

            if not granule_name:
                failed_months.append(
                    f"{year}-{month:02d}: no granule"
                )
                continue

            download_subset(
                granule_name,
                year,
                month
            )

            if (
                is_valid_file(surface_file)
                and is_valid_file(rootzone_file)
            ):
                successful_months += 1
            else:
                failed_months.append(
                    f"{year}-{month:02d}: incomplete download"
                )

        except Exception as error:

            print("MONTH ERROR:", error)

            failed_months.append(
                f"{year}-{month:02d}: {error}"
            )


# --------------------------------------------------
# FINAL REPORT
# --------------------------------------------------

print("\n" + "=" * 55)
print("SMAP DOWNLOAD SUMMARY")
print("=" * 55)

print("Expected monthly samples:", 44)
print("Complete monthly samples:", successful_months)
print("Incomplete monthly samples:", len(failed_months))

if failed_months:

    print("\nMONTHS REQUIRING ATTENTION:")

    for item in failed_months:
        print("-", item)

else:

    print("\nAll requested monthly samples downloaded.")

print("\nOUTPUT DIRECTORY:", OUTPUT_DIR)
print("SMAP DOWNLOAD PROCESS FINISHED.")