
# AgroShift Gambia – Setup Guide

## 1. Project Overview

AgroShift Gambia is an agricultural decision-support project. It uses environmental and agricultural data to help generate field-level strategy recommendations.

This guide explains how to set up and run the project's API locally.

## 2. Requirements

Install the following:

- Python 3.12
- Git
- Visual Studio Code (recommended)

## 3. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/Ousman445/agroshift-gambia.git
cd agroshift-gambia
```

## 4. Create a Virtual Environment

### Linux (Ubuntu)

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

### Windows (PowerShell)

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

## 5. Install Dependencies

With the virtual environment activated, run:

```bash
pip install -r requirements.txt
```

## 6. Run the API

From the project root directory, run:

```bash
uvicorn app.main:app --reload
```

The API will run locally at:

http://127.0.0.1:8000

## 7. Test the API

Open these addresses in a browser:

- http://127.0.0.1:8000/ – API home
- http://127.0.0.1:8000/health – Health check
- http://127.0.0.1:8000/api/v2/fields/field-001 – Demo field data
- http://127.0.0.1:8000/docs – Interactive API documentation

## 8. Stop the API

Press `CTRL + C` in the terminal running the API.

## 9. Important Notes

- Activate the virtual environment before running the API.
- Run commands from the project root directory.
- The current field data is demonstration data, not validated agricultural measurements.
- Do not interpret missing values as zero.
- The API currently serves mock field data. Live environmental data and decision-engine integration are separate development tasks.
