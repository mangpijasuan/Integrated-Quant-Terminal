from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from services.auth_service import get_current_user
from services import copilot_service

router = APIRouter(prefix="/copilot", tags=["copilot"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


@router.post("/chat")
async def chat(body: ChatRequest, user=Depends(get_current_user)):
    try:
        response = await copilot_service.chat(
            message=body.message,
            history=[{"role": m.role, "content": m.content} for m in body.history],
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
