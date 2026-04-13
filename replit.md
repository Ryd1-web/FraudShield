# FraudShield Research Prototype

## Overview

AI-powered mobile money fraud detection research prototype tailored for ANU RTP scholarship presentation. Demonstrates real-time fraud detection for Nigerian mobile money transactions using a hybrid ML approach.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Recharts

## Artifacts

- **fraud-detection** (react-vite) — Main research dashboard at `/`
- **api-server** (Express) — Backend API at `/api`

## Frontend Pages

- `/` — Live dashboard with real-time transaction feed and fraud alerts
- `/simulator` — Transaction simulator for generating synthetic Nigerian mobile money data
- `/transactions` — Full searchable transaction log with fraud analysis drill-down
- `/features` — Feature engineering panel (velocity, geolocation, account age, device, time, amount)
- `/explainability` — SHAP-style explainable AI panel for flagged transactions
- `/metrics` — Evaluation metrics (precision, recall, F1, ROC curve, confusion matrix)
- `/admin` — Admin research panel (toggle models, adjust thresholds, configure ensemble weights)
- `/dataset` — Dataset explorer with distribution charts and CSV export
- `/research` — Academic research summary page (problem, methodology, contribution)

## Backend Routes

- `GET /api/healthz` — Health check
- `GET/POST /api/transactions` — Transaction CRUD
- `GET /api/transactions/:id` — Single transaction with fraud analysis
- `POST /api/simulator/generate` — Generate synthetic Nigerian mobile money transactions
- `POST /api/simulator/reset` — Reset all transaction data
- `POST /api/fraud/analyze` — Analyze a transaction for fraud
- `GET /api/fraud/alerts` — Recent fraud alerts
- `GET /api/analytics/dashboard` — Dashboard statistics
- `GET /api/analytics/metrics` — ML model evaluation metrics
- `GET /api/analytics/roc-curve` — ROC curve data
- `GET /api/analytics/transaction-volume` — Volume over time
- `GET /api/analytics/export` — CSV download
- `GET/PUT /api/config` — Model configuration management

## ML Fraud Detection Engine

Located in `artifacts/api-server/src/lib/fraudEngine.ts`:
- **Rule-based**: 10 rules covering CBN AML patterns
- **Anomaly Detection**: Isolation forest approximation with feature interactions
- **Logistic Regression**: Nigeria-calibrated coefficients
- **Ensemble**: Configurable weighted combination
- **Explainability**: SHAP-style feature attribution

## Nigerian Data Generator

Located in `artifacts/api-server/src/lib/nigerianDataGenerator.ts`:
- Real MTN/GLO/Airtel/9Mobile phone number prefixes
- 20 Nigerian cities with high-risk location tagging
- NGN amounts calibrated to CBN thresholds
- 7 transaction types (send, receive, withdraw, agent transactions, airtime, bill payment)
- Configurable fraud rate and behavioral patterns

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
