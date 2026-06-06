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

- Docker (Lean backtests run inside `quantconnect/lean`)
- Lean CLI (`pip install lean`)

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
