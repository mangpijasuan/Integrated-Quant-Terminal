import asyncio
from datetime import datetime, timezone
import logging

import httpx
import numpy as np

logger = logging.getLogger(__name__)


async def run_backtest(
    symbol: str,
    strategy: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
) -> dict:
    def _run():
        closes, dates = _fetch_history(symbol, start_date, end_date)
        if len(closes) < 2:
            raise ValueError(f"No price history for {symbol} between {start_date} and {end_date}")

        signals = _generate_signals(strategy, closes)
        return _compute_stats(symbol, strategy, closes, signals, dates, initial_capital, start_date, end_date)

    return await asyncio.get_event_loop().run_in_executor(None, _run)


def _fetch_history(symbol: str, start_date: str, end_date: str) -> tuple[np.ndarray, list]:
    closes, dates = _yahoo_chart_history(symbol, start_date, end_date)
    if len(closes) >= 2:
        return closes, dates

    try:
        import yfinance as yf

        df = yf.download(symbol, start=start_date, end=end_date, progress=False, threads=False)
        if not df.empty:
            series = df["Close"].squeeze()
            return series.values.astype(float), list(df.index)
    except Exception as exc:
        logger.debug("yfinance backtest fallback failed for %s: %s", symbol, exc)

    return closes, dates


def _yahoo_chart_history(symbol: str, start_date: str, end_date: str) -> tuple[np.ndarray, list]:
    start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
    end_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
    period1 = int(start_dt.timestamp())
    period2 = int(end_dt.timestamp()) + 86400

    try:
        with httpx.Client(timeout=20.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
                params={"interval": "1d", "period1": period1, "period2": period2},
            )
            response.raise_for_status()
            payload = response.json()
        result = payload["chart"]["result"][0]
        timestamps = result.get("timestamp") or []
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close") or []
    except Exception as exc:
        logger.debug("Yahoo chart history failed for %s: %s", symbol, exc)
        return np.array([]), []

    prices: list[float] = []
    dates: list = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        prices.append(float(close))
        dates.append(datetime.fromtimestamp(ts, tz=timezone.utc))

    return np.array(prices, dtype=float), dates


def _generate_signals(strategy: str, closes: np.ndarray) -> np.ndarray:
    n = len(closes)
    signals = np.zeros(n)

    if strategy == "rsi_mean_reversion":
        rsi = _rsi(closes, 14)
        for i in range(1, n):
            if rsi[i] < 30 and rsi[i - 1] >= 30:
                signals[i] = 1
            elif rsi[i] > 70 and rsi[i - 1] <= 70:
                signals[i] = -1

    elif strategy == "ma_crossover":
        ma50 = _sma(closes, 50)
        ma200 = _sma(closes, 200)
        for i in range(1, n):
            if ma50[i] > ma200[i] and ma50[i - 1] <= ma200[i - 1]:
                signals[i] = 1
            elif ma50[i] < ma200[i] and ma50[i - 1] >= ma200[i - 1]:
                signals[i] = -1

    elif strategy == "macd_momentum":
        macd, signal_line = _macd(closes)
        for i in range(1, n):
            if macd[i] > signal_line[i] and macd[i - 1] <= signal_line[i - 1]:
                signals[i] = 1
            elif macd[i] < signal_line[i] and macd[i - 1] >= signal_line[i - 1]:
                signals[i] = -1

    elif strategy == "bollinger_bands":
        upper, lower = _bollinger(closes, 20, 2)
        for i in range(1, n):
            if closes[i] < lower[i] and closes[i - 1] >= lower[i - 1]:
                signals[i] = 1
            elif closes[i] > upper[i] and closes[i - 1] <= upper[i - 1]:
                signals[i] = -1

    return signals


def _compute_stats(symbol, strategy, closes, signals, dates, initial_capital, start_date, end_date):
    capital = initial_capital
    shares = 0.0
    trades = []
    entry_price = 0.0

    for i, sig in enumerate(signals):
        if sig == 1 and shares == 0:
            shares = capital / closes[i]
            entry_price = closes[i]
            capital = 0.0
        elif sig == -1 and shares > 0:
            capital = shares * closes[i]
            trades.append(closes[i] > entry_price)
            shares = 0.0

    if shares > 0:
        capital = shares * closes[-1]
        trades.append(closes[-1] > entry_price)

    final_value = capital
    total_return = (final_value - initial_capital) / initial_capital * 100
    bh_return = (closes[-1] - closes[0]) / closes[0] * 100

    days = (datetime.fromisoformat(end_date) - datetime.fromisoformat(start_date)).days or 1
    years = days / 365.25
    annualized = ((1 + total_return / 100) ** (1 / years) - 1) * 100 if years > 0 else 0

    daily_returns = np.diff(closes) / closes[:-1]
    sharpe = (daily_returns.mean() / daily_returns.std() * np.sqrt(252)) if daily_returns.std() > 0 else 0.0

    peak = np.maximum.accumulate(closes)
    drawdown = (closes - peak) / peak
    max_dd = float(drawdown.min() * 100)

    win_rate = (sum(trades) / len(trades) * 100) if trades else 0.0

    return {
        "symbol": symbol,
        "strategy": strategy,
        "start_date": start_date,
        "end_date": end_date,
        "total_return": round(float(total_return), 2),
        "annualized_return": round(float(annualized), 2),
        "sharpe_ratio": round(float(sharpe), 2),
        "max_drawdown": round(float(abs(max_dd)), 2),
        "win_rate": round(float(win_rate), 1),
        "total_trades": int(len(trades)),
        "profitable_trades": int(sum(trades)),
        "buy_hold_return": round(float(bh_return), 2),
        "alpha": round(float(total_return - bh_return), 2),
        "final_value": round(float(final_value), 2),
    }


def _rsi(prices: np.ndarray, period: int = 14) -> np.ndarray:
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = np.convolve(gains, np.ones(period) / period, "same")
    avg_loss = np.convolve(losses, np.ones(period) / period, "same")
    rs = np.where(avg_loss != 0, avg_gain / avg_loss, 100.0)
    rsi = 100 - (100 / (1 + rs))
    return np.concatenate([[50.0], rsi])


def _sma(prices: np.ndarray, period: int) -> np.ndarray:
    result = np.full_like(prices, np.nan)
    for i in range(period - 1, len(prices)):
        result[i] = prices[i - period + 1:i + 1].mean()
    return np.nan_to_num(result, nan=prices[0])


def _macd(prices: np.ndarray) -> tuple:
    ema12 = _ema(prices, 12)
    ema26 = _ema(prices, 26)
    macd = ema12 - ema26
    signal = _ema(macd, 9)
    return macd, signal


def _ema(prices: np.ndarray, period: int) -> np.ndarray:
    alpha = 2 / (period + 1)
    result = np.zeros_like(prices)
    result[0] = prices[0]
    for i in range(1, len(prices)):
        result[i] = alpha * prices[i] + (1 - alpha) * result[i - 1]
    return result


def _bollinger(prices: np.ndarray, period: int = 20, std_mult: float = 2) -> tuple:
    upper = np.zeros_like(prices)
    lower = np.zeros_like(prices)
    for i in range(period - 1, len(prices)):
        window = prices[i - period + 1:i + 1]
        mid = window.mean()
        std = window.std()
        upper[i] = mid + std_mult * std
        lower[i] = mid - std_mult * std
    return upper, lower
