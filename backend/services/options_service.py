import json
import re
import logging
from typing import Any

from services import ibkr_service
from services.ai_service import complete

logger = logging.getLogger(__name__)


async def get_chain(symbol: str, expiry: str | None = None) -> dict:
    return await ibkr_service.get_options_chain(symbol.upper(), expiry)


def _extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())
    raise ValueError(f"Could not parse JSON from response: {text[:200]!r}")


async def get_ai_strategy(symbol: str, current_price: float, expiry: str) -> dict:
    prompt = f"""You are an expert options trader using Interactive Brokers. Suggest the optimal options strategy for {symbol} currently at ${current_price:.2f}, expiry {expiry}.

Return ONLY a valid JSON object, no markdown, no explanation outside the JSON:
{{
  "strategy": "strategy name",
  "rationale": "1-2 sentence explanation",
  "legs": [
    {{"type": "call", "strike": 150.0, "expiry": "{expiry}", "action": "Buy", "qty": 1}}
  ],
  "max_profit": "Unlimited",
  "max_loss": "$500",
  "breakeven": "$155.00"
}}"""

    try:
        text = await complete(
            prompt,
            json_mode=True,
            temperature=0.3,
            max_tokens=1024,
        )
        return _extract_json(text)
    except Exception as e:
        logger.error("AI strategy generation failed: %s", e)
        return {
            "strategy": "Long Call (default)",
            "rationale": f"AI strategy unavailable. A simple long call on {symbol} gives upside exposure with defined risk.",
            "legs": [{
                "type": "call",
                "strike": round(current_price * 1.05, 0),
                "expiry": expiry,
                "action": "Buy",
                "qty": 1,
            }],
            "max_profit": "Unlimited",
            "max_loss": "Premium paid",
            "breakeven": f"${current_price * 1.05:.2f} + premium",
        }


async def execute_leg(
    symbol: str,
    strike: float,
    expiry: str,
    option_type: str,
    side: str,
    qty: float = 1,
    order_type: str = "market",
    limit_price: float | None = None,
) -> dict:
    action = "buy" if side.lower() in ("buy", "b") else "sell"
    return await ibkr_service.place_option_order(
        symbol=symbol.upper(),
        strike=strike,
        expiry=expiry,
        right=option_type,
        side=action,
        qty=qty,
        order_type=order_type,
        limit_price=limit_price,
    )


async def execute_strategy(legs: list[dict]) -> list[dict]:
    results = []
    for leg in legs:
        results.append(await execute_leg(
            symbol=leg["symbol"],
            strike=leg["strike"],
            expiry=leg["expiry"],
            option_type=leg["type"],
            side=leg["action"],
            qty=leg.get("qty", 1),
        ))
    return results
