# Integrated-Terminal

A production-ready full-stack quant terminal with an Express 5 + TypeScript API, a React + Vite frontend, and QuantConnect Lean backtesting orchestration.

## What is included

### Backend

- Security middleware (`helmet`, `cors`, `compression`, rate limiting)
- Request IDs and structured request logging (`pino-http`)
- Runtime environment validation (`zod`)
- Health, readiness, and Prometheus metrics endpoints
- Centralized not-found and error handling
- API input validation
- Lean backtest job queue and results API
- Integration tests with `vitest` and `supertest`

### Frontend

- React + TypeScript dashboard
- Health, readiness, and API metadata panels
- Lean backtest launcher and summary statistics
- Echo API tester wired to `POST /api/v1/echo`
- Vite dev proxy to the backend API

### Lean

- Sample `BuyAndHoldSPY` Python strategy
- `scripts/setup-lean.sh` to download Lean config and sample market data
- API endpoints to launch and inspect local Lean backtests

### Tooling

- Multi-stage Docker builds for API and frontend
- `docker compose` for local full-stack runs
- CI pipeline with lint, typecheck, tests, and builds

## Quick start

### Prerequisites

- Node.js 20+
- npm
- Docker (for Lean backtests)
- Python 3 + Lean CLI (`pip install lean`)

### Install and run

```bash
npm install
npm install --prefix frontend
pip install lean
npm run setup:lean
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

### Run individually

```bash
npm run dev:api
npm run dev:web
```

## Scripts

- `npm run dev` - start backend and frontend together
- `npm run dev:api` - start backend only
- `npm run dev:web` - start frontend only
- `npm run setup:lean` - download Lean config and sample data
- `npm run build` - compile backend TypeScript to `dist`
- `npm run build:web` - build frontend assets
- `npm run build:all` - build backend and frontend
- `npm start` - run compiled backend server
- `npm run lint` - run ESLint
- `npm run typecheck` - run backend TypeScript checks
- `npm test` - run backend test suite
- `npm run format` - check Prettier formatting
- `npm run format:write` - apply Prettier formatting

## Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`
- `GET /api/v1`
- `POST /api/v1/echo` with body: `{ "message": "hello" }`
- `GET /api/v1/backtests/runtime`
- `GET /api/v1/backtests/projects`
- `GET /api/v1/backtests`
- `POST /api/v1/backtests` with body: `{ "project": "BuyAndHoldSPY" }`
- `GET /api/v1/backtests/:id`
- `GET /api/v1/backtests/:id/results`

## Environment variables

- `NODE_ENV` (`development` | `test` | `production`, default: `development`)
- `PORT` (default: `3000`)
- `CORS_ORIGIN` (default: `*`, recommended `http://localhost:5173` for local frontend dev)
- `RATE_LIMIT_WINDOW_MS` (default: `900000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `100`)
- `LEAN_ROOT` (default: `lean`)
- `LEAN_CLI_PATH` (default: `lean`)

## Lean backtesting

Lean local backtests run inside Docker via the `quantconnect/lean` image. You need:

1. **Docker Desktop** installed and running (`docker ps` should work)
2. **Lean CLI** installed
3. **Lean sample data** downloaded

```bash
pip install lean
npm run setup:lean
docker ps
```

If the UI shows a Docker warning:

- **macOS/Windows:** open Docker Desktop and wait until it reports Running
- **Linux:** `sudo systemctl start docker`
- **Permission errors:** `sudo usermod -aG docker $USER`, then log out and back in

1. Start the app and open the frontend backtest panel, or call the API directly:

```bash
curl -X POST http://localhost:3000/api/v1/backtests \
  -H 'Content-Type: application/json' \
  -d '{"project":"BuyAndHoldSPY"}'
```

3. Poll job status:

```bash
curl http://localhost:3000/api/v1/backtests/<job-id>
```

Lean runs inside Docker via the CLI. The API stores results under `lean/backtests/<job-id>/`.

## Run with Docker

```bash
docker compose up --build
```

- API: `http://localhost:3000`
- Frontend: `http://localhost:8080`

Backtesting from the API container requires Docker socket access and the Lean CLI installed on the host/container.
