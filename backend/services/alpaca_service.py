import httpx
import asyncio
import time
from config import settings

HEADERS = {
    "APCA-API-KEY-ID": settings.alpaca_api_key,
    "APCA-API-SECRET-KEY": settings.alpaca_secret_key,
}
DATA_URL = settings.alpaca_data_url
TRADE_URL = settings.alpaca_base_url

# Simple TTL cache
_cache: dict = {}
_TTL = 15  # seconds for real-time data


def _cached(key: str):
    e = _cache.get(key)
    if e and time.time() - e["ts"] < _TTL:
        return e["data"]
    return None


def _set(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}
    return data


# ── Market Data ────────────────────────────────────────────────────────────────

async def get_snapshots(symbols: list[str]) -> dict:
    """Return snapshot dict keyed by symbol: {price, change_pct, volume, open, high, low, close, prev_close}"""
    key = "snap:" + ",".join(sorted(symbols))
    cached = _cached(key)
    if cached:
        return cached

    sym_str = ",".join(symbols)
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{DATA_URL}/v2/stocks/snapshots",
            headers=HEADERS,
            params={"symbols": sym_str, "feed": "iex"},
        )
        r.raise_for_status()
        raw = r.json()

    result = {}
    for sym, data in raw.items():
        daily = data.get("dailyBar") or {}
        prev = data.get("prevDailyBar") or {}
        trade = data.get("latestTrade") or {}

        price = float(trade.get("p", daily.get("c", 0)))
        prev_close = float(prev.get("c", price))
        change_abs = price - prev_close
        change_pct = (change_abs / prev_close * 100) if prev_close else 0

        result[sym] = {
            "symbol": sym,
            "price": round(price, 2),
            "prev_close": round(prev_close, 2),
            "change_abs": round(change_abs, 2),
            "change_pct": round(change_pct, 2),
            "open": round(float(daily.get("o", 0)), 2),
            "high": round(float(daily.get("h", 0)), 2),
            "low": round(float(daily.get("l", 0)), 2),
            "close": round(float(daily.get("c", 0)), 2),
            "volume": int(daily.get("v", 0)),
        }

    return _set(key, result)


async def get_quote(symbol: str) -> dict:
    snaps = await get_snapshots([symbol])
    return snaps.get(symbol, {"symbol": symbol, "price": 0.0, "change_pct": 0.0, "volume": 0})


async def get_bars(symbol: str, timeframe: str = "1Day", limit: int = 60) -> list[dict]:
    """OHLCV bars for charting."""
    key = f"bars:{symbol}:{timeframe}:{limit}"
    cached = _cached(key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{DATA_URL}/v2/stocks/{symbol}/bars",
            headers=HEADERS,
            params={"timeframe": timeframe, "limit": limit, "feed": "iex", "sort": "asc"},
        )
        r.raise_for_status()
        bars = r.json().get("bars", [])

    result = [
        {
            "time": b["t"][:10],
            "open": b["o"], "high": b["h"],
            "low": b["l"], "close": b["c"],
            "volume": b["v"],
        }
        for b in bars
    ]
    return _set(key, result)


async def get_movers_alpaca(symbols: list[str]) -> dict:
    """Return top gainers and losers from a symbol list."""
    snaps = await get_snapshots(symbols)
    items = list(snaps.values())
    items.sort(key=lambda x: x["change_pct"], reverse=True)
    return {
        "gainers": items[:5],
        "losers": list(reversed(items[-5:])),
    }


# ── Trading ────────────────────────────────────────────────────────────────────

async def get_account() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{TRADE_URL}/v2/account", headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def get_positions() -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{TRADE_URL}/v2/positions", headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def get_orders(status: str = "open", limit: int = 50) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{TRADE_URL}/v2/orders",
            headers=HEADERS,
            params={"status": status, "limit": limit, "direction": "desc"},
        )
        r.raise_for_status()
        return r.json()


async def place_order(
    symbol: str,
    qty: float,
    side: str,           # "buy" | "sell"
    order_type: str,     # "market" | "limit" | "stop" | "stop_limit"
    time_in_force: str = "day",
    limit_price: float = None,
    stop_price: float = None,
    notional: float = None,
) -> dict:
    body: dict = {
        "symbol": symbol.upper(),
        "side": side,
        "type": order_type,
        "time_in_force": time_in_force,
    }
    if notional:
        body["notional"] = str(round(notional, 2))
    else:
        body["qty"] = str(qty)
    if limit_price:
        body["limit_price"] = str(round(limit_price, 2))
    if stop_price:
        body["stop_price"] = str(round(stop_price, 2))

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{TRADE_URL}/v2/orders", headers=HEADERS, json=body)
        r.raise_for_status()
        return r.json()


async def cancel_order(order_id: str) -> bool:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.delete(f"{TRADE_URL}/v2/orders/{order_id}", headers=HEADERS)
        return r.status_code == 204


async def close_position(symbol: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.delete(f"{TRADE_URL}/v2/positions/{symbol}", headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def get_crypto_snapshot(symbol: str) -> dict:
    """Get crypto price e.g. BTC/USD"""
    key = f"crypto:{symbol}"
    cached = _cached(key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{DATA_URL}/v1beta3/crypto/us/latest/bars",
                headers=HEADERS,
                params={"symbols": symbol},
            )
            r.raise_for_status()
            bars = r.json().get("bars", {})
            bar = bars.get(symbol, {})
            price = float(bar.get("c", 0))
            open_ = float(bar.get("o", price))
            change_abs = price - open_
            change_pct = (change_abs / open_ * 100) if open_ else 0
            result = {
                "price": round(price, 2),
                "change_pct": round(change_pct, 2),
                "change_abs": round(change_abs, 2),
            }
    except Exception:
        result = {"price": 0.0, "change_pct": 0.0, "change_abs": 0.0}

    return _set(key, result)


async def get_portfolio_history(period: str = "1M", timeframe: str = "1D") -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{TRADE_URL}/v2/account/portfolio/history",
            headers=HEADERS,
            params={"period": period, "timeframe": timeframe},
        )
        r.raise_for_status()
        return r.json()
