import logging
from fastapi import APIRouter, Depends, HTTPException
from datetime import date
import aiosqlite
from models.market import AnalyzeRequest
from services.analyst_service import generate_analysis
from services.auth_service import get_current_user
from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyst", tags=["analyst"])

FREE_DAILY_LIMIT = 5
PRO_DAILY_LIMIT = 999


@router.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    ticker = body.ticker.upper().strip()
    if not ticker or not ticker.replace('.', '').isalnum():
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")

    # Rate limiting by plan
    today = str(date.today())
    async with db.execute(
        "SELECT analyses_today, analyses_reset_date, plan FROM users WHERE id = ?",
        (user["id"],),
    ) as cur:
        row = await cur.fetchone()

    count = row[0] if row[1] == today else 0
    plan = row[2]
    limit = FREE_DAILY_LIMIT if plan == "free" else PRO_DAILY_LIMIT

    if count >= limit:
        logger.warning(f"Rate limit exceeded for user {user['id']} on {ticker}")
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {limit} analyses reached. {'Upgrade to Pro for unlimited analyses.' if plan == 'free' else 'Contact support.'}",
        )

    # Run analysis
    try:
        logger.info(f"Analyzing {ticker} for user {user['id']}")
        report = await generate_analysis(ticker)
    except ValueError as e:
        logger.error(f"Validation error analyzing {ticker}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed for {ticker}: {e}", exc_info=True)
        detail = str(e).strip() or "Analysis failed. Please try again."
        if "Ollama" in detail or "11434" in detail:
            detail = "Ollama is not running. Start the Ollama app and retry."
        raise HTTPException(status_code=502, detail=detail)

    # Update usage counter
    try:
        await db.execute(
            "UPDATE users SET analyses_today = ?, analyses_reset_date = ? WHERE id = ?",
            (count + 1, today, user["id"]),
        )
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to update usage counter: {e}")
        # Don't fail the entire request if we can't update the counter

    logger.info(f"Successfully analyzed {ticker} for user {user['id']}")
    return report
