"""GET /api/threads/{thread_id} — placeholder until LangGraph memory is wired."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import ThreadHistory

router = APIRouter()


@router.get("/threads/{thread_id}", response_model=ThreadHistory)
async def get_thread(thread_id: str) -> ThreadHistory:
    # Stub — Task #3 wires this to LangGraph's PostgresSaver
    return ThreadHistory(thread_id=thread_id, messages=[])
