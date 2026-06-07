from fastapi import APIRouter, Query
from services import market_service

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/overview")
async def overview():
    return await market_service.get_overview()


@router.get("/movers")
async def movers():
    return await market_service.get_movers()


@router.get("/mood")
async def mood():
    return await market_service.get_mood()


@router.get("/quote/{symbol}")
async def quote(symbol: str):
    return await market_service.get_quote(symbol.upper())


@router.get("/quotes")
async def quotes(symbols: str = Query(..., description="Comma-separated symbols")):
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    return await market_service.get_quotes(sym_list)


@router.get("/news")
async def news(symbol: str = Query(default=None)):
    return await market_service.get_news(symbol)
