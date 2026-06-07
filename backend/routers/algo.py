from typing import Literal

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.auth_service import get_current_user
from services import algo_service
from services import lean_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/algo", tags=["algo"])


class BacktestRequest(BaseModel):
    symbol: str
    strategy: str
    start_date: str
    end_date: str
    initial_capital: float = 10000.0
    engine: Literal["builtin", "lean"] = "builtin"


@router.get("/lean/status")
async def lean_status(user=Depends(get_current_user)):
    return lean_service.get_status()


@router.post("/backtest")
async def backtest(body: BacktestRequest, user=Depends(get_current_user)):
    try:
        if body.engine == "lean":
            return await lean_service.run_backtest(
                symbol=body.symbol.upper(),
                strategy=body.strategy,
                start_date=body.start_date,
                end_date=body.end_date,
                initial_capital=body.initial_capital,
            )
        result = await algo_service.run_backtest(
            symbol=body.symbol.upper(),
            strategy=body.strategy,
            start_date=body.start_date,
            end_date=body.end_date,
            initial_capital=body.initial_capital,
        )
        result["engine"] = "builtin"
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Backtest failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e))
