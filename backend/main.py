import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from services.ai_service import active_provider, check_ollama
from database import init_db
from routers import auth, market, watchlist, analyst, trading, options, copilot, algo, settings_router, journal

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Integrated Quant Terminal API")
    await init_db()
    logger.info("✅ Database initialized")
    provider = active_provider()
    logger.info("🤖 AI provider: %s", provider)
    if provider == "ollama":
        ollama_status = await check_ollama()
        if ollama_status.get("reachable"):
            logger.info("✅ Ollama reachable at %s (model: %s)", settings.ollama_base_url, settings.ollama_model)
        else:
            logger.warning("⚠️  Ollama not reachable: %s", ollama_status.get("error"))
    if settings.jwt_secret in ("", "your-secure-random-secret-min-32-chars"):
        logger.warning("⚠️  JWT_SECRET is weak or default — set a strong random value in backend/.env")
    yield
    logger.info("🛑 Shutting down Integrated Quant Terminal API")


app = FastAPI(
    title="Integrated Quant Terminal API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global error handler
@app.middleware("http")
async def error_handler(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )


app.include_router(auth.router)
app.include_router(market.router)
app.include_router(watchlist.router)
app.include_router(analyst.router)
app.include_router(trading.router)
app.include_router(options.router)
app.include_router(copilot.router)
app.include_router(algo.router)
app.include_router(settings_router.router)
app.include_router(journal.router)


@app.get("/health")
async def health():
    provider = active_provider()
    payload: dict = {
        "status": "ok",
        "service": "Integrated Quant Terminal API",
        "ai_provider": provider,
    }
    if provider == "ollama":
        payload["ollama"] = await check_ollama()
    return payload
