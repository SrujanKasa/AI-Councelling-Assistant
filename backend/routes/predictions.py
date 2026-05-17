from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from utils import get_current_user, classify_college
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

JOSAA_SEAT_MAP = {
    "OPEN": "OPEN",
    "General": "OPEN",
    "OBC": "OBC-NCL",
    "OBC-NCL": "OBC-NCL",
    "EWS": "EWS",
    "SC": "SC",
    "ST": "ST",
}

TS_CATEGORY_MAP = {
    "OC": "OC",
    "General": "OC",
    "BC_A": "BC_A",
    "BC_B": "BC_B",
    "BC_C": "BC_C",
    "BC_D": "BC_D",
    "BC_E": "BC_E",
    "SC": "SC",
    "ST": "ST",
    "EWS": "EWS",
}


class PredictRequest(BaseModel):
    exam_type: str  # TSEAMCET or JOSAA
    rank: int
    category: str
    gender: str  # Male/Female
    preferred_branches: Optional[List[str]] = None
    quota: Optional[str] = "AI"  # JOSAA quota


async def _get_db(request: Request):
    return request.app.state.db


async def generate_ai_insight(rank: int, exam_type: str, category: str,
                               safe: list, target: list, dream: list) -> str:
    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"insight_{rank}_{category}",
            system_message=(
                "You are an expert Indian college counselor specializing in TS EAMCET and JoSAA admissions. "
                "Give precise, data-driven advice in 3-4 sentences. Be specific about college/branch names."
            ),
        ).with_model("gemini", "gemini-3-flash-preview")

        safe_list = [f"{r['institute']} - {r['branch']}" for r in safe[:3]]
        target_list = [f"{r['institute']} - {r['branch']}" for r in target[:3]]
        dream_list = [f"{r['institute']} - {r['branch']}" for r in dream[:3]]

        msg = UserMessage(
            text=(
                f"Student rank: {rank}, Exam: {exam_type}, Category: {category}.\n"
                f"Safe colleges: {', '.join(safe_list) if safe_list else 'None'}\n"
                f"Target colleges: {', '.join(target_list) if target_list else 'None'}\n"
                f"Dream colleges: {', '.join(dream_list) if dream_list else 'None'}\n"
                "Generate personalized counseling advice with probability assessment and rank-based strategy."
            )
        )
        return await chat.send_message(msg)
    except Exception as e:
        return (
            f"Based on your rank {rank} in {exam_type} under {category} category, "
            "you have strong admission prospects. Focus on target colleges for best outcomes."
        )


@router.post("/predict")
async def predict(req: PredictRequest, request: Request):
    db = await _get_db(request)

    # Optionally check auth (allow anonymous for demo)
    user = None
    try:
        user = await get_current_user(request, db)
    except Exception:
        pass

    results = []

    if req.exam_type == "TSEAMCET":
        category = TS_CATEGORY_MAP.get(req.category, req.category)
        gender_filter = "BOYS" if req.gender.lower() in ("male", "boys") else "GIRLS"

        # Use most recent year data
        query = {
            "year": {"$in": [2025, 2024, 2023]},
            "category": category,
            "gender": gender_filter,
            "last_rank": {"$gt": 0},
        }

        cursor = db.ts_eamcet_cutoffs.find(query, {"_id": 0}).sort("last_rank", 1).limit(500)
        rows = await cursor.to_list(500)

        # Get latest year per college+branch combination
        best = {}
        for row in rows:
            key = (row.get("college_name", ""), row.get("branch_name", ""))
            if key not in best or row.get("year", 0) > best[key].get("year", 0):
                best[key] = row

        for row in best.values():
            cat, prob = classify_college(req.rank, row.get("last_rank", 0))
            results.append({
                "institute": row.get("college_name", "Unknown"),
                "branch": row.get("branch_name", "Unknown"),
                "college_code": row.get("college_code", ""),
                "category": cat,
                "probability": prob,
                "closing_rank": row.get("last_rank", 0),
                "year": row.get("year", 2025),
                "fees": "N/A",
            })

    elif req.exam_type == "JOSAA":
        seat_type = JOSAA_SEAT_MAP.get(req.category, "OPEN")
        gender_filter = "Gender-Neutral"
        if req.gender.lower() in ("female", "girls"):
            gender_filter = "Female-only (including Supernumerary)"

        quota = req.quota or "AI"
        query = {
            "year": {"$in": [2025, 2024, 2023]},
            "seat_type": seat_type,
            "quota": quota,
            "gender": gender_filter,
            "closing_rank": {"$gt": 0},
        }

        cursor = db.josaa_cutoffs.find(query, {"_id": 0}).sort("closing_rank", 1).limit(500)
        rows = await cursor.to_list(500)

        best = {}
        for row in rows:
            key = (row.get("institute_name", ""), row.get("program_name", ""))
            if key not in best or row.get("year", 0) > best[key].get("year", 0):
                best[key] = row

        for row in best.values():
            cat, prob = classify_college(req.rank, row.get("closing_rank", 0))
            results.append({
                "institute": row.get("institute_name", "Unknown"),
                "branch": row.get("program_name", "Unknown"),
                "category": cat,
                "probability": prob,
                "closing_rank": row.get("closing_rank", 0),
                "opening_rank": row.get("opening_rank", 0),
                "round": row.get("round", 1),
                "year": row.get("year", 2025),
                "fees": "N/A",
            })

    # Sort: Safe first, then Target, then Dream; within each by probability desc
    order = {"Safe": 0, "Target": 1, "Dream": 2, "Unknown": 3}
    results.sort(key=lambda x: (order.get(x["category"], 3), -x["probability"]))

    safe = [r for r in results if r["category"] == "Safe"][:10]
    target = [r for r in results if r["category"] == "Target"][:10]
    dream = [r for r in results if r["category"] == "Dream"][:10]

    # Generate AI insight
    ai_insight = await generate_ai_insight(
        req.rank, req.exam_type, req.category, safe, target, dream
    )

    # Save prediction if user logged in
    if user:
        pred_doc = {
            "user_id": user["uid"],
            "exam_type": req.exam_type,
            "rank": req.rank,
            "category": req.category,
            "gender": req.gender,
            "results": results[:30],
            "ai_insight": ai_insight,
            "created_at": __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat(),
        }
        await db.predictions.insert_one(pred_doc)

    return {
        "safe": safe,
        "target": target,
        "dream": dream,
        "ai_insight": ai_insight,
        "total": len(results),
    }


@router.get("/my")
async def get_my_predictions(request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)
    cursor = db.predictions.find(
        {"user_id": user["uid"]}, {"_id": 0}
    ).sort("created_at", -1).limit(20)
    preds = await cursor.to_list(20)
    return preds
