from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from services.auth_service import get_current_user
from services import options_service

router = APIRouter(prefix="/options", tags=["options"])


class StrategyRequest(BaseModel):
    symbol: str
    current_price: float
    expiry: str


class OptionOrderRequest(BaseModel):
    symbol: str
    strike: float
    expiry: str
    type: str = "call"          # call | put
    side: str = "buy"           # buy | sell
    qty: float = 1
    order_type: str = "market"
    limit_price: Optional[float] = None


class ExecuteStrategyRequest(BaseModel):
    symbol: str
    legs: list[dict]


@router.get("/chain/{symbol}")
async def options_chain(symbol: str, expiry: str | None = None, user=Depends(get_current_user)):
    try:
        return await options_service.get_chain(symbol.upper(), expiry)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/strategy")
async def ai_strategy(body: StrategyRequest, user=Depends(get_current_user)):
    try:
        return await options_service.get_ai_strategy(
            symbol=body.symbol,
            current_price=body.current_price,
            expiry=body.expiry,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/orders")
async def place_option_order(body: OptionOrderRequest, user=Depends(get_current_user)):
    try:
        return await options_service.execute_leg(
            symbol=body.symbol,
            strike=body.strike,
            expiry=body.expiry,
            option_type=body.type,
            side=body.side,
            qty=body.qty,
            order_type=body.order_type,
            limit_price=body.limit_price,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/strategy/execute")
async def execute_strategy(body: ExecuteStrategyRequest, user=Depends(get_current_user)):
    try:
        legs = [{**leg, "symbol": leg.get("symbol") or body.symbol} for leg in body.legs]
        return await options_service.execute_strategy(legs)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
