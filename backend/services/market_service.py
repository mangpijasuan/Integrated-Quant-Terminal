import asyncio
import csv
import hashlib
import io
import logging
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx
import yfinance as yf


logger = logging.getLogger(__name__)

# Simple TTL cache
_cache: dict = {}
_CACHE_TTL = 60  # seconds — balances freshness vs navigation speed

STOOQ_SYMBOL_MAP = {
    "AAPL": "aapl.us",
    "NVDA": "nvda.us",
    "TSLA": "tsla.us",
    "MSFT": "msft.us",
    "AMZN": "amzn.us",
    "META": "meta.us",
    "GOOGL": "googl.us",
    "AMD": "amd.us",
    "NFLX": "nflx.us",
    "BABA": "baba.us",
    "CRM": "crm.us",
    "UBER": "uber.us",
    "SHOP": "shop.us",
    "PLTR": "pltr.us",
    "COIN": "coin.us",
    "RIVN": "rivn.us",
    "SOFI": "sofi.us",
    "RBLX": "rblx.us",
    "SNAP": "snap.us",
    "LYFT": "lyft.us",
    "^GSPC": "^spx",
    "^DJI": "^dji",
    "^IXIC": "^ndq",
    "^RUT": "iwm.us",
    "GC=F": "gc.f",
    "CL=F": "cl.f",
    "BTC-USD": "btc.us",
    "ETH-USD": "eth.us",
}

COINGECKO_SYMBOL_MAP = {
    "BTC-USD": "bitcoin",
    "ETH-USD": "ethereum",
}

NEWS_SYMBOL_ALIASES = {
    "CRYPTO": "BTC-USD",
    "ECONOMY": "SPY",
}

NEWS_DEFAULT_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOGL"]


def _cached(key: str):
    e = _cache.get(key)
    if e and time.time() - e["ts"] < _CACHE_TTL:
        return e["data"]
    return None


def _set_cache(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}
    return data


def _stooq_symbol(symbol: str) -> str | None:
    return STOOQ_SYMBOL_MAP.get(symbol.upper())


async def _stooq_quote(symbol: str) -> dict | None:
    stooq_symbol = _stooq_symbol(symbol)
    if not stooq_symbol:
        return None

    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = await client.get("https://stooq.com/q/l/", params={"s": stooq_symbol, "i": "d"})
            response.raise_for_status()
    except Exception as exc:
        logger.debug("Stooq request failed for %s: %s", symbol, exc)
        return None

    text = response.text.strip()
    if not text or "N/D" in text:
        return None

    try:
        row = next(csv.reader(io.StringIO(text)))
        open_price = _safe_float(row[3])
        high_price = _safe_float(row[4])
        low_price = _safe_float(row[5])
        close_price = _safe_float(row[6])
        volume = int(_safe_float(row[7], 0.0))
        change_abs = close_price - open_price
        change_pct = (change_abs / open_price * 100) if open_price else 0.0
        return {
            "symbol": symbol,
            "price": round(close_price, 2),
            "prev_close": round(open_price, 2),
            "change_abs": round(change_abs, 2),
            "change_pct": round(change_pct, 2),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": volume,
        }
    except Exception as exc:
        logger.debug("Failed to parse Stooq response for %s: %s", symbol, exc)
        return None


async def _coingecko_quote(symbol: str) -> dict | None:
    coin_id = COINGECKO_SYMBOL_MAP.get(symbol.upper())
    if not coin_id:
        return None

    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": coin_id, "vs_currencies": "usd", "include_24hr_change": "true"},
            )
            response.raise_for_status()
            payload = response.json().get(coin_id, {})
    except Exception as exc:
        logger.debug("CoinGecko request failed for %s: %s", symbol, exc)
        return None

    price = _safe_float(payload.get("usd"))
    change_pct = _safe_float(payload.get("usd_24h_change"))
    change_abs = price * change_pct / 100 if price else 0.0
    return {
        "symbol": symbol,
        "price": round(price, 2),
        "prev_close": round(price - change_abs, 2) if price else 0.0,
        "change_abs": round(change_abs, 2),
        "change_pct": round(change_pct, 2),
        "open": round(price - change_abs, 2) if price else 0.0,
        "high": round(price, 2),
        "low": round(price, 2),
        "close": round(price, 2),
        "volume": 0,
    }


async def _yahoo_chart_quote(symbol: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = await client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
                params={"interval": "1d", "range": "5d"},
            )
            response.raise_for_status()
            payload = response.json()
        result = payload["chart"]["result"][0]
        meta = result["meta"]
        price = _safe_float(meta.get("regularMarketPrice"))
        prev = _safe_float(meta.get("previousClose") or meta.get("chartPreviousClose"), price)
        if price <= 0:
            closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
            closes = [float(c) for c in closes if c is not None]
            if closes:
                price = closes[-1]
                prev = closes[-2] if len(closes) >= 2 else price
        if price <= 0:
            return None
        change_abs = price - prev
        change_pct = (change_abs / prev * 100) if prev else 0.0
        return {
            "symbol": symbol,
            "price": round(price, 2),
            "prev_close": round(prev, 2),
            "change_abs": round(change_abs, 2),
            "change_pct": round(change_pct, 2),
            "open": round(price, 2),
            "high": round(price, 2),
            "low": round(price, 2),
            "close": round(price, 2),
            "volume": 0,
            "source": "yahoo",
        }
    except Exception as exc:
        logger.debug("Yahoo chart request failed for %s: %s", symbol, exc)
        return None


async def _public_quote(symbol: str) -> dict | None:
    if symbol.upper() in COINGECKO_SYMBOL_MAP:
        quote = await _coingecko_quote(symbol)
        if quote:
            return quote

    quote = await _yahoo_chart_quote(symbol)
    if quote:
        return quote

    quote = await _stooq_quote(symbol)
    if quote:
        return quote

    return None


# Alpaca handles US stocks; yfinance handles indices + commodities
ALPACA_MOVERS = [
    "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "AMD",
    "NFLX", "BABA", "CRM", "UBER", "SHOP", "PLTR", "COIN", "RIVN",
    "SOFI", "RBLX", "SNAP", "LYFT",
]

# yfinance-only symbols (indices & commodities Alpaca doesn't support)
YF_OVERVIEW = [
    ("^GSPC", "S&P 500"),
    ("^DJI", "Dow Jones"),
    ("^IXIC", "NASDAQ"),
    ("^RUT", "Russell 2000"),
    ("GC=F", "Gold"),
    ("CL=F", "Crude Oil"),
]

# Alpaca US stocks for overview
ALPACA_OVERVIEW = [
    ("AAPL", "Apple"),
    ("NVDA", "NVIDIA"),
    ("TSLA", "Tesla"),
    ("MSFT", "Microsoft"),
    ("BTC/USD", "Bitcoin"),
    ("ETH/USD", "Ethereum"),
]


def _safe_float(val, default=0.0) -> float:
    try:
        v = float(val)
        return v if v == v else default
    except (TypeError, ValueError):
        return default


def _format_volume(vol: float) -> str:
    if vol >= 1e9:
        return f"{vol/1e9:.1f}B"
    if vol >= 1e6:
        return f"{vol/1e6:.1f}M"
    if vol >= 1e3:
        return f"{vol/1e3:.1f}K"
    return str(int(vol))


def _yf_price(symbol: str) -> tuple[float, float]:
    """Get (price, prev_close) from yfinance with history fallback."""
    try:
        t = yf.Ticker(symbol)
        fi = t.fast_info
        price = _safe_float(fi.last_price)
        prev = _safe_float(fi.previous_close, price)
        if price > 0:
            return price, prev
    except Exception:
        pass
    try:
        hist = yf.Ticker(symbol).history(period="5d")
        if not hist.empty:
            price = float(hist["Close"].iloc[-1])
            prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else price
            return price, prev
    except Exception:
        pass
    return 0.0, 0.0


async def get_overview():
    cached = _cached("overview")
    if cached:
        return cached

    from services import ibkr_service

    results = []

    # US stocks via IBKR when Gateway is connected, else public fallback
    ibkr_syms = [s for s, _ in ALPACA_OVERVIEW if "/" not in s]
    ibkr_snaps = {}
    try:
        ibkr_snaps = await ibkr_service.get_snapshots(ibkr_syms)
    except Exception as exc:
        logger.debug("IBKR overview failed, falling back to public data: %s", exc)

    stock_fallback: list[tuple[str, str]] = []
    for sym, name in ALPACA_OVERVIEW:
        if "/" in sym:
            continue
        d = ibkr_snaps.get(sym)
        if d and d.get("price", 0) > 0:
            results.append({
                "symbol": sym,
                "name": name,
                "price": d.get("price", 0.0),
                "change_pct": d.get("change_pct", 0.0),
                "change_abs": d.get("change_abs", 0.0),
                "source": "ibkr",
            })
        else:
            stock_fallback.append((sym, name))

    if stock_fallback:
        public_quotes = await asyncio.gather(
            *[_public_quote(sym) for sym, _ in stock_fallback]
        )
        for (sym, name), quote in zip(stock_fallback, public_quotes):
            results.append({
                "symbol": sym,
                "name": name,
                "price": quote["price"] if quote else 0.0,
                "change_pct": quote["change_pct"] if quote else 0.0,
                "change_abs": quote["change_abs"] if quote else 0.0,
                "source": quote.get("source", "yahoo") if quote else "public",
            })

    async def _crypto_row(sym: str, name: str) -> dict:
        try:
            from services.alpaca_service import get_crypto_snapshot
            snap = await get_crypto_snapshot(sym)
            if snap.get("price", 0) > 0:
                return {"symbol": sym.replace("/", "-"), "name": name, **snap, "source": "alpaca"}
        except Exception:
            pass
        quote = await _public_quote(sym.replace("/", "-"))
        return {
            "symbol": sym.replace("/", "-"),
            "name": name,
            "price": quote["price"] if quote else 0.0,
            "change_pct": quote["change_pct"] if quote else 0.0,
            "change_abs": quote["change_abs"] if quote else 0.0,
            "source": "coingecko",
        }

    results.extend(await asyncio.gather(
        _crypto_row("BTC/USD", "Bitcoin"),
        _crypto_row("ETH/USD", "Ethereum"),
    ))

    yf_quotes = await asyncio.gather(*[_public_quote(symbol) for symbol, _ in YF_OVERVIEW])
    for (symbol, name), quote in zip(YF_OVERVIEW, yf_quotes):
        results.append({
            "symbol": symbol,
            "name": name,
            "price": quote["price"] if quote else 0.0,
            "change_pct": quote["change_pct"] if quote else 0.0,
            "change_abs": quote["change_abs"] if quote else 0.0,
            "source": "yahoo",
        })

    return _set_cache("overview", results)


async def get_movers():
    cached = _cached("movers")
    if cached:
        return cached

    from services import ibkr_service

    try:
        snaps = await ibkr_service.get_snapshots(ALPACA_MOVERS)
        items = list(snaps.values())
        items.sort(key=lambda x: x["change_pct"], reverse=True)
        data = {
            "gainers": [
                {"symbol": i["symbol"], "name": i["symbol"], "price": i["price"], "change_pct": i["change_pct"], "source": "ibkr"}
                for i in items[:5]
            ],
            "losers": [
                {"symbol": i["symbol"], "name": i["symbol"], "price": i["price"], "change_pct": i["change_pct"], "source": "ibkr"}
                for i in reversed(items[-5:])
            ],
        }
    except Exception as exc:
        logger.debug("IBKR movers failed, falling back to public data: %s", exc)
        public_quotes = await asyncio.gather(*[_public_quote(symbol) for symbol in ALPACA_MOVERS])
        fallback_items = []
        for symbol, quote in zip(ALPACA_MOVERS, public_quotes):
            if not quote:
                continue
            fallback_items.append({
                "symbol": symbol,
                "name": symbol,
                "price": quote["price"],
                "change_pct": quote["change_pct"],
                "source": "coingecko" if symbol in COINGECKO_SYMBOL_MAP else "stooq",
            })
        fallback_items.sort(key=lambda x: x["change_pct"], reverse=True)
        data = {
            "gainers": fallback_items[:5],
            "losers": list(reversed(fallback_items[-5:])),
        }

    return _set_cache("movers", data)


async def get_mood():
    cached = _cached("mood")
    if cached:
        return cached
    quote = await _public_quote("^GSPC")

    def fetch():
        try:
            vix = _safe_float(yf.Ticker("^VIX").fast_info.last_price)
            if vix == 0:
                hist = yf.Ticker("^VIX").history(period="5d")
                vix = float(hist["Close"].iloc[-1]) if not hist.empty else 20.0
        except Exception:
            vix = 20.0

        if quote:
            sp_change = quote["change_pct"]
        else:
            try:
                sp_price, sp_prev = _yf_price("^GSPC")
                sp_change = ((sp_price - sp_prev) / sp_prev * 100) if sp_prev else 0
            except Exception:
                sp_change = 0

        vix_score = max(0, min(100, int(100 - (vix - 10) * 3)))
        trend_bonus = 10 if sp_change > 0.5 else (-10 if sp_change < -0.5 else 0)
        score = max(0, min(100, vix_score + trend_bonus))

        if score >= 75:
            label, desc = "Extreme Greed", "Markets are in euphoric territory. Historically a contrarian sell signal."
        elif score >= 55:
            label, desc = "Greed", "Bullish sentiment dominates. Risk appetite is elevated."
        elif score >= 45:
            label, desc = "Neutral", "Markets are balanced between fear and greed."
        elif score >= 25:
            label, desc = "Fear", "Investors are cautious. Potential buying opportunities emerging."
        else:
            label, desc = "Extreme Fear", "Panic selling occurring. Historically a contrarian buy signal."

        return {
            "score": score, "label": label,
            "vix": round(vix, 2),
            "sp500_trend": "Up" if sp_change >= 0 else "Down",
            "description": desc,
            "source": "public",
        }

    data = await asyncio.get_event_loop().run_in_executor(None, fetch)
    return _set_cache("mood", data)


def _quote_from_ibkr(symbol: str, d: dict) -> dict:
    return {
        "symbol": symbol,
        "name": symbol,
        "price": d["price"],
        "change_pct": d["change_pct"],
        "change_abs": d.get("change_abs", 0.0),
        "open": d.get("open", 0.0),
        "high": d.get("high", 0.0),
        "low": d.get("low", 0.0),
        "volume": _format_volume(d.get("volume", 0)),
        "source": "ibkr",
    }


def _quote_from_public(symbol: str, quote: dict) -> dict:
    return {
        "symbol": symbol,
        "name": symbol,
        "price": quote["price"],
        "change_pct": quote["change_pct"],
        "change_abs": quote.get("change_abs", 0.0),
        "open": quote.get("open", 0.0),
        "high": quote.get("high", 0.0),
        "low": quote.get("low", 0.0),
        "volume": _format_volume(quote.get("volume", 0)) if quote.get("volume") else "N/A",
        "source": quote.get("source", "yahoo"),
    }


async def get_quotes(symbols: list[str]) -> dict[str, dict]:
    """Batch quotes — one IBKR snapshot call + parallel public fallbacks."""
    unique = []
    seen: set[str] = set()
    for raw in symbols:
        sym = raw.strip().upper()
        if sym and sym not in seen:
            seen.add(sym)
            unique.append(sym)

    result: dict[str, dict] = {}
    missing: list[str] = []
    for sym in unique:
        cached = _cached(f"quote:{sym}")
        if cached:
            result[sym] = cached
        else:
            missing.append(sym)

    if not missing:
        return result

    ibkr_candidates = [s for s in missing if "/" not in s]
    ibkr_snaps: dict = {}
    if ibkr_candidates:
        try:
            from services import ibkr_service
            ibkr_snaps = await ibkr_service.get_snapshots(ibkr_candidates)
        except Exception:
            pass

    still_missing: list[str] = []
    for sym in missing:
        d = ibkr_snaps.get(sym)
        if d and d.get("price", 0) > 0:
            row = _quote_from_ibkr(sym, d)
            result[sym] = _set_cache(f"quote:{sym}", row)
        else:
            still_missing.append(sym)

    if still_missing:
        public_quotes = await asyncio.gather(*[_public_quote(sym) for sym in still_missing])
        for sym, quote in zip(still_missing, public_quotes):
            if quote:
                row = _quote_from_public(sym, quote)
                result[sym] = _set_cache(f"quote:{sym}", row)

    return result


async def get_quote(symbol: str) -> dict:
    """Quote for watchlist — IBKR when connected, else public/yfinance fallback."""
    quotes = await get_quotes([symbol])
    if symbol in quotes:
        return quotes[symbol]

    key = f"quote:{symbol}"
    def fetch():
        price, prev = _yf_price(symbol)
        change_pct = ((price - prev) / prev * 100) if prev else 0
        try:
            name = yf.Ticker(symbol).info.get("shortName", symbol)
        except Exception:
            name = symbol
        return {
            "symbol": symbol, "name": name,
            "price": round(price, 2),
            "change_pct": round(change_pct, 2),
            "volume": "N/A",
        }

    data = await asyncio.get_event_loop().run_in_executor(None, fetch)
    return _set_cache(key, data)


async def get_fundamentals(symbol: str) -> dict:
    key = f"fundamentals:{symbol}"
    cached = _cached(key)
    if cached:
        return cached

    ibkr_price = 0.0
    ibkr_prev = 0.0
    try:
        from services import ibkr_service
        snaps = await ibkr_service.get_snapshots([symbol])
        if snaps.get(symbol, {}).get("price", 0) > 0:
            ibkr_price = snaps[symbol]["price"]
            ibkr_prev = snaps[symbol]["prev_close"]
    except Exception:
        pass

    def fetch():
        t = yf.Ticker(symbol)
        info = {}
        for attempt in range(3):
            try:
                info = t.info or {}
                break
            except Exception:
                if attempt < 2:
                    time.sleep(2 ** attempt)

        if ibkr_price > 0:
            price, prev = ibkr_price, ibkr_prev
        else:
            price, prev = _yf_price(symbol)

        pe = info.get("trailingPE")
        forward_pe = info.get("forwardPE")

        return {
            "symbol": symbol,
            "name": info.get("shortName", symbol),
            "long_name": info.get("longName", symbol),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "currency": info.get("currency", "USD"),
            "price": round(price, 2),
            "prev_close": round(prev, 2),
            "market_cap": _safe_float(info.get("marketCap", 0)),
            "pe_ratio": round(float(pe), 2) if pe else None,
            "forward_pe": round(float(forward_pe), 2) if forward_pe else None,
            "eps": _safe_float(info.get("trailingEps", 0)),
            "revenue": _safe_float(info.get("totalRevenue", 0)),
            "revenue_growth": _safe_float(info.get("revenueGrowth", 0)),
            "profit_margin": _safe_float(info.get("profitMargins", 0)),
            "debt_equity": _safe_float(info.get("debtToEquity", 0)),
            "roe": _safe_float(info.get("returnOnEquity", 0)),
            "beta": _safe_float(info.get("beta", 1.0)),
            "analyst_target": _safe_float(info.get("targetMeanPrice", 0)),
            "fifty_two_high": _safe_float(info.get("fiftyTwoWeekHigh", 0)),
            "fifty_two_low": _safe_float(info.get("fiftyTwoWeekLow", 0)),
            "description": info.get("longBusinessSummary", "No description available."),
        }

    data = await asyncio.get_event_loop().run_in_executor(None, fetch)
    _set_cache(key, data)
    return data


def _news_sentiment(title: str) -> str:
    title_lower = title.lower()
    positive_words = ["surge", "beat", "record", "gain", "up", "rise", "buy", "bull", "strong", "profit", "growth"]
    negative_words = ["fall", "drop", "miss", "loss", "sell", "bear", "weak", "cut", "down", "crash", "decline"]
    pos = sum(1 for w in positive_words if w in title_lower)
    neg = sum(1 for w in negative_words if w in title_lower)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _news_item_from_fields(
    *,
    title: str,
    summary: str,
    url: str,
    source: str,
    published_at: str,
    symbols: list[str],
) -> dict:
    return {
        "id": hashlib.md5(title.encode()).hexdigest()[:12],
        "headline": title,
        "summary": summary or title,
        "source": source,
        "url": url or "#",
        "published_at": published_at,
        "symbols": symbols,
        "sentiment": _news_sentiment(title),
    }


def _parse_rss_items(xml_text: str, symbol: str | None = None) -> list[dict]:
    items: list[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.debug("Failed to parse RSS for %s: %s", symbol, exc)
        return items

    for node in root.findall(".//item"):
        title = (node.findtext("title") or "").strip()
        if not title:
            continue
        summary = (node.findtext("description") or title).strip()
        url = (node.findtext("link") or "#").strip()
        pub_raw = (node.findtext("pubDate") or "").strip()
        try:
            published_at = (
                parsedate_to_datetime(pub_raw).astimezone(timezone.utc).isoformat()
                if pub_raw
                else datetime.now(timezone.utc).isoformat()
            )
        except (TypeError, ValueError, IndexError):
            published_at = datetime.now(timezone.utc).isoformat()

        source = "Yahoo Finance"
        if "://" in url:
            host = url.split("/")[2].replace("www.", "")
            source = host.split(".")[0].capitalize() if host else source

        items.append(
            _news_item_from_fields(
                title=title,
                summary=summary,
                url=url,
                source=source,
                published_at=published_at,
                symbols=[symbol] if symbol else [],
            )
        )
    return items


async def _yahoo_rss_news(symbol: str) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=12.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = await client.get(
                "https://feeds.finance.yahoo.com/rss/2.0/headline",
                params={"s": symbol, "region": "US", "lang": "en-US"},
            )
            response.raise_for_status()
            return _parse_rss_items(response.text, symbol=symbol)
    except Exception as exc:
        logger.debug("Yahoo RSS news failed for %s: %s", symbol, exc)
        return []


def _resolve_news_symbol(symbol: str | None) -> str | None:
    if not symbol:
        return None
    key = symbol.strip().upper()
    if key in NEWS_SYMBOL_ALIASES:
        return NEWS_SYMBOL_ALIASES[key]
    if key in ("ALL",):
        return None
    return symbol.strip().upper()


async def get_news(symbol: str | None = None) -> list:
    """Fetch market news via Yahoo RSS, with yfinance fallback."""
    resolved = _resolve_news_symbol(symbol)
    cache_key = f"news_{resolved or 'general'}"
    cached = _cached(cache_key)
    if cached:
        return cached

    items: list[dict] = []
    seen: set[str] = set()

    def add_items(batch: list[dict]):
        for item in batch:
            headline = item.get("headline", "")
            if not headline or headline in seen:
                continue
            seen.add(headline)
            items.append(item)

    if resolved:
        add_items(await _yahoo_rss_news(resolved))
    else:
        rss_batches = await asyncio.gather(*[_yahoo_rss_news(sym) for sym in NEWS_DEFAULT_TICKERS])
        for batch in rss_batches:
            add_items(batch)

    if not items:
        def fetch_yfinance():
            raw_news = []
            try:
                if resolved:
                    raw_news = yf.Ticker(resolved).news or []
                else:
                    for sym in NEWS_DEFAULT_TICKERS[:5]:
                        try:
                            raw_news.extend(yf.Ticker(sym).news or [])
                        except Exception:
                            pass
            except Exception as exc:
                logger.debug("yfinance news fallback failed: %s", exc)
                return []

            parsed = []
            for n in raw_news:
                title = n.get("title", "")
                if not title:
                    continue
                parsed.append(
                    _news_item_from_fields(
                        title=title,
                        summary=n.get("summary", title),
                        url=n.get("link", "#"),
                        source=n.get("publisher", "Yahoo Finance"),
                        published_at=(
                            datetime.fromtimestamp(n["providerPublishTime"], tz=timezone.utc).isoformat()
                            if n.get("providerPublishTime")
                            else datetime.now(timezone.utc).isoformat()
                        ),
                        symbols=n.get("relatedTickers", [resolved] if resolved else []),
                    )
                )
            return parsed

        add_items(await asyncio.get_event_loop().run_in_executor(None, fetch_yfinance))

    data = items[:50]
    _set_cache(cache_key, data)
    return data
