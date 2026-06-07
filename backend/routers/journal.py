from datetime import date

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import get_db
from services.auth_service import get_current_user
from services.journal_service import (
    DEFAULT_STARTING_CAPITAL,
    build_summary,
    trade_row_to_dict,
)

router = APIRouter(prefix="/journal", tags=["journal"])


class JournalSettingsUpdate(BaseModel):
    starting_capital: float = Field(gt=0)


class TradeCreate(BaseModel):
    symbol: str
    side: str  # long | short
    qty: float = Field(gt=0)
    entry_price: float = Field(gt=0)
    exit_price: float | None = None
    entry_date: str | None = None
    exit_date: str | None = None
    fees: float = Field(default=0, ge=0)
    strategy: str | None = None
    notes: str | None = None


class TradeUpdate(BaseModel):
    symbol: str | None = None
    side: str | None = None
    qty: float | None = Field(default=None, gt=0)
    entry_price: float | None = Field(default=None, gt=0)
    exit_price: float | None = None
    entry_date: str | None = None
    exit_date: str | None = None
    fees: float | None = Field(default=None, ge=0)
    strategy: str | None = None
    notes: str | None = None


async def _ensure_settings(db: aiosqlite.Connection, user_id: int) -> float:
    async with db.execute(
        "SELECT starting_capital FROM journal_settings WHERE user_id = ?",
        (user_id,),
    ) as cur:
        row = await cur.fetchone()
    if row:
        return float(row[0])

    await db.execute(
        "INSERT INTO journal_settings (user_id, starting_capital) VALUES (?, ?)",
        (user_id, DEFAULT_STARTING_CAPITAL),
    )
    await db.commit()
    return DEFAULT_STARTING_CAPITAL


async def _fetch_trades(db: aiosqlite.Connection, user_id: int) -> list[dict]:
    async with db.execute(
        """
        SELECT id, symbol, side, qty, entry_price, exit_price,
               entry_date, exit_date, fees, strategy, notes, created_at
        FROM journal_trades
        WHERE user_id = ?
        ORDER BY entry_date DESC, id DESC
        """,
        (user_id,),
    ) as cur:
        rows = await cur.fetchall()
    return [trade_row_to_dict(r) for r in rows]


def _validate_side(side: str) -> str:
    s = side.lower().strip()
    if s not in ("long", "short"):
        raise HTTPException(status_code=400, detail="side must be 'long' or 'short'")
    return s


@router.get("/summary")
async def summary(
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    starting = await _ensure_settings(db, user["id"])
    trades = await _fetch_trades(db, user["id"])
    return build_summary(starting, trades)


@router.get("/trades")
async def list_trades(
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    await _ensure_settings(db, user["id"])
    return await _fetch_trades(db, user["id"])


@router.post("/trades")
async def create_trade(
    body: TradeCreate,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    await _ensure_settings(db, user["id"])
    symbol = body.symbol.upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    side = _validate_side(body.side)
    entry_date = body.entry_date or date.today().isoformat()
    exit_date = body.exit_date
    if body.exit_price is not None and not exit_date:
        exit_date = date.today().isoformat()

    async with db.execute(
        """
        INSERT INTO journal_trades
            (user_id, symbol, side, qty, entry_price, exit_price,
             entry_date, exit_date, fees, strategy, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id, symbol, side, qty, entry_price, exit_price,
                  entry_date, exit_date, fees, strategy, notes, created_at
        """,
        (
            user["id"],
            symbol,
            side,
            body.qty,
            body.entry_price,
            body.exit_price,
            entry_date,
            exit_date,
            body.fees,
            body.strategy,
            body.notes,
        ),
    ) as cur:
        row = await cur.fetchone()
    await db.commit()
    return trade_row_to_dict(row)


@router.put("/trades/{trade_id}")
async def update_trade(
    trade_id: int,
    body: TradeUpdate,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        """
        SELECT id, symbol, side, qty, entry_price, exit_price,
               entry_date, exit_date, fees, strategy, notes, created_at
        FROM journal_trades WHERE id = ? AND user_id = ?
        """,
        (trade_id, user["id"]),
    ) as cur:
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")

    fields = {
        "symbol": body.symbol.upper().strip() if body.symbol else existing["symbol"],
        "side": _validate_side(body.side) if body.side else existing["side"],
        "qty": body.qty if body.qty is not None else existing["qty"],
        "entry_price": body.entry_price if body.entry_price is not None else existing["entry_price"],
        "exit_price": body.exit_price if body.exit_price is not None else existing["exit_price"],
        "entry_date": body.entry_date if body.entry_date is not None else existing["entry_date"],
        "exit_date": body.exit_date if body.exit_date is not None else existing["exit_date"],
        "fees": body.fees if body.fees is not None else existing["fees"],
        "strategy": body.strategy if body.strategy is not None else existing["strategy"],
        "notes": body.notes if body.notes is not None else existing["notes"],
    }

    if body.exit_price is not None and body.exit_date is None and not existing["exit_date"]:
        fields["exit_date"] = date.today().isoformat()

    await db.execute(
        """
        UPDATE journal_trades SET
            symbol = ?, side = ?, qty = ?, entry_price = ?, exit_price = ?,
            entry_date = ?, exit_date = ?, fees = ?, strategy = ?, notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
        """,
        (
            fields["symbol"],
            fields["side"],
            fields["qty"],
            fields["entry_price"],
            fields["exit_price"],
            fields["entry_date"],
            fields["exit_date"],
            fields["fees"],
            fields["strategy"],
            fields["notes"],
            trade_id,
            user["id"],
        ),
    )
    await db.commit()

    async with db.execute(
        """
        SELECT id, symbol, side, qty, entry_price, exit_price,
               entry_date, exit_date, fees, strategy, notes, created_at
        FROM journal_trades WHERE id = ?
        """,
        (trade_id,),
    ) as cur:
        row = await cur.fetchone()
    return trade_row_to_dict(row)


@router.delete("/trades/{trade_id}")
async def delete_trade(
    trade_id: int,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "DELETE FROM journal_trades WHERE id = ? AND user_id = ?",
        (trade_id, user["id"]),
    ) as cur:
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Trade not found")
    await db.commit()
    return {"ok": True}


@router.patch("/settings")
async def update_settings(
    body: JournalSettingsUpdate,
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    await _ensure_settings(db, user["id"])
    await db.execute(
        """
        INSERT INTO journal_settings (user_id, starting_capital, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            starting_capital = excluded.starting_capital,
            updated_at = CURRENT_TIMESTAMP
        """,
        (user["id"], body.starting_capital),
    )
    await db.commit()
    trades = await _fetch_trades(db, user["id"])
    return build_summary(body.starting_capital, trades)
