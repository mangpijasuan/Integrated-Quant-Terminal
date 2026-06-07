from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from services.auth_service import get_current_user
from services import ibkr_service as ibkr

router = APIRouter(prefix="/trading", tags=["trading"])


class OrderRequest(BaseModel):
    symbol: str
    qty: Optional[float] = None
    notional: Optional[float] = None
    side: str                        # "buy" | "sell"
    order_type: str = "market"       # "market" | "limit" | "stop" | "stop_limit"
    time_in_force: str = "day"
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


@router.get("/status")
async def broker_status(user=Depends(get_current_user)):
    return await ibkr.get_status_async()


@router.get("/account")
async def account(user=Depends(get_current_user)):
    try:
        return await ibkr.get_account()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/positions")
async def positions(user=Depends(get_current_user)):
    try:
        return await ibkr.get_positions()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/orders")
async def orders(status: str = "open", user=Depends(get_current_user)):
    try:
        return await ibkr.get_orders(status=status)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/orders")
async def place_order(body: OrderRequest, user=Depends(get_current_user)):
    if not body.qty and not body.notional:
        raise HTTPException(status_code=400, detail="Provide qty or notional")
    try:
        return await ibkr.place_order(
            symbol=body.symbol,
            qty=body.qty,
            side=body.side,
            order_type=body.order_type,
            time_in_force=body.time_in_force,
            limit_price=body.limit_price,
            stop_price=body.stop_price,
            notional=body.notional,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, user=Depends(get_current_user)):
    try:
        ok = await ibkr.cancel_order(order_id)
        return {"cancelled": ok}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.delete("/positions/{symbol}")
async def close_position(symbol: str, user=Depends(get_current_user)):
    try:
        return await ibkr.close_position(symbol)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/portfolio/history")
async def portfolio_history(period: str = "1M", timeframe: str = "1D", user=Depends(get_current_user)):
    raise HTTPException(
        status_code=501,
        detail="Portfolio history is not available via IBKR API in this release. Use account summary on Portfolio.",
    )


@router.get("/bars/{symbol}")
async def bars(symbol: str, timeframe: str = "1Day", limit: int = 60, user=Depends(get_current_user)):
    try:
        return await ibkr.get_bars(symbol, timeframe=timeframe, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
