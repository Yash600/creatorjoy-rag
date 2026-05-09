"""GET /api/chat (SSE) — placeholder until Task #3 lands the LangGraph agent.

This file exists so app.main can import it without crashing. It returns a
clear 501 so the frontend gets a useful error if someone wires the chat UI
before the agent is built.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/chat")
async def chat_stream() -> None:
    raise HTTPException(
        status_code=501,
        detail="chat endpoint not yet implemented (Task #3)",
    )
