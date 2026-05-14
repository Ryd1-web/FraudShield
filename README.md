# FraudShield

FraudShield is a research prototype for **real-time mobile money fraud detection** focused on Nigerian transaction patterns.

It combines a React dashboard with an Express API to simulate transactions, score fraud risk, and explain why a transaction was flagged.

## Concept

The application demonstrates how a hybrid fraud-detection pipeline can support analysts and decision-makers:

- **Rule-based detection** for known high-risk behaviors (large amount, risky location, new account/device, unusual time, velocity)
- **Anomaly-style scoring** to capture unusual behavior combinations
- **Logistic-regression-style scoring** for calibrated risk estimation
- **Ensemble decisioning** that merges model outputs into a final risk score and fraud label
- **Explainability output** that shows feature-level contribution to risk

This makes FraudShield useful as an academic/demo environment for exploring detection quality, tuning thresholds, and presenting interpretable fraud decisions.

## Repository Structure

- `artifacts/fraud-detection` — React + Vite frontend (dashboard and analysis UI)
- `artifacts/api-server` — Express backend API and fraud engine
- `lib/db` — Drizzle schema and database access layer
- `lib/api-spec` — OpenAPI/Orval codegen configuration
- `lib/api-zod` / `lib/api-client-react` — shared generated contracts and client hooks

## Key Product Areas

### Frontend pages

- `/` Dashboard
- `/simulator` Synthetic transaction generator
- `/transactions` Searchable transaction history
- `/features` Feature-engineering view
- `/explainability` Model explanation view
- `/metrics` Evaluation metrics view
- `/admin` Model and threshold configuration
- `/dataset` Dataset exploration and export
- `/research` Research summary

### Backend APIs

- `GET /api/healthz`
- `GET/POST /api/transactions`
- `GET /api/transactions/:id`
- `POST /api/simulator/generate`
- `POST /api/simulator/reset`
- `POST /api/fraud/analyze`
- `GET /api/fraud/alerts`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/metrics`
- `GET /api/analytics/roc-curve`
- `GET /api/analytics/transaction-volume`
- `GET /api/analytics/export`
- `GET/PUT /api/config`

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Frontend:** React, Vite, Tailwind, TanStack Query
- **Backend:** Express 5, TypeScript, Pino
- **Database:** PostgreSQL, Drizzle ORM
- **Validation/Contracts:** Zod, drizzle-zod, Orval

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or compatible hosted URL)

### Install

```bash
pnpm install --no-frozen-lockfile
```

### Environment

Set these variables for the API server:

- `DATABASE_URL`
- `PORT`
- `NODE_ENV` (optional, e.g. `development`)

## Common Commands

From repository root:

```bash
pnpm run typecheck
pnpm run build
```

Run frontend:

```bash
pnpm --filter @workspace/fraud-detection run dev
```

Run backend:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Regenerate API client/contracts:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Push DB schema (dev):

```bash
pnpm --filter @workspace/db run push
```
