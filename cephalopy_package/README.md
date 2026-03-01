# Cephalophy Production

This repository contains the production codebase for **CephaloMetrics** — an AI-powered cephalometric landmark detection system for dental X-ray analysis.

## What's in this repo

This is a clean copy of the core production package, containing:

- **`frontend/`** — React + TypeScript UI for landmark detection, correction, model comparison, and PDF report generation
- **`src/`** — FastAPI backend handling model inference, image processing, and Google Cloud integration
- **`pyproject.toml`** — Python dependencies managed with Poetry
- **`Dockerfile`** — Container configuration for deployment on Google Cloud Run

## What's excluded

The following are intentionally not included:

- `models/` — model weights are managed via Google Cloud Storage
- `temp_pdfs/` — runtime-generated files
- `node_modules/` — regenerate with `npm install`
- `.env` — contact the project lead for environment variables

## Getting started

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
poetry install
poetry run uvicorn src.main:app --reload
```
