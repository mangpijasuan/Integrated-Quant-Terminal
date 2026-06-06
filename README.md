# Integrated-Terminal

A production-ready full-stack starter with an Express 5 + TypeScript API and a React + Vite frontend.

## What is included

### Backend

- Security middleware (`helmet`, `cors`, `compression`, rate limiting)
- Request IDs and structured request logging (`pino-http`)
- Runtime environment validation (`zod`)
- Health, readiness, and Prometheus metrics endpoints
- Centralized not-found and error handling
- API input validation
- Integration tests with `vitest` and `supertest`

### Frontend

- React + TypeScript dashboard
- Health, readiness, and API metadata panels
- Echo API tester wired to `POST /api/v1/echo`
- Vite dev proxy to the backend API

### Tooling

- Multi-stage Docker builds for API and frontend
- `docker compose` for local full-stack runs
- CI pipeline with lint, typecheck, tests, and builds

## Quick start

### Prerequisites

- Node.js 20+
- npm

### Install and run both apps

```bash
npm install
npm install --prefix frontend
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

## Environment variables

- `NODE_ENV` (`development` | `test` | `production`, default: `development`)
- `PORT` (default: `3000`)
- `CORS_ORIGIN` (default: `*`, recommended `http://localhost:5173` for local frontend dev)
- `RATE_LIMIT_WINDOW_MS` (default: `900000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `100`)

## Run with Docker

```bash
docker compose up --build
```

- API: `http://localhost:3000`
- Frontend: `http://localhost:8080`
