# Deployment

This repository is set up for a Vercel deployment with a single site:

- Frontend: `artifacts/fraud-detection`
- API: `api/*` serverless functions backed by the existing Express app

## Required environment variables

- `DATABASE_URL` for the Postgres database used by the API

## Vercel settings

- Build command: `pnpm --filter @workspace/fraud-detection build`
- Output directory: `artifacts/fraud-detection/dist/public`
- Root directory: repository root

## Notes

- Client requests already target `/api`, so the frontend can stay on the same domain as the API.
- The Express app is shared between local development and the Vercel function entrypoints.