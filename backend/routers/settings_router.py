from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.auth_service import get_current_user
from config import settings
from services import ibkr_service

router = APIRouter(prefix="/settings", tags=["settings"])


class IBKRSettingsUpdate(BaseModel):
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 4002
    ibkr_client_id: int = 10
    ibkr_account: str = ""


@router.get("/broker")
async def get_broker_settings(user=Depends(get_current_user)):
    status = await ibkr_service.get_status_async()
    return {
        "broker": "ibkr",
        "ibkr_host": settings.ibkr_host,
        "ibkr_port": settings.ibkr_port,
        "ibkr_client_id": settings.ibkr_client_id,
        "ibkr_account": settings.ibkr_account,
        "connected": status.get("connected", False),
        "message": status.get("message", ""),
        "accounts": status.get("accounts", []),
    }


@router.post("/broker")
async def update_broker_settings(body: IBKRSettingsUpdate, user=Depends(get_current_user)):
    """
    In production this would persist per-user broker settings.
    For local dev, update backend/.env and restart the server.
    """
    return {
        "ok": True,
        "message": (
            "Update IBKR_HOST, IBKR_PORT, IBKR_CLIENT_ID, and IBKR_ACCOUNT in backend/.env "
            "then restart ./start.sh. Ensure IB Gateway is running and logged in."
        ),
        "example": {
            "IBKR_HOST": body.ibkr_host,
            "IBKR_PORT": body.ibkr_port,
            "IBKR_CLIENT_ID": body.ibkr_client_id,
            "IBKR_ACCOUNT": body.ibkr_account,
        },
    }


@router.get("/api-keys")
async def get_api_keys(user=Depends(get_current_user)):
    """Backward-compatible route — broker is IBKR only."""
    status = await ibkr_service.get_status_async()
    return {
        "broker": "ibkr",
        "has_ibkr": status.get("connected", False),
        "has_alpaca": False,
    }
