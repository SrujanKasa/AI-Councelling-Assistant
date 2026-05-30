from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils import get_current_user
from datetime import datetime, timezone
import os
import uuid
import anthropic

router = APIRouter(prefix="/api/counselor", tags=["counselor"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    exam_type: Optional[str] = None
    rank: Optional[int] = None
    category: Optional[str] = None


async def _get_db(request: Request):
    return request.app.state.db


SYSTEM_PROMPT = """You are an expert AI college counselor named "Hynexs AI Counselor" specializing in:
- TS EAMCET (Telangana State Engineering Agriculture and Medical Common Entrance Test)
- JoSAA (Joint Seat Allocation Authority) for IITs, NITs, and IIITs

You help students with:
- College selection based on rank and category
- Understanding seat types (OPEN, OBC-NCL, EWS, SC, ST) and Telangana categories (OC, BC_A-E, SC, ST)
- Safe vs Target vs Dream college strategy
- Branch selection (CSE, ECE, EEE, Mechanical, Civil, etc.)
- Fee structures and placement statistics
- Counseling round strategies
- Cutoff trends from 2023-2025

Be concise, specific, and data-driven. Use real college names. Do NOT hallucinate data.
When unsure, say "Based on recent trends..." rather than making up specific numbers."""


@router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    db = await _get_db(request)

    # Optional auth
    user = None
    try:
        user = await get_current_user(request, db)
    except Exception:
        pass

    if user and not user.get("is_premium"):
        conv_count = await db.conversations.count_documents({"user_id": user.get("uid", "")})
        msg_count = 0
        if conv_count > 0:
            cursor = db.conversations.find({"user_id": user.get("uid", "")})
            async for conv in cursor:
                msg_count += len(conv.get("messages", []))
        if msg_count >= 10:
            raise HTTPException(
                status_code=402,
                detail="Free message limit reached. Upgrade to Premium for unlimited AI counseling."
            )

    session_id = req.session_id or str(uuid.uuid4())

    context_parts = []
    if req.rank:
        context_parts.append(f"Student rank: {req.rank}")
    if req.category:
        context_parts.append(f"Category: {req.category}")
    if req.exam_type:
        context_parts.append(f"Exam: {req.exam_type}")

    conv = None
    if user:
        conv = await db.conversations.find_one(
            {"user_id": user["uid"], "session_id": session_id}
        )

    history_text = ""
    if conv and conv.get("messages"):
        recent = conv["messages"][-6:]
        history_text = "\n".join([
            f"{m['role'].upper()}: {m['content']}" for m in recent
        ])

    full_message = req.message
    if context_parts:
        full_message = f"[Context: {', '.join(context_parts)}]\n{req.message}"
    if history_text:
        full_message = f"Previous conversation:\n{history_text}\n\nStudent: {req.message}"

    try:
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": full_message}]
        )
        ai_response = response.content[0].text
    except Exception as e:
        ai_response = (
            "I'm having trouble connecting right now. Please try again in a moment. "
            f"Error: {str(e)[:100]}"
        )

    if user:
        new_messages = [
            {"role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"role": "assistant", "content": ai_response, "timestamp": datetime.now(timezone.utc).isoformat()},
        ]

        if conv:
            await db.conversations.update_one(
                {"user_id": user["uid"], "session_id": session_id},
                {
                    "$push": {"messages": {"$each": new_messages}},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                },
            )
        else:
            await db.conversations.insert_one({
                "user_id": user["uid"],
                "session_id": session_id,
                "exam_type": req.exam_type,
                "messages": new_messages,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })

    return {"response": ai_response, "session_id": session_id}


@router.get("/sessions")
async def get_sessions(request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)
    cursor = db.conversations.find(
        {"user_id": user["uid"]},
        {"_id": 0, "session_id": 1, "exam_type": 1, "created_at": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(10)
    sessions = await cursor.to_list(10)
    return sessions


@router.get("/session/{session_id}")
async def get_session(session_id: str, request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)
    conv = await db.conversations.find_one(
        {"user_id": user["uid"], "session_id": session_id}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    return conv
