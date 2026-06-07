import json
import logging
from datetime import datetime

from services.ai_service import active_provider, complete
from services.market_service import get_fundamentals

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are an elite institutional equity analyst at a top hedge fund.
You provide rigorous, data-driven analysis that is direct and actionable.
Always respond with valid JSON only — no markdown fences, no prose outside JSON.
Be specific with numbers where possible. Keep each bullet point concise (1-2 sentences max)."""


def _fmt_pct(value, default=0.0) -> float:
    try:
        return float(value if value is not None else default)
    except (TypeError, ValueError):
        return default


def _build_prompt(ticker: str, f: dict) -> str:
    revenue_growth = _fmt_pct(f.get("revenue_growth")) * 100
    profit_margin = _fmt_pct(f.get("profit_margin")) * 100
    roe = _fmt_pct(f.get("roe")) * 100
    return f"""Analyze {ticker} ({f.get('long_name', ticker)}) for a retail investor.

FUNDAMENTALS:
- Price: ${f.get('price', 0)} | Market Cap: ${f.get('market_cap', 0):,.0f}
- P/E: {f.get('pe_ratio')} | Forward P/E: {f.get('forward_pe')} | EPS: {f.get('eps', 0)}
- Revenue: ${f.get('revenue', 0):,.0f} | Revenue Growth: {revenue_growth:.1f}%
- Profit Margin: {profit_margin:.1f}% | ROE: {roe:.1f}%
- Debt/Equity: {f.get('debt_equity', 0)} | Beta: {f.get('beta', 1.0)}
- Analyst Target: ${f.get('analyst_target', 0)} | 52W High: ${f.get('fifty_two_high', 0)} | 52W Low: ${f.get('fifty_two_low', 0)}
- Sector: {f.get('sector', 'Unknown')} | Industry: {f.get('industry', 'Unknown')}
- Business: {(f.get('description') or 'No description available.')[:500]}

Respond with ONLY this JSON structure (no markdown, no extra text):
{{
  "verdict": "BUY",
  "confidence": 75,
  "target_price": 210.00,
  "upside_pct": 12.5,
  "dcf_estimate": 195.00,
  "summary": "2-3 sentence executive summary here.",
  "bull_thesis": ["Point 1", "Point 2", "Point 3"],
  "bear_thesis": ["Point 1", "Point 2", "Point 3"],
  "key_risks": ["Risk 1", "Risk 2", "Risk 3", "Risk 4"],
  "personas": [
    {{"name": "Warren Buffett", "stance": "Bullish", "quote": "One sentence in Buffett's voice."}},
    {{"name": "Cathie Wood", "stance": "Bullish", "quote": "One sentence in Wood's voice."}},
    {{"name": "Ray Dalio", "stance": "Neutral", "quote": "One sentence in Dalio's voice."}}
  ]
}}

verdict must be exactly "BUY", "HOLD", or "SELL".
stance must be exactly "Bullish", "Bearish", or "Neutral"."""


def _clean_json(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return raw.strip()


async def generate_analysis(ticker: str) -> dict:
    provider = active_provider()
    logger.info("Generating analysis for %s using %s", ticker, provider)
    fundamentals = await get_fundamentals(ticker)
    prompt = _build_prompt(ticker, fundamentals)

    try:
        analysis_text = await complete(
            prompt,
            system=SYSTEM_INSTRUCTION,
            json_mode=True,
            temperature=0.4,
            max_tokens=2048,
        )
        raw = _clean_json(analysis_text)
        analysis = json.loads(raw)
        logger.info("Analysis generated successfully for %s", ticker)
    except json.JSONDecodeError as e:
        logger.error("JSON parsing error for %s: %s", ticker, e)
        raise ValueError(f"AI response was not valid JSON: {str(e)}") from e
    except Exception as e:
        logger.error("Analysis generation failed for %s: %s", ticker, e)
        raise

    return {
        "ticker": ticker.upper(),
        "company_name": fundamentals["name"],
        "current_price": fundamentals["price"],
        "currency": fundamentals["currency"],
        "market_cap": fundamentals["market_cap"],
        "pe_ratio": fundamentals["pe_ratio"],
        "sector": fundamentals["sector"],
        "industry": fundamentals["industry"],
        "verdict": analysis["verdict"],
        "confidence": int(analysis["confidence"]),
        "target_price": float(analysis["target_price"]),
        "upside_pct": float(analysis["upside_pct"]),
        "bull_thesis": analysis["bull_thesis"],
        "bear_thesis": analysis["bear_thesis"],
        "key_risks": analysis["key_risks"],
        "dcf_estimate": analysis.get("dcf_estimate"),
        "summary": analysis["summary"],
        "personas": analysis["personas"],
        "generated_at": datetime.utcnow().isoformat(),
        "ai_provider": provider,
    }
