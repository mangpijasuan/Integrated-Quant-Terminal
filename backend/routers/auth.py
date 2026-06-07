import logging
from fastapi import APIRouter, HTTPException, Depends, status
import aiosqlite
from models.auth import SignupRequest, LoginRequest, TokenResponse, UserOut
from services.auth_service import hash_password, verify_password, create_token, get_current_user
from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest, db: aiosqlite.Connection = Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    async with db.execute("SELECT id FROM users WHERE email = ?", (body.email.lower(),)) as cur:
        if await cur.fetchone():
            logger.warning(f"Signup attempt with existing email: {body.email}")
            raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(body.password)
    try:
        async with db.execute(
            "INSERT INTO users (name, email, hashed_password) VALUES (?, ?, ?) RETURNING id, name, email, plan",
            (body.name.strip(), body.email.lower(), hashed),
        ) as cur:
            row = await cur.fetchone()
        await db.commit()
        logger.info(f"User signed up: {body.email}")
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Signup failed")

    user = UserOut(id=row[0], name=row[1], email=row[2], plan=row[3])
    return TokenResponse(access_token=create_token(user.id), user=user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT id, name, email, hashed_password, plan FROM users WHERE email = ?",
        (body.email.lower(),),
    ) as cur:
        row = await cur.fetchone()

    if not row or not verify_password(body.password, row[3]):
        logger.warning(f"Failed login attempt: {body.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    logger.info(f"User logged in: {body.email}")
    user = UserOut(id=row[0], name=row[1], email=row[2], plan=row[4])
    return TokenResponse(access_token=create_token(user.id), user=user)


@router.get("/me")
async def me(user=Depends(get_current_user), db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT id, name, email, plan, created_at FROM users WHERE id = ?", (user["id"],)
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    async with db.execute(
        "SELECT plan, analyses_today, created_at FROM users WHERE id = ?", (user["id"],)
    ) as cur2:
        extra = await cur2.fetchone()

    plan = (extra[0] if extra else None) or "free"
    analyses_today = extra[1] if extra else 0
    return {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "plan": plan,
        "created_at": row[4],
        "analyses_today": analyses_today or 0,
        "analyses_limit": 999 if plan == "pro" else 5,
    }
