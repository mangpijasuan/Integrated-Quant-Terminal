"""Interactive Brokers (IBKR) integration via IB Gateway / TWS + ib_insync."""

from __future__ import annotations

import asyncio
import logging
import math
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Callable, TypeVar

from config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

_ib = None
_ib_lock = threading.Lock()
_worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ibkr")
_worker_loop: asyncio.AbstractEventLoop | None = None


def _worker_init_loop() -> asyncio.AbstractEventLoop:
    """ib_insync requires an asyncio event loop in the worker thread."""
    global _worker_loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    _worker_loop = loop
    return loop


def _worker_runner(fn: Callable[..., T], *args, **kwargs) -> T:
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_init_loop()
    return fn(*args, **kwargs)


def _run_on_worker(fn: Callable[..., T], *args, **kwargs) -> T:
    return _worker.submit(lambda: _worker_runner(fn, *args, **kwargs)).result(timeout=120)


def _ensure_ib():
    global _ib
    from ib_insync import IB

    with _ib_lock:
        if _ib is not None and _ib.isConnected():
            _ib.reqMarketDataType(3)
            return _ib

        if _worker_loop is None or _worker_loop.is_closed():
            _worker_init_loop()

        ib = IB()
        ib.connect(
            settings.ibkr_host,
            settings.ibkr_port,
            clientId=settings.ibkr_client_id,
            readonly=False,
            timeout=15,
        )
        # Paper accounts usually lack live API market data; delayed quotes still work.
        ib.reqMarketDataType(3)
        _ib = ib
        logger.info(
            "Connected to IBKR at %s:%s (clientId=%s)",
            settings.ibkr_host,
            settings.ibkr_port,
            settings.ibkr_client_id,
        )
        return _ib


def _disconnect_ib():
    global _ib
    with _ib_lock:
        if _ib is not None and _ib.isConnected():
            _ib.disconnect()
        _ib = None


def _account_filter() -> str:
    return (settings.ibkr_account or "").strip()


def _pick_account_value(values: list, tag: str, account: str = "") -> float:
    for av in values:
        if av.tag != tag:
            continue
        if account and av.account != account:
            continue
        try:
            return float(av.value)
        except (TypeError, ValueError):
            return 0.0
    return 0.0


def _normalize_expiry(expiry: str) -> str:
    return expiry.replace("-", "")


def _format_expiry(expiry: str) -> str:
    e = _normalize_expiry(expiry)
    if len(e) == 8:
        return f"{e[:4]}-{e[4:6]}-{e[6:8]}"
    return expiry


def _right_code(option_type: str) -> str:
    return "C" if option_type.lower().startswith("c") else "P"


def get_status() -> dict[str, Any]:
    return _run_on_worker(_get_status_sync)


def _get_status_sync() -> dict[str, Any]:
    try:
        ib = _ensure_ib()
        accounts = ib.managedAccounts()
        account = _account_filter() or (accounts[0] if accounts else "")
        return {
            "connected": True,
            "host": settings.ibkr_host,
            "port": settings.ibkr_port,
            "client_id": settings.ibkr_client_id,
            "paper": settings.ibkr_port in (4002, 7497),
            "accounts": accounts,
            "active_account": account,
            "message": "Connected to IB Gateway / TWS",
        }
    except Exception as exc:
        logger.warning("IBKR status check failed: %s", exc)
        return {
            "connected": False,
            "host": settings.ibkr_host,
            "port": settings.ibkr_port,
            "client_id": settings.ibkr_client_id,
            "paper": settings.ibkr_port in (4002, 7497),
            "accounts": [],
            "active_account": "",
            "message": str(exc),
        }


async def _async_call(fn, *args, **kwargs):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _worker,
        lambda: _worker_runner(fn, *args, **kwargs),
    )


def _stock_contract(symbol: str):
    from ib_insync import Stock

    return Stock(symbol.upper(), "SMART", "USD")


def _option_contract(symbol: str, expiry: str, strike: float, right: str):
    from ib_insync import Option

    return Option(
        symbol.upper(),
        _normalize_expiry(expiry),
        float(strike),
        _right_code(right),
        "SMART",
        currency="USD",
    )


def _build_order(side: str, qty: float, order_type: str, tif: str, limit_price=None, stop_price=None):
    from ib_insync import LimitOrder, MarketOrder, StopOrder, StopLimitOrder

    action = "BUY" if side.lower() == "buy" else "SELL"
    tif_map = {"day": "DAY", "gtc": "GTC", "ioc": "IOC", "fok": "FOK"}
    tif_val = tif_map.get(tif.lower(), "DAY")

    if order_type == "limit":
        order = LimitOrder(action, qty, limit_price)
    elif order_type == "stop":
        order = StopOrder(action, qty, stop_price)
    elif order_type == "stop_limit":
        order = StopLimitOrder(action, qty, stop_price, limit_price)
    else:
        order = MarketOrder(action, qty)

    order.tif = tif_val
    if _account_filter():
        order.account = _account_filter()
    return order


def _order_to_dict(trade) -> dict:
    order = trade.order
    status = trade.orderStatus
    contract = trade.contract
    symbol = contract.localSymbol or contract.symbol
    raw_status = (status.status or "Unknown").lower()
    status_map = {
        "submitted": "open",
        "presubmitted": "open",
        "pendingsubmit": "pending_new",
        "pendingcancel": "open",
        "apicancelled": "cancelled",
        "inactive": "cancelled",
    }
    normalized = status_map.get(raw_status, raw_status)
    fill_price = float(status.avgFillPrice) if status.avgFillPrice else None
    return {
        "id": str(order.orderId or order.permId or ""),
        "perm_id": str(order.permId or ""),
        "symbol": symbol,
        "qty": float(order.totalQuantity),
        "filled_qty": float(status.filled),
        "side": order.action.lower(),
        "order_type": order.orderType.lower(),
        "status": normalized,
        "limit_price": float(order.lmtPrice) if order.lmtPrice else None,
        "stop_price": float(order.auxPrice) if order.auxPrice else None,
        "filled_avg_price": fill_price,
        "submitted_at": datetime.utcnow().isoformat(),
        "asset_class": contract.secType.lower(),
    }


def _position_to_dict(pos, ib) -> dict:
    contract = pos.contract
    symbol = contract.localSymbol or contract.symbol
    qty = float(pos.position)
    avg = float(pos.avgCost) if pos.avgCost else 0.0
    market_value = qty * avg
    current = avg
    try:
        [ticker] = ib.reqTickers(contract)
        if ticker.marketPrice() and not math.isnan(ticker.marketPrice()):
            current = float(ticker.marketPrice())
            market_value = qty * current
    except Exception:
        pass
    unrealized = market_value - (qty * avg)
    unrealized_pct = (unrealized / (qty * avg) * 100) if qty * avg else 0.0
    return {
        "symbol": symbol,
        "qty": abs(qty),
        "avg_entry_price": round(avg, 4),
        "current_price": round(current, 4),
        "market_value": round(market_value, 2),
        "unrealized_pl": round(unrealized, 2),
        "unrealized_plpc": round(unrealized_pct, 2),
        "side": "long" if qty >= 0 else "short",
        "asset_class": contract.secType.lower(),
    }


def _get_account_sync() -> dict:
    ib = _ensure_ib()
    account = _account_filter() or (ib.managedAccounts()[0] if ib.managedAccounts() else "")
    values = ib.accountValues(account)

    equity = _pick_account_value(values, "NetLiquidation", account)
    cash = _pick_account_value(values, "TotalCashValue", account)
    buying_power = _pick_account_value(values, "BuyingPower", account)
    unrealized = _pick_account_value(values, "UnrealizedPnL", account)
    daily = _pick_account_value(values, "DailyPnL", account)

    return {
        "equity": round(equity, 2),
        "cash": round(cash, 2),
        "portfolio_value": round(equity, 2),
        "buying_power": round(buying_power, 2),
        "day_pl": round(daily, 2),
        "day_pl_pct": round((daily / equity * 100) if equity else 0, 2),
        "unrealized_pl": round(unrealized, 2),
        "unrealized_plpc": round((unrealized / equity * 100) if equity else 0, 2),
        "account": account,
        "broker": "ibkr",
    }


def _get_positions_sync() -> list[dict]:
    ib = _ensure_ib()
    account = _account_filter()
    positions = ib.positions(account) if account else ib.positions()
    return [_position_to_dict(p, ib) for p in positions if p.position]


def _get_orders_sync(status: str = "open") -> list[dict]:
    ib = _ensure_ib()
    trades = ib.openTrades() if status == "open" else ib.trades()
    if status == "closed":
        trades = [t for t in trades if t.orderStatus.status in ("Filled", "Cancelled", "Inactive")]
    else:
        trades = [t for t in ib.openTrades()]
    return [_order_to_dict(t) for t in trades]


def _place_stock_order_sync(
    symbol: str,
    qty: float | None,
    side: str,
    order_type: str,
    time_in_force: str,
    limit_price=None,
    stop_price=None,
    notional=None,
) -> dict:
    ib = _ensure_ib()
    contract = _stock_contract(symbol)
    ib.qualifyContracts(contract)

    if not qty and notional:
        tickers = ib.reqTickers(contract)
        price = tickers[0].marketPrice() if tickers else 0
        if not price or math.isnan(price):
            price = tickers[0].close if tickers else 0
        if not price:
            raise ValueError("Could not determine price for notional order")
        qty = max(1, int(notional / price))
    if not qty:
        raise ValueError("Provide qty or notional")

    order = _build_order(side, float(qty), order_type, time_in_force, limit_price, stop_price)
    trade = ib.placeOrder(contract, order)
    ib.sleep(1)
    return _order_to_dict(trade)


def _place_option_order_sync(
    symbol: str,
    strike: float,
    expiry: str,
    right: str,
    side: str,
    qty: float,
    order_type: str = "market",
    time_in_force: str = "day",
    limit_price=None,
) -> dict:
    ib = _ensure_ib()
    contract = _option_contract(symbol, expiry, strike, right)
    qualified = ib.qualifyContracts(contract)
    if not qualified:
        raise ValueError(f"Could not qualify option contract for {symbol} {expiry} {strike} {right}")
    order = _build_order(side, float(qty), order_type, time_in_force, limit_price, None)
    trade = ib.placeOrder(qualified[0], order)
    ib.sleep(1)
    return _order_to_dict(trade)


def _cancel_order_sync(order_id: str) -> bool:
    ib = _ensure_ib()
    for trade in ib.trades():
        oid = str(trade.order.orderId)
        if oid == order_id:
            ib.cancelOrder(trade.order)
            ib.sleep(0.5)
            return True
    return False


def _close_position_sync(symbol: str) -> dict:
    ib = _ensure_ib()
    for pos in ib.positions():
        sym = pos.contract.localSymbol or pos.contract.symbol
        if sym.upper() == symbol.upper() or pos.contract.symbol.upper() == symbol.upper():
            qty = abs(float(pos.position))
            side = "sell" if pos.position > 0 else "buy"
            if pos.contract.secType == "OPT":
                return _place_option_order_sync(
                    pos.contract.symbol,
                    float(pos.contract.strike),
                    pos.contract.lastTradeDateOrContractMonth,
                    "call" if pos.contract.right == "C" else "put",
                    side,
                    qty,
                )
            return _place_stock_order_sync(symbol, qty, side, "market", "day")
    raise ValueError(f"No open position for {symbol}")


def _get_bars_sync(symbol: str, timeframe: str = "1Day", limit: int = 60) -> list[dict]:
    from ib_insync import Stock, util

    ib = _ensure_ib()
    contract = Stock(symbol.upper(), "SMART", "USD")
    ib.qualifyContracts(contract)

    bar_size = "1 day"
    duration = f"{max(limit, 30)} D"
    if timeframe.lower() in ("1hour", "1h"):
        bar_size = "1 hour"
        duration = f"{max(limit // 6, 5)} D"

    bars = ib.reqHistoricalData(
        contract,
        endDateTime="",
        durationStr=duration,
        barSizeSetting=bar_size,
        whatToShow="TRADES",
        useRTH=True,
        formatDate=1,
    )
    return [
        {
            "time": b.date.strftime("%Y-%m-%d") if hasattr(b.date, "strftime") else str(b.date)[:10],
            "open": b.open,
            "high": b.high,
            "low": b.low,
            "close": b.close,
            "volume": b.volume,
        }
        for b in bars[-limit:]
    ]


def _price_from_ticker(t) -> float:
    for val in (t.marketPrice(), t.last, t.close):
        if val is None or (isinstance(val, float) and math.isnan(val)):
            continue
        if val != 0:
            return float(val)
    bid, ask = t.bid, t.ask
    if bid and ask and not math.isnan(bid) and not math.isnan(ask) and bid > 0:
        return float((bid + ask) / 2)
    return 0.0


def _get_snapshots_sync(symbols: list[str]) -> dict:
    ib = _ensure_ib()
    contracts = [_stock_contract(s) for s in symbols]
    ib.qualifyContracts(*contracts)
    tickers = ib.reqTickers(*contracts)
    result = {}
    for t in tickers:
        sym = t.contract.symbol
        price = _price_from_ticker(t)
        prev = float(t.close or 0)
        if (prev == 0 or math.isnan(prev)) and price > 0:
            prev = price
        change_abs = price - prev if prev else 0
        change_pct = (change_abs / prev * 100) if prev else 0
        result[sym] = {
            "symbol": sym,
            "price": round(price, 2),
            "prev_close": round(prev, 2),
            "change_abs": round(float(change_abs), 2),
            "change_pct": round(float(change_pct), 2),
            "open": round(float(t.open or 0), 2),
            "high": round(float(t.high or 0), 2),
            "low": round(float(t.low or 0), 2),
            "close": round(float(t.close or price or 0), 2),
            "volume": int(t.volume or 0),
            "source": "ibkr",
        }
    return result


def _ticker_to_contract_dict(t, expiry_fmt: str, option_type: str, spot: float) -> dict:
    g = t.modelGreeks
    bid = float(t.bid or 0)
    ask = float(t.ask or 0)
    last = float(t.last or t.close or 0)
    strike = float(t.contract.strike)
    return {
        "strike": strike,
        "expiry": expiry_fmt,
        "type": option_type,
        "last": round(last, 2),
        "bid": round(bid, 2),
        "ask": round(ask, 2),
        "volume": int(t.volume or 0),
        "open_interest": 0,
        "iv": round(float(g.impliedVol), 4) if g and g.impliedVol else 0.0,
        "delta": round(float(g.delta), 4) if g and g.delta is not None else 0.0,
        "gamma": round(float(g.gamma), 4) if g and g.gamma is not None else 0.0,
        "theta": round(float(g.theta), 4) if g and g.theta is not None else 0.0,
        "vega": round(float(g.vega), 4) if g and g.vega is not None else 0.0,
        "in_the_money": (option_type == "call" and spot > strike) or (option_type == "put" and spot < strike),
    }


def _get_options_chain_sync(symbol: str, expiry: str | None = None) -> dict:
    from ib_insync import Option

    ib = _ensure_ib()
    stock = _stock_contract(symbol)
    ib.qualifyContracts(stock)
    tickers = ib.reqTickers(stock)
    spot = float(tickers[0].marketPrice() or tickers[0].close or 0)
    if not spot:
        raise ValueError(f"No market price for {symbol}")

    chains = ib.reqSecDefOptParams(stock.symbol, "", stock.secType, stock.conId)
    if not chains:
        raise ValueError(f"No options chain available for {symbol}")

    chain = next((c for c in chains if c.exchange in ("SMART", "CBOE", "AMEX")), chains[0])
    expiries = sorted(chain.expirations)
    if not expiries:
        raise ValueError(f"No option expiries for {symbol}")

    use_expiry = _normalize_expiry(expiry) if expiry else expiries[0]
    if use_expiry not in expiries:
        use_expiry = min(expiries, key=lambda e: abs(int(e) - int(_normalize_expiry(expiry or expiries[0]))))

    expiry_fmt = _format_expiry(use_expiry)
    strikes = sorted(float(s) for s in chain.strikes)
    near = [s for s in strikes if abs(s - spot) / spot <= 0.2][:20]
    if not near:
        near = strikes[:20]

    contracts = []
    for s in near:
        contracts.append(Option(symbol, use_expiry, s, "C", "SMART"))
        contracts.append(Option(symbol, use_expiry, s, "P", "SMART"))

    ib.qualifyContracts(*contracts)
    opt_tickers = ib.reqTickers(*contracts)
    ib.sleep(1.5)

    calls, puts = [], []
    for t in opt_tickers:
        if t.contract.right == "C":
            calls.append(_ticker_to_contract_dict(t, expiry_fmt, "call", spot))
        else:
            puts.append(_ticker_to_contract_dict(t, expiry_fmt, "put", spot))

    return {
        "symbol": symbol.upper(),
        "current_price": round(spot, 2),
        "expiries": [_format_expiry(e) for e in expiries[:12]],
        "calls": sorted(calls, key=lambda x: x["strike"]),
        "puts": sorted(puts, key=lambda x: x["strike"]),
        "source": "ibkr",
    }


async def get_status_async() -> dict:
    # Call _get_status_sync directly — get_status() would re-queue on the same worker and deadlock.
    return await _async_call(_get_status_sync)


async def get_account() -> dict:
    return await _async_call(_get_account_sync)


async def get_positions() -> list[dict]:
    return await _async_call(_get_positions_sync)


async def get_orders(status: str = "open") -> list[dict]:
    return await _async_call(_get_orders_sync, status)


async def place_order(
    symbol: str,
    qty: float | None,
    side: str,
    order_type: str,
    time_in_force: str = "day",
    limit_price=None,
    stop_price=None,
    notional=None,
) -> dict:
    return await _async_call(
        _place_stock_order_sync,
        symbol,
        qty,
        side,
        order_type,
        time_in_force,
        limit_price,
        stop_price,
        notional,
    )


async def place_option_order(
    symbol: str,
    strike: float,
    expiry: str,
    right: str,
    side: str,
    qty: float,
    order_type: str = "market",
    time_in_force: str = "day",
    limit_price=None,
) -> dict:
    return await _async_call(
        _place_option_order_sync,
        symbol,
        strike,
        expiry,
        right,
        side,
        qty,
        order_type,
        time_in_force,
        limit_price,
    )


async def cancel_order(order_id: str) -> bool:
    return await _async_call(_cancel_order_sync, order_id)


async def close_position(symbol: str) -> dict:
    return await _async_call(_close_position_sync, symbol)


async def get_bars(symbol: str, timeframe: str = "1Day", limit: int = 60) -> list[dict]:
    return await _async_call(_get_bars_sync, symbol, timeframe, limit)


async def get_snapshots(symbols: list[str]) -> dict:
    return await _async_call(_get_snapshots_sync, symbols)


async def get_options_chain(symbol: str, expiry: str | None = None) -> dict:
    return await _async_call(_get_options_chain_sync, symbol, expiry)
