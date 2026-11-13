
"""
AGROSHIFT GAMBIA
STEP 2: MODIS NDVI TIME SERIES FOR ONE PILOT LOCATION

Source: ORNL DAAC MODIS Web Service
Product: MOD13Q1 (Terra)
Resolution: 250 m
Composite interval: 16 days

Install:
    python -m pip install truststore

Run:
    python modis_ndvi.py

Outputs:
    ndvi_series.csv
    ndvi_usable_by_month.csv
    ndvi_quality_report.txt

Important:
    A 250 m pixel covers approximately 6.25 hectares.
    It is not necessarily equivalent to an individual farm.
"""

# Inject Windows certificate trust before importing urllib.
import truststore
truststore.inject_into_ssl()

import csv
import json
import sys
import time

from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from collections import defaultdict


# ============================================================
# 1. CONFIGURATION
# ============================================================

LAT = 13.24890667
LON = -16.61527333

START = "2015-01-01"
END = "2026-10-31"

PRODUCT = "MOD13Q1"

API = f"https://modis.ornl.gov/rst/api/v1/{PRODUCT}"

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "AgroShift-Gambia/1.0"
}

FILL_VALUE = -3000
SCALE_FACTOR = 0.0001

MAX_RETRIES = 3
TIMEOUT = 180
REQUEST_DELAY = 0.5

NDVI_BAND = "250m_16_days_NDVI"
RELIABILITY_BAND = "250m_16_days_pixel_reliability"

OUTPUT_SERIES = "ndvi_series.csv"
OUTPUT_MONTHLY = "ndvi_usable_by_month.csv"
OUTPUT_REPORT = "ndvi_quality_report.txt"


# ============================================================
# 2. HTTP REQUEST FUNCTION
# ============================================================

def get_json(url, params=None):

    if params:
        url = f"{url}?{urlencode(params)}"

    for attempt in range(1, MAX_RETRIES + 1):

        try:

            request = Request(
                url,
                headers=HEADERS,
                method="GET"
            )

            with urlopen(request, timeout=TIMEOUT) as response:

                content = response.read().decode("utf-8")

                return json.loads(content)

        except HTTPError as error:

            print(
                f"Request attempt {attempt}/{MAX_RETRIES} "
                f"failed: HTTP {error.code}: {error.reason}"
            )

            if error.code in (400, 401, 403, 404):
                raise RuntimeError(
                    f"Server rejected the request: HTTP {error.code}"
                )

        except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:

            print(
                f"Request attempt {attempt}/{MAX_RETRIES} "
                f"failed: {error}"
            )

        if attempt < MAX_RETRIES:
            time.sleep(5)

    raise RuntimeError(f"Unable to retrieve data: {url}")


# ============================================================
# 3. GET AVAILABLE MODIS DATES
# ============================================================

def list_dates():

    print("\nRequesting available MODIS dates...")

    params = {
        "latitude": LAT,
        "longitude": LON
    }

    result = get_json(f"{API}/dates", params)

    if "dates" not in result:
        raise RuntimeError(
            "The MODIS response does not contain a dates field."
        )

    selected_dates = []

    start_date = datetime.strptime(START, "%Y-%m-%d").date()
    end_date = datetime.strptime(END, "%Y-%m-%d").date()

    for item in result["dates"]:

        calendar_date = item.get("calendar_date")
        modis_date = item.get("modis_date")

        if not calendar_date or not modis_date:
            continue

        try:
            parsed_date = datetime.strptime(
                calendar_date[:10],
                "%Y-%m-%d"
            ).date()

        except ValueError:
            continue

        if start_date <= parsed_date <= end_date:

            selected_dates.append({
                "calendar_date": calendar_date[:10],
                "modis_date": modis_date
            })

    selected_dates.sort(
        key=lambda item: item["calendar_date"]
    )

    print(
        f"Available composites: {len(selected_dates)}"
    )

    if not selected_dates:
        raise RuntimeError(
            "No MODIS dates were found in the requested period."
        )

    return selected_dates


# ============================================================
# 4. FETCH A MODIS BAND
# ============================================================

def fetch_band(dates, band):

    observations = {}

    total_chunks = (len(dates) + 9) // 10

    print(f"\nDownloading band: {band}")
    print(f"Requests required: approximately {total_chunks}")

    for start_index in range(0, len(dates), 10):

        chunk = dates[start_index:start_index + 10]

        params = {
            "latitude": LAT,
            "longitude": LON,
            "band": band,
            "startDate": chunk[0]["modis_date"],
            "endDate": chunk[-1]["modis_date"],
            "kmAboveBelow": 0,
            "kmLeftRight": 0
        }

        result = get_json(f"{API}/subset", params)

        if "subset" not in result:
            raise RuntimeError(
                f"Unexpected response for band {band}"
            )

        for item in result["subset"]:

            calendar_date = item.get("calendar_date")
            values = item.get("data", [])

            if not calendar_date or not values:
                continue

            try:
                observations[calendar_date[:10]] = int(values[0])

            except (ValueError, TypeError):
                observations[calendar_date[:10]] = None

        completed = min(start_index + 10, len(dates))

        print(
            f"  Progress: {completed}/{len(dates)} dates"
        )

        time.sleep(REQUEST_DELAY)

    print(
        f"Observations retrieved: {len(observations)}"
    )

    return observations


# ============================================================
# 5. BUILD NDVI TIME SERIES
# ============================================================

def build_series(dates, ndvi_raw, reliability_raw):

    records = []

    for item in dates:

        date = item["calendar_date"]

        raw_ndvi = ndvi_raw.get(date)
        reliability = reliability_raw.get(date)

        ndvi = None

        if raw_ndvi is not None and raw_ndvi != FILL_VALUE:

            ndvi = round(
                raw_ndvi * SCALE_FACTOR,
                4
            )

        # MODIS pixel reliability:
        # 0 = Good data
        # 1 = Marginal data
        # 2 = Snow/ice
        # 3 = Cloudy
        # -1 = No data

        usable = (
            ndvi is not None
            and reliability in (0, 1)
        )

        quality_labels = {
            0: "Good",
            1: "Marginal",
            2: "Snow/Ice",
            3: "Cloudy",
            -1: "No data"
        }

        quality_label = quality_labels.get(
            reliability,
            "Missing/Unknown"
        )

        records.append({

            "date": date,
            "year": date[:4],
            "month": date[:7],
            "modis_date": item["modis_date"],
            "ndvi_raw": raw_ndvi if raw_ndvi is not None else "",
            "ndvi": ndvi if ndvi is not None else "",
            "reliability": reliability if reliability is not None else "",
            "quality_label": quality_label,
            "usable": usable

        })

    return records


# ============================================================
# 6. SAVE NDVI TIME SERIES
# ============================================================

def save_series(records):

    print(f"\nSaving {OUTPUT_SERIES}...")

    fields = [
        "date",
        "year",
        "month",
        "modis_date",
        "ndvi_raw",
        "ndvi",
        "reliability",
        "quality_label",
        "usable"
    ]

    with open(
        OUTPUT_SERIES,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()
        writer.writerows(records)

    print("NDVI time series saved.")


# ============================================================
# 7. MONTHLY DATA AVAILABILITY
# ============================================================

def monthly_summary(records):

    monthly = defaultdict(list)

    for record in records:
        monthly[record["month"]].append(record)

    results = []

    for month in sorted(monthly):

        observations = monthly[month]

        total = len(observations)

        good = sum(
            1 for row in observations
            if row["reliability"] == 0
            and row["ndvi"] != ""
        )

        marginal = sum(
            1 for row in observations
            if row["reliability"] == 1
            and row["ndvi"] != ""
        )

        usable = good + marginal

        missing = sum(
            1 for row in observations
            if row["ndvi"] == ""
            or row["reliability"] == ""
        )

        usable_share = (
            usable / total
            if total else 0
        )

        ndvi_values = [
            float(row["ndvi"])
            for row in observations
            if row["usable"]
        ]

        mean_ndvi = (
            sum(ndvi_values) / len(ndvi_values)
            if ndvi_values else None
        )

        results.append({

            "month": month,
            "total_composites": total,
            "good_observations": good,
            "marginal_observations": marginal,
            "usable_observations": usable,
            "missing_or_unusable": total - usable,
            "missing_data": missing,
            "usable_share": round(usable_share, 4),
            "mean_usable_ndvi": (
                round(mean_ndvi, 4)
                if mean_ndvi is not None else ""
            )

        })

    return results


def save_monthly_summary(results):

    print(f"Saving {OUTPUT_MONTHLY}...")

    fields = [
        "month",
        "total_composites",
        "good_observations",
        "marginal_observations",
        "usable_observations",
        "missing_or_unusable",
        "missing_data",
        "usable_share",
        "mean_usable_ndvi"
    ]

    with open(
        OUTPUT_MONTHLY,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()
        writer.writerows(results)

    print("Monthly summary saved.")


# ============================================================
# 8. QUALITY REPORT
# ============================================================

def save_quality_report(records):

    total = len(records)

    good = sum(
        1 for row in records
        if row["reliability"] == 0
        and row["ndvi"] != ""
    )

    marginal = sum(
        1 for row in records
        if row["reliability"] == 1
        and row["ndvi"] != ""
    )

    cloudy = sum(
        1 for row in records
        if row["reliability"] == 3
    )

    snow = sum(
        1 for row in records
        if row["reliability"] == 2
    )

    missing = sum(
        1 for row in records
        if row["ndvi"] == ""
        or row["reliability"] == ""
    )

    usable = good + marginal

    ndvi_values = [
        float(row["ndvi"])
        for row in records
        if row["usable"]
    ]

    if ndvi_values:

        minimum = min(ndvi_values)
        maximum = max(ndvi_values)
        mean = sum(ndvi_values) / len(ndvi_values)

    else:

        minimum = None
        maximum = None
        mean = None

    percentage = (
        usable / total * 100
        if total else 0
    )

    lines = [

        "AGROSHIFT GAMBIA",
        "MODIS NDVI DATA QUALITY REPORT",
        "=" * 55,

        f"Latitude: {LAT}",
        f"Longitude: {LON}",
        f"Product: {PRODUCT}",
        "Resolution: 250 m",
        "Composite interval: 16 days",
        f"Start date: {START}",
        f"End date: {END}",

        "",

        f"Total composites: {total}",
        f"Good observations: {good}",
        f"Marginal observations: {marginal}",
        f"Usable observations: {usable}",
        f"Cloudy observations: {cloudy}",
        f"Snow/ice observations: {snow}",
        f"Missing or invalid observations: {missing}",
        f"Usable data percentage: {percentage:.2f}%",

        "",

        f"Minimum usable NDVI: {minimum}",
        f"Maximum usable NDVI: {maximum}",
        f"Mean usable NDVI: "
        f"{round(mean, 4) if mean is not None else 'N/A'}",

        "",

        "INTERPRETATION NOTES",
        "- NDVI measures vegetation greenness.",
        "- NDVI is not a direct measurement of crop yield.",
        "- Reliability values 0 and 1 are treated as usable.",
        "- Missing and unreliable observations are not imputed.",
        "- A 250 m pixel covers approximately 6.25 hectares.",
        "- One pixel does not necessarily represent one farm.",
        "- These are satellite observations, not field measurements.",

        "=" * 55

    ]

    with open(
        OUTPUT_REPORT,
        "w",
        encoding="utf-8"
    ) as file:

        file.write("\n".join(lines))

    print(f"Quality report saved: {OUTPUT_REPORT}")


# ============================================================
# 9. PRINT SUMMARY
# ============================================================

def print_summary(records, monthly):

    total = len(records)

    usable = sum(
        1 for row in records
        if row["usable"]
    )

    print("\n" + "=" * 65)
    print("AGROSHIFT GAMBIA")
    print("MODIS NDVI COLLECTION SUMMARY")
    print("=" * 65)

    print(f"Coordinates: {LAT}, {LON}")
    print(f"Product: {PRODUCT}")
    print(f"Total composites: {total}")
    print(f"Usable observations: {usable}")

    if total:
        print(
            f"Usable percentage: {usable / total * 100:.2f}%"
        )

    print("\nMONTHLY VEGETATION SUMMARY")

    print(
        f"{'Month':<12}"
        f"{'Total':<9}"
        f"{'Usable':<9}"
        f"{'Usable %':<11}"
        f"{'Mean NDVI':<12}"
    )

    print("-" * 53)

    for row in monthly:

        mean = row["mean_usable_ndvi"]

        print(
            f"{row['month']:<12}"
            f"{row['total_composites']:<9}"
            f"{row['usable_observations']:<9}"
            f"{row['usable_share'] * 100:<11.1f}"
            f"{str(mean):<12}"
        )

    print("\nOUTPUT FILES")
    print(f"1. {OUTPUT_SERIES}")
    print(f"2. {OUTPUT_MONTHLY}")
    print(f"3. {OUTPUT_REPORT}")

    print("=" * 65)


# ============================================================
# 10. MAIN PROGRAM
# ============================================================

def main():

    print("=" * 55)
    print("AGROSHIFT GAMBIA")
    print("MODIS NDVI DATA COLLECTION")
    print("=" * 55)

    print(f"Coordinates: {LAT}, {LON}")
    print(f"Date range: {START} to {END}")
    print(f"Product: {PRODUCT}")
    print("Resolution: 250 m")
    print("Composite interval: 16 days")

    try:

        print("\nSSL certificate trust: Windows native store")

        # Step 1: Retrieve available dates

        dates = list_dates()

        # Step 2: Retrieve NDVI band

        ndvi_raw = fetch_band(
            dates,
            NDVI_BAND
        )

        # Step 3: Retrieve reliability band

        reliability_raw = fetch_band(
            dates,
            RELIABILITY_BAND
        )

        # Step 4: Build time series

        records = build_series(
            dates,
            ndvi_raw,
            reliability_raw
        )

        # Step 5: Save time series

        save_series(records)

        # Step 6: Calculate monthly summary

        monthly = monthly_summary(records)

        # Step 7: Save monthly summary

        save_monthly_summary(monthly)

        # Step 8: Generate quality report

        save_quality_report(records)

        # Step 9: Display summary

        print_summary(
            records,
            monthly
        )

        print("\nDATA COLLECTION COMPLETED SUCCESSFULLY.")

    except Exception as error:

        print("\nDATA COLLECTION FAILED.")
        print(f"Reason: {error}")

        sys.exit(1)


if __name__ == "__main__":
    main()
