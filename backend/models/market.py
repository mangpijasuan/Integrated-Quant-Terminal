from pydantic import BaseModel
from typing import Optional


class MarketItem(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float
    change_abs: float


class MoverItem(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float


class MoversResponse(BaseModel):
    gainers: list[MoverItem]
    losers: list[MoverItem]


class MoodResponse(BaseModel):
    score: int
    label: str
    vix: float
    sp500_trend: str
    description: str


class WatchlistItem(BaseModel):
    id: int
    symbol: str
    name: str
    price: float
    change_pct: float
    volume: str


class WatchlistAdd(BaseModel):
    symbol: str


class AnalyzeRequest(BaseModel):
    ticker: str


class PersonaInsight(BaseModel):
    name: str
    stance: str
    quote: str


class AnalystReport(BaseModel):
    ticker: str
    company_name: str
    current_price: float
    currency: str
    market_cap: float
    pe_ratio: Optional[float]
    sector: str
    industry: str
    verdict: str
    confidence: int
    target_price: float
    upside_pct: float
    bull_thesis: list[str]
    bear_thesis: list[str]
    key_risks: list[str]
    dcf_estimate: Optional[float]
    summary: str
    personas: list[PersonaInsight]
    generated_at: str
