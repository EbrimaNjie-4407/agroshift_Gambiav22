"""AgroShift Gambia - power_features.py v2.1-stdlib
NASA POWER MERRA-2 + GPM IMERG, ONE point.

Standard-library implementation. No pandas, NumPy, or third-party packages.

Run:
    python power_features.py

Outputs:
    daily_raw.csv
    features_by_year.csv
    missing_days_report.csv
    features_by_year_previous.csv (when a previous features_by_year.csv exists)

Scientific methodology retained from the supplied v2.1:
- PRECTOTCORR: NASA POWER AG community, MERRA-2 reanalysis.
- IMERG_PRECTOT: NASA POWER SB community, GPM IMERG.
- Rainfall totals and rainy days: 1 June - 31 October (153 days).
- Dry-spell statistics: 1 July - 30 September (92 days).
- Dry day: daily precipitation < 1.0 mm.
- Count dry spells of at least 7 consecutive days.
- A window statistic is blank if any day in its window is missing.
- No missing precipitation values are filled with zero.
- Temperature values remain in daily_raw.csv, but no temperature-derived
  features are calculated.

Data notes (put these on every chart that uses these numbers):
- PRECTOTCORR: NASA POWER AG community, MERRA-2 reanalysis (MODELLED),
  0.5 x 0.625 deg.
- IMERG_PRECTOT: NASA POWER SB community, GPM IMERG (satellite-based),
  0.1 deg.
- Neither is a field measurement. Both describe the area around the point.
- Dry day = daily precipitation < 1.0 mm (DECISION V-1: citation and local
  suitability still to be confirmed).
"""

import csv
import json
import math
import os
import shutil
import sys
import time
from datetime import date, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LAT, LON = 13.24890667, -16.61527333
START, END = "2015-01-01", "2026-10-31"
REF_FIRST, REF_LAST = 2015, 2025
RAIN_WINDOW = ("06-01", "10-31")
SPELL_WINDOW = ("07-01", "09-30")
DRY_MM = 1.0
SPELL_MIN_DAYS = 7

BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOURCES = [
    ("PRECTOTCORR", "AG", "merra2"),
    ("IMERG_PRECTOT", "SB", "imerg"),
]

DATE_START = date.fromisoformat(START)
DATE_END = date.fromisoformat(END)


# ---------------------------------------------------------------------------
# General helpers
# ---------------------------------------------------------------------------

def date_range(first_day, last_day):
    """Yield every date from first_day through last_day, inclusive."""
    current = first_day
    while current <= last_day:
        yield current
        current += timedelta(days=1)


def parse_power_value(value):
    """Convert a POWER daily value to float; preserve missing values as None."""
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number == -999 or not math.isfinite(number):
        return None
    return number


def csv_value(value):
    """Represent missing values as empty CSV cells."""
    return "" if value is None else value


def rounded(value, digits=1):
    return round(float(value), digits)


# ---------------------------------------------------------------------------
# NASA POWER download
# ---------------------------------------------------------------------------

def power(parameters, community, tries=3):
    """Download daily POWER data and return {date: {parameter: value}}."""
    query = {
        "parameters": ",".join(parameters),
        "community": community,
        "latitude": LAT,
        "longitude": LON,
        "start": START.replace("-", ""),
        "end": END.replace("-", ""),
        "format": "JSON",
"time-standard": "UTC",
    }
    url = BASE + "?" + urlencode(query)
    headers = {"User-Agent": "AgroShift-Gambia/2.1"}

    for attempt in range(tries):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=180) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if community == "SB":
                print("\n--- IMERG API RESPONSE METADATA ---")
                print("\nGEOMETRY:")
                print(json.dumps(payload.get("geometry", {}), indent=2))
                print("Top-level keys:", list(payload.keys()))

                for key in ("header", "messages", "parameters"):
                    print(f"\n{key.upper()}:")
                    print(json.dumps(
                        payload.get(key, {}),
                        indent=2
                    ))

                print("\nPROPERTIES KEYS:")
                print(list(payload.get("properties", {}).keys()))
                print("--- END METADATA ---\n")

            parameter_data = payload["properties"]["parameter"]
            result = {}

            for parameter in parameters:
                values = parameter_data.get(parameter, {})
                for date_text, raw_value in values.items():
                    day = datetime.strptime(date_text, "%Y%m%d").date()
                    result.setdefault(day, {})[parameter] = parse_power_value(
                        raw_value
                    )

            # Explicitly add every date. A missing API date remains None.
            complete = {}
            for day in date_range(DATE_START, DATE_END):
                complete[day] = {
                    parameter: result.get(day, {}).get(parameter)
                    for parameter in parameters
                }
            return complete

        except (HTTPError, URLError, TimeoutError, OSError, ValueError,
                KeyError, TypeError) as error:
            print(
                f"{community} attempt {attempt + 1} failed: {error}",
                file=sys.stderr,
            )
            if attempt + 1 < tries:
                time.sleep(5)

    raise SystemExit(f"POWER request failed for community {community}")


def download_daily_data():
    """Download AG and SB series and combine them by date."""
    ag = power(["T2M_MAX", "T2M_MIN", "PRECTOTCORR"], "AG")
    sb = power(["IMERG_PRECTOT"], "SB")

    daily = {}
    for day in date_range(DATE_START, DATE_END):
        daily[day] = {}
        daily[day].update(ag.get(day, {}))
        daily[day].update(sb.get(day, {}))

    return daily


# ---------------------------------------------------------------------------
# CSV output: daily raw data
# ---------------------------------------------------------------------------

def write_daily_csv(daily, filename="daily_raw.csv"):
    columns = ["date", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "IMERG_PRECTOT"]
    with open(filename, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()
        for day in sorted(daily):
            row = {"date": day.isoformat()}
            for column in columns[1:]:
                row[column] = csv_value(daily[day].get(column))
            writer.writerow(row)


# ---------------------------------------------------------------------------
# Missing-data diagnosis
# ---------------------------------------------------------------------------

def missing_blocks(values_by_date):
    """Return contiguous missing blocks as (first_date, last_date, days)."""
    all_dates = sorted(values_by_date)
    blocks = []
    index = 0

    while index < len(all_dates):
        day = all_dates[index]
        if values_by_date[day] is not None:
            index += 1
            continue

        first = day
        last = day
        count = 1
        index += 1

        while index < len(all_dates):
            next_day = all_dates[index]
            if (
                values_by_date[next_day] is None
                and next_day == last + timedelta(days=1)
            ):
                last = next_day
                count += 1
                index += 1
            else:
                break

        blocks.append((first, last, count))

    return blocks


def diagnose(daily):
    print("\n=== MISSING-DATA DIAGNOSIS ===")
    report = []

    for parameter, community, tag in SOURCES:
        series = {day: daily[day].get(parameter) for day in sorted(daily)}
        valid_dates = [day for day, value in series.items() if value is not None]
        first_valid = min(valid_dates) if valid_dates else None
        last_valid = max(valid_dates) if valid_dates else None
        blocks = missing_blocks(series)
        missing_count = sum(value is None for value in series.values())

        print(
            f"{parameter} ({tag}): first valid {first_valid}, "
            f"last valid {last_valid}, {missing_count} missing days "
            f"in {len(series)}"
        )

        for first, last, count in blocks:
            is_trailing = last == max(series)
            kind = (
                "TRAILING gap (data not yet available for these dates: latency)"
                if is_trailing
                else "INTERNAL gap (data hole inside the record)"
            )
            print(f"    missing {first} to {last} ({count} days): {kind}")
            report.append({
                "series": parameter,
                "source": tag,
                "first_missing": first.isoformat(),
                "last_missing": last.isoformat(),
                "days": count,
                "kind": "trailing" if is_trailing else "internal",
            })

        if not blocks:
            print("    no missing days")

    fields = [
        "series", "source", "first_missing", "last_missing", "days", "kind"
    ]
    with open("missing_days_report.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(report)

    return report


# ---------------------------------------------------------------------------
# Rainfall and dry-spell calculations
# ---------------------------------------------------------------------------

def window(daily, year, window_dates, parameter):
    """Return the date/value pairs for the requested inclusive calendar window."""
    first = date.fromisoformat(f"{year}-{window_dates[0]}")
    last = date.fromisoformat(f"{year}-{window_dates[1]}")
    return [
        (day, daily.get(day, {}).get(parameter))
        for day in date_range(first, last)
    ]


def expected_days(year, window_dates):
    first = date.fromisoformat(f"{year}-{window_dates[0]}")
    last = date.fromisoformat(f"{year}-{window_dates[1]}")
    return (last - first).days + 1


def longest_run(mask):
    best = 0
    current = 0
    for value in mask:
        if value:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def count_runs(mask, minimum_days):
    """Count separate True runs whose lengths are at least minimum_days."""
    runs = 0
    current = 0

    for value in list(mask) + [False]:
        if value:
            current += 1
        else:
            if current >= minimum_days:
                runs += 1
            current = 0

    return runs


def season_features(daily, first_year, last_year):
    rows = []

    for year in range(first_year, last_year + 1):
        rain_expected = expected_days(year, RAIN_WINDOW)
        spell_expected = expected_days(year, SPELL_WINDOW)

        row = {
            "year": year,
            "in_reference_period": REF_FIRST <= year <= REF_LAST,
            "rain_window_days": rain_expected,
            "spell_window_days": spell_expected,
        }
        spell_stats = {}

        for parameter, community, tag in SOURCES:
            rain_values = [
                value for _, value in window(
                    daily, year, RAIN_WINDOW, parameter
                )
            ]
            spell_values = [
                value for _, value in window(
                    daily, year, SPELL_WINDOW, parameter
                )
            ]

            rain_missing = rain_expected - sum(
                value is not None for value in rain_values
            )
            spell_missing = spell_expected - sum(
                value is not None for value in spell_values
            )

            row[f"rain_missing_days_{tag}"] = rain_missing
            row[f"spell_missing_days_{tag}"] = spell_missing

            if rain_missing == 0:
                row[f"rain_total_mm_{tag}"] = rounded(sum(rain_values), 1)
                row[f"rainy_days_{tag}"] = sum(
                    value >= DRY_MM for value in rain_values
                )
            else:
                row[f"rain_total_mm_{tag}"] = None
                row[f"rainy_days_{tag}"] = None

            if spell_missing == 0:
                dry_mask = [value < DRY_MM for value in spell_values]
                longest = longest_run(dry_mask)
                spells_ge7 = count_runs(dry_mask, SPELL_MIN_DAYS)
            else:
                longest = None
                spells_ge7 = None

            row[f"longest_dry_spell_d_{tag}"] = longest
            row[f"dry_spells_ge7d_{tag}"] = spells_ge7
            spell_stats[tag] = (longest, spells_ge7)

        merra = spell_stats["merra2"]
        imerg = spell_stats["imerg"]
        both_available = merra[0] is not None and imerg[0] is not None

        if both_available:
            row["longest_dry_spell_d_min"] = min(merra[0], imerg[0])
            row["longest_dry_spell_d_max"] = max(merra[0], imerg[0])
            row["dry_spells_ge7d_min"] = min(merra[1], imerg[1])
            row["dry_spells_ge7d_max"] = max(merra[1], imerg[1])
        else:
            row["longest_dry_spell_d_min"] = None
            row["longest_dry_spell_d_max"] = None
            row["dry_spells_ge7d_min"] = None
            row["dry_spells_ge7d_max"] = None

        rows.append(row)

    return rows


FEATURE_FIELDS = [
    "year",
    "in_reference_period",
    "rain_window_days",
    "spell_window_days",
    "rain_missing_days_merra2",
    "spell_missing_days_merra2",
    "rain_total_mm_merra2",
    "rainy_days_merra2",
    "longest_dry_spell_d_merra2",
    "dry_spells_ge7d_merra2",
    "rain_missing_days_imerg",
    "spell_missing_days_imerg",
    "rain_total_mm_imerg",
    "rainy_days_imerg",
    "longest_dry_spell_d_imerg",
    "dry_spells_ge7d_imerg",
    "longest_dry_spell_d_min",
    "longest_dry_spell_d_max",
    "dry_spells_ge7d_min",
    "dry_spells_ge7d_max",
]


def write_features_csv(rows, filename="features_by_year.csv"):
    with open(filename, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FEATURE_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                field: csv_value(row.get(field)) for field in FEATURE_FIELDS
            })


# ---------------------------------------------------------------------------
# Independent validation
# ---------------------------------------------------------------------------

def independent_runs(mask):
    """Independent run calculation used by the validation check."""
    run_lengths = []
    current = 0

    for value in list(mask) + [False]:
        if value:
            current += 1
        else:
            if current > 0:
                run_lengths.append(current)
            current = 0

    longest = max(run_lengths) if run_lengths else 0
    qualifying = sum(length >= SPELL_MIN_DAYS for length in run_lengths)
    return longest, qualifying


def read_previous_features(filename):
    previous = {}
    with open(filename, "r", newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        for row in reader:
            try:
                year = int(row["year"])
            except (TypeError, ValueError, KeyError):
                continue
            previous[year] = row
    return previous


def number_or_none(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def validate(features, daily, previous=None):
    print("\n=== VALIDATION ===")
    results = []

    def check(condition, message):
        results.append(bool(condition))
        print(("PASS  " if condition else "FAIL  ") + message)

    feature_columns = list(features[0].keys()) if features else []
    check(
        not any(
            "hot" in column.lower() or "tmax" in column.lower()
            for column in feature_columns
        ),
        "no hot-day / temperature-derived columns in features",
    )

    check(
        all(
            row["rain_window_days"] == 153
            and row["spell_window_days"] == 92
            for row in features
        ),
        "windows: rain 153 days (Jun-Oct), dry spells 92 days (Jul-Sep)",
    )

    for parameter, community, tag in SOURCES:
        bad_missing_counts = 0
        bad_missing_values = 0
        bad_recomputations = 0

        for row in features:
            year = int(row["year"])
            rain_values = [
                value for _, value in window(
                    daily, year, RAIN_WINDOW, parameter
                )
            ]
            spell_values = [
                value for _, value in window(
                    daily, year, SPELL_WINDOW, parameter
                )
            ]

            actual_rain_missing = sum(
                value is None for value in rain_values
            )
            actual_spell_missing = sum(
                value is None for value in spell_values
            )

            if (
                row[f"rain_missing_days_{tag}"] != actual_rain_missing
                or row[f"spell_missing_days_{tag}"] != actual_spell_missing
            ):
                bad_missing_counts += 1

            if actual_rain_missing > 0 and not (
                row[f"rain_total_mm_{tag}"] is None
                and row[f"rainy_days_{tag}"] is None
            ):
                bad_missing_values += 1

            if actual_spell_missing > 0 and not (
                row[f"longest_dry_spell_d_{tag}"] is None
                and row[f"dry_spells_ge7d_{tag}"] is None
            ):
                bad_missing_values += 1

            if actual_spell_missing == 0:
                dry_mask = [value < DRY_MM for value in spell_values]
                longest, qualifying = independent_runs(dry_mask)
                if (
                    longest != row[f"longest_dry_spell_d_{tag}"]
                    or qualifying != row[f"dry_spells_ge7d_{tag}"]
                ):
                    bad_recomputations += 1

            if actual_rain_missing == 0:
                recomputed_total = sum(rain_values)
                stored_total = row[f"rain_total_mm_{tag}"]
                if (
                    stored_total is None
                    or abs(recomputed_total - stored_total) > 0.06
                ):
                    bad_recomputations += 1

        check(
            bad_missing_counts == 0,
            f"{tag}: missing-day counts match the daily data",
        )
        check(
            bad_missing_values == 0,
            f"{tag}: seasons with missing days are blank (no totals or "
            "spells computed from incomplete windows, nothing filled with 0)",
        )
        check(
            bad_recomputations == 0,
            f"{tag}: totals and dry-spell statistics match an independent "
            "recomputation",
        )

    reference_rows = [
        row for row in features if row["in_reference_period"]
    ]
    check(
        sum(
            row["rain_missing_days_merra2"]
            + row["rain_missing_days_imerg"]
            for row in reference_rows
        ) == 0,
        f"reference period {REF_FIRST}-{REF_LAST}: complete rainfall data "
        "for both sources",
    )
    check(
        sum(
            row["spell_missing_days_merra2"]
            + row["spell_missing_days_imerg"]
            for row in reference_rows
        ) == 0,
        f"reference period {REF_FIRST}-{REF_LAST}: complete Jul-Sep data "
        "for both sources",
    )

    if previous is not None:
        differences = 0
        compared = 0

        compare_fields = [
            "rain_total_mm_merra2",
            "rain_total_mm_imerg",
            "rainy_days_merra2",
            "rainy_days_imerg",
            "longest_dry_spell_d_merra2",
            "dry_spells_ge7d_merra2",
            "longest_dry_spell_d_imerg",
            "dry_spells_ge7d_imerg",
        ]

        for row in features:
            old_row = previous.get(row["year"])

            if old_row is None:
                continue

            for field in compare_fields:
                old_value = number_or_none(old_row.get(field))
                new_value = row.get(field)

                if old_value is not None and new_value is not None:
                    compared += 1
                    tolerance = 0.06 if "rain_total_mm" in field else 0

                    if abs(float(new_value) - old_value) > tolerance:
                        differences += 1

        check(
            differences == 0,
            f"UTC regression: {differences} differences across "
            f"{compared} comparable values against the UTC baseline",
        )

    failures = results.count(False)
    print(
        f"\nVALIDATION SUMMARY: {results.count(True)} pass, "
        f"{failures} fail"
    )
    return failures == 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    previous = None

    baseline_file = "features_by_year_UTC_baseline.csv"

    if os.path.exists(baseline_file):
        previous = read_previous_features(baseline_file)
        print(f"Regression baseline: {baseline_file}")
    else:
        print("WARNING: No UTC regression baseline found.")

    daily = download_daily_data()
    write_daily_csv(daily)
    diagnose(daily)

    features = season_features(daily, 2015, 2026)
    write_features_csv(features)

    print("\n=== FEATURES (blank = unavailable, not zero) ===")
    for row in features:
        printable = []
        for field in FEATURE_FIELDS:
            value = row.get(field)
            printable.append("<NA>" if value is None else str(value))
        print(" | ".join(printable))

    reference_rows = [
        row for row in features
        if row["in_reference_period"]
        and row["rain_total_mm_merra2"] is not None
        and row["rain_total_mm_imerg"] is not None
    ]

    differing_years = []
    for row in reference_rows:
        imerg_total = row["rain_total_mm_imerg"]
        merra_total = row["rain_total_mm_merra2"]

        # The original v2.1 comparison divides by IMERG seasonal rainfall.
        # A zero denominator makes the percentage difference undefined.
        if imerg_total == 0:
            continue

        relative_difference = abs(merra_total - imerg_total) / imerg_total
        if relative_difference > 0.2:
            differing_years.append(row["year"])

    print(
        "\nReference seasons where the two rainfall sources differ by >20%: "
        f"{differing_years}"
    )

    valid = validate(features, daily, previous)
    return 0 if valid else 1


if __name__ == "__main__":
    sys.exit(main())
