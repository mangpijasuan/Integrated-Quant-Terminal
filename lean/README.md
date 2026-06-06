# Lean workspace

This directory contains QuantConnect Lean projects used by the Integrated Terminal backtesting API.

## Layout

- `lean.json` — Lean engine configuration
- `data/` — Historical market data (downloaded by `scripts/setup-lean.sh`)
- `BuyAndHoldSPY/` — Sample buy-and-hold strategy using bundled SPY minute data
- `backtests/` — API-managed backtest output directories

## Setup

From the repository root:

```bash
pip install lean
./scripts/setup-lean.sh
```

Requirements:

- Docker Desktop or Docker Engine **running** (`docker ps` must succeed)
- Lean CLI (`pip install lean`)

Lean does not run backtests natively on the host. The CLI launches the `quantconnect/lean` Docker image for each run.

## Run manually

```bash
cd lean
lean backtest "BuyAndHoldSPY"
```

## Add a strategy

```bash
cd lean
lean project-create "MyStrategy" --language python
```

The API will automatically discover any project directory containing `main.py` or `Main.cs`.
