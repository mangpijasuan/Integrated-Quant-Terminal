"""Trading journal — track trades and P&L against a starting capital."""

from __future__ import annotations

DEFAULT_STARTING_CAPITAL = 25_000.0


def compute_pnl(
    *,
    side: str,
    qty: float,
    entry_price: float,
    exit_price: float | None,
    fees: float = 0,
) -> float | None:
    if exit_price is None:
        return None
    if side == "long":
        gross = (exit_price - entry_price) * qty
    else:
        gross = (entry_price - exit_price) * qty
    return round(gross - fees, 2)


def trade_row_to_dict(row) -> dict:
    side = row["side"]
    qty = float(row["qty"])
    entry = float(row["entry_price"])
    exit_p = float(row["exit_price"]) if row["exit_price"] is not None else None
    fees = float(row["fees"] or 0)
    pnl = compute_pnl(side=side, qty=qty, entry_price=entry, exit_price=exit_p, fees=fees)
    status = "closed" if exit_p is not None else "open"
    return {
        "id": row["id"],
        "symbol": row["symbol"],
        "side": side,
        "qty": qty,
        "entry_price": entry,
        "exit_price": exit_p,
        "entry_date": row["entry_date"],
        "exit_date": row["exit_date"],
        "fees": fees,
        "strategy": row["strategy"],
        "notes": row["notes"],
        "pnl": pnl,
        "status": status,
        "created_at": row["created_at"],
    }


def build_summary(starting_capital: float, trades: list[dict]) -> dict:
    closed = [t for t in trades if t["status"] == "closed" and t["pnl"] is not None]
    open_trades = [t for t in trades if t["status"] == "open"]
    realized = sum(t["pnl"] for t in closed)
    wins = [t for t in closed if t["pnl"] > 0]
    losses = [t for t in closed if t["pnl"] < 0]
    current_equity = round(starting_capital + realized, 2)
    total_return_pct = round((realized / starting_capital * 100) if starting_capital else 0, 2)

    return {
        "starting_capital": round(starting_capital, 2),
        "current_equity": current_equity,
        "realized_pnl": round(realized, 2),
        "total_return_pct": total_return_pct,
        "open_trades": len(open_trades),
        "closed_trades": len(closed),
        "total_trades": len(trades),
        "win_rate": round(len(wins) / len(closed) * 100, 1) if closed else 0,
        "wins": len(wins),
        "losses": len(losses),
        "avg_win": round(sum(t["pnl"] for t in wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(t["pnl"] for t in losses) / len(losses), 2) if losses else 0,
        "currency": "USD",
    }
