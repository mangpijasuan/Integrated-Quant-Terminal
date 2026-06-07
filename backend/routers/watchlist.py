from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from models.market import WatchlistAdd
from services.auth_service import get_current_user
from services.market_service import get_quote
from database import get_db

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
async def get_watchlist(
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT id, symbol FROM watchlist WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],),
    ) as cur:
        rows = await cur.fetchall()

    items = []
    for row in rows:
        try:
            quote = await get_quote(row[1])
            items.append({"id": row[0], **quote})
        except Exception:
            items.append({
                "id": row[0], "symbol": row[1], "name": row[1],
                "price": 0.0, "change_pct": 0.0, "volume": "N/A",
            })
    return items


@router.post("")
async def add_to_watchlist(
    body: WatchlistAdd,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    symbol = body.symbol.upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    # Verify ticker exists
    try:
        quote = await get_quote(symbol)
        if quote["price"] == 0:
            raise HTTPException(status_code=404, detail=f"Ticker {symbol} not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail=f"Ticker {symbol} not found")

    try:
        async with db.execute(
            "INSERT INTO watchlist (user_id, symbol) VALUES (?, ?) RETURNING id",
            (user["id"], symbol),
        ) as cur:
            row = await cur.fetchone()
        await db.commit()
        return {"id": row[0], **quote}
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=409, detail=f"{symbol} already in watchlist")


@router.delete("/{item_id}")
async def remove_from_watchlist(
    item_id: int,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "DELETE FROM watchlist WHERE id = ? AND user_id = ?", (item_id, user["id"])
    ) as cur:
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
    await db.commit()
    return {"ok": True}
