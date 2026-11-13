# AgroShift Gambia — Caching Architecture

## Purpose

The application must use precomputed and cached environmental data.
It must never make live NASA data requests while a user is using the application.

## Data Flow

1. Data processing scripts retrieve and process environmental datasets.
2. Processed results are converted into the required field features.
3. Results are saved locally as JSON or CSV files.
4. The backend reads the cached files and serves the data through the API.
5. The frontend consumes the API response.

## Directory Structure

- `pipeline/` — Data retrieval and processing scripts.
- `pipeline/cache/` — Precomputed JSON and CSV results.
- `app/` — Backend API and application data.
- `knowledge/` — Crop knowledge base.

## Cache Requirements

- Store processed results in JSON or CSV format.
- Do not retrieve NASA data directly from the application.
- Preserve missing values as null rather than treating them as zero.
- Keep dataset source, resolution, period, data type and confidence metadata.
- Make it possible to update cached results without changing the API structure.

## Static Fallback

A static fallback should be prepared before judging.

It should use a saved JSON response containing the same field-data structure as the API.

If the live backend becomes unavailable, the frontend should be able to display the saved response without requiring a live API connection.

## Responsibilities

- Data processing and scientific validation: Technical lead.
- Cache structure, backend integration and deployment: Systems lead.
- Frontend integration and fallback display: Interface lead.

## Important Restriction

The application must never depend on live NASA requests to produce a field recommendation.