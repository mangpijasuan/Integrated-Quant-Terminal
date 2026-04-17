# Integrated-Terminal

A production-ready API starter with Express 5 + TypeScript, built with reliability, security, and observability defaults.

## What is included

- Security middleware (`helmet`, `cors`, `compression`, rate limiting)
- Request IDs and structured request logging (`pino-http`)
- Runtime environment validation (`zod`)
- Health, readiness, and Prometheus metrics endpoints
- Centralized not-found and error handling
- API input validation
- Integration tests with `vitest` and `supertest`
- Multi-stage Docker build + `docker compose`
- CI pipeline with lint, typecheck, tests, and build

## Quick start

### Prerequisites

- Node.js 20+
- npm

### Install and run

```bash
npm install
npm run dev
```

Server listens on `http://localhost:3000` by default.

## Scripts

- `npm run dev` - start development server
- `npm run build` - compile TypeScript to `dist`
- `npm start` - run compiled server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm test` - run test suite
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
- `CORS_ORIGIN` (default: `*`)
- `RATE_LIMIT_WINDOW_MS` (default: `900000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `100`)

## Run with Docker

```bash
docker compose up --build
```