from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from utils import get_current_user, classify_college
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

# exam_type values:
#   TSEAMCET  → TS EAMCET rank
#   JEE_MAIN  → JEE Main CRL rank → NITs, IIITs, GFTIs
#   JEE_ADVANCED → JEE Advanced rank → IITs only

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

# IIT institute name filter
IIT_KEYWORDS = ["Indian Institute of Technology"]
NIT_KEYWORDS = ["National Institute of Technology"]
IIIT_KEYWORDS = ["Indian Institute of Information Technology"]


def is_iit(name: str) -> bool:
    return any(k in name for k in IIT_KEYWORDS)


def is_nit_iiit_gfti(name: str) -> bool:
    return not is_iit(name)


class PredictRequest(BaseModel):
    exam_type: str  # TSEAMCET, JEE_MAIN, JEE_ADVANCED
    rank: int
    category: str
    gender: str  # Male/Female
    preferred_branches: Optional[List[str]] = None
    quota: Optional[str] = "AI"  # JOSAA quota (AI = All India, OS = Outside State, HS = Home State)


async def _get_db(request: Request):
    return request.app.state.db


EXAM_LABELS = {
    "TSEAMCET": "TS EAMCET",
    "JEE_MAIN": "JEE Main (NITs/IIITs/GFTIs)",
    "JEE_ADVANCED": "JEE Advanced (IITs)",
}


async def generate_ai_insight(rank: int, exam_type: str, category: str,
                               safe: list, target: list, dream: list) -> str:
    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        exam_label = EXAM_LABELS.get(exam_type, exam_type)

        if exam_type == "JEE_ADVANCED":
            sys_msg = (
                "You are an expert JoSAA IIT counselor. Give precise, data-driven advice in 3-4 sentences. "
                "Be specific about IIT names and branches. JEE Advanced rank is used for IIT admissions only."
            )
        elif exam_type == "JEE_MAIN":
            sys_msg = (
                "You are an expert JoSAA counselor for NITs, IIITs and GFTIs. Give precise, data-driven advice "
                "in 3-4 sentences. Be specific about college names. JEE Main CRL rank is used for NITs/IIITs/GFTIs."
            )
        else:
            sys_msg = (
                "You are an expert TS EAMCET counselor for Telangana engineering colleges. "
                "Give precise, data-driven advice in 3-4 sentences. Be specific about Telangana college names."
            )

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"insight_{rank}_{category}_{exam_type}",
            system_message=sys_msg,
        ).with_model("gemini", "gemini-3-flash-preview")

        safe_list = [f"{r['institute']} - {r['branch']}" for r in safe[:3]]
        target_list = [f"{r['institute']} - {r['branch']}" for r in target[:3]]
        dream_list = [f"{r['institute']} - {r['branch']}" for r in dream[:3]]

        msg = UserMessage(
            text=(
                f"Student rank: {rank} ({exam_label}), Category: {category}.\n"
                f"Safe colleges: {', '.join(safe_list) if safe_list else 'None'}\n"
                f"Target colleges: {', '.join(target_list) if target_list else 'None'}\n"
                f"Dream colleges: {', '.join(dream_list) if dream_list else 'None'}\n"
                "Generate personalized counseling advice: overall assessment, top 2 recommendations with reasoning, "
                "branch vs college trade-off if applicable, and a clear risk strategy. Keep it factual and concise."
            )
        )
        return await chat.send_message(msg)
    except Exception as e:
        return (
            f"Based on your rank {rank} in {exam_label} under {category} category, "
            "focus on your Target colleges for best placement outcomes."
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

        # Use most recent year data first, fall back to previous years
        query = {
            "year": {"$in": [2025, 2024, 2023]},
            "category": category,
            "gender": gender_filter,
            "last_rank": {"$gt": 0},
        }

        cursor = db.ts_eamcet_cutoffs.find(query, {"_id": 0}).sort([("year", -1), ("last_rank", 1)]).limit(2000)
        rows = await cursor.to_list(2000)

        # Get latest year per college+branch combination
        best = {}
        for row in rows:
            key = (row.get("college_name", ""), row.get("branch_name", ""))
            if key not in best or row.get("year", 0) > best[key].get("year", 0):
                best[key] = row

        for row in best.values():
            closing_rank = row.get("last_rank", 0)
            if closing_rank <= 0:
                continue
            cat, prob = classify_college(req.rank, closing_rank)
            results.append({
                "institute": row.get("college_name", "Unknown"),
                "branch": row.get("branch_name", "Unknown"),
                "college_code": row.get("college_code", ""),
                "type": "TS EAMCET",
                "category": cat,
                "probability": prob,
                "closing_rank": closing_rank,
                "year": row.get("year", 2025),
                "fees": "~₹35,000-₹1,20,000/year",
            })

    elif req.exam_type in ("JEE_MAIN", "JEE_ADVANCED"):
        seat_type = JOSAA_SEAT_MAP.get(req.category, "OPEN")
        gender_filter = "Gender-Neutral"
        if req.gender.lower() in ("female", "girls"):
            gender_filter = "Female-only (including Supernumerary)"

        quota = req.quota or "AI"

        # Fetch all matching rows first
        query = {
            "year": {"$in": [2025, 2024, 2023]},
            "seat_type": seat_type,
            "quota": quota,
            "gender": gender_filter,
            "closing_rank": {"$gt": 0},
        }

        cursor = db.josaa_cutoffs.find(query, {"_id": 0}).sort([("year", -1), ("closing_rank", 1)]).limit(5000)
        rows = await cursor.to_list(5000)

        best = {}
        for row in rows:
            name = row.get("institute_name", "")
            # Filter by institute type based on exam_type
            if req.exam_type == "JEE_ADVANCED" and not is_iit(name):
                continue
            if req.exam_type == "JEE_MAIN" and is_iit(name):
                continue

            key = (name, row.get("program_name", ""))
            if key not in best or row.get("year", 0) > best[key].get("year", 0):
                best[key] = row

        for row in best.values():
            closing_rank = row.get("closing_rank", 0)
            if closing_rank <= 0:
                continue
            cat, prob = classify_college(req.rank, closing_rank)
            institute_type = "IIT" if is_iit(row.get("institute_name", "")) else "NIT/IIIT/GFTI"
            results.append({
                "institute": row.get("institute_name", "Unknown"),
                "branch": row.get("program_name", "Unknown"),
                "type": institute_type,
                "category": cat,
                "probability": prob,
                "closing_rank": closing_rank,
                "opening_rank": row.get("opening_rank", 0),
                "round": row.get("round", 1),
                "year": row.get("year", 2025),
                "fees": "~₹2,00,000-₹2,50,000/year" if is_iit(row.get("institute_name", "")) else "~₹1,25,000-₹1,50,000/year",
                "quota": quota,
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


@router.get("/trend")
async def get_cutoff_trend(
    exam_type: str,
    institute: str,
    branch: str,
    category: str,
    gender: str,
    quota: str = "AI",
    request: Request = None,
):
    """Return year-by-year (2023/2024/2025) cutoff trend for a college+branch."""
    db = await _get_db(request)
    years = [2023, 2024, 2025]
    data = []

    if exam_type == "TSEAMCET":
        ts_cat = TS_CATEGORY_MAP.get(category, category)
        gender_filter = "BOYS" if gender.lower() in ("male", "boys") else "GIRLS"

        for year in years:
            row = await db.ts_eamcet_cutoffs.find_one(
                {
                    "college_name": institute,
                    "branch_name": branch,
                    "category": ts_cat,
                    "gender": gender_filter,
                    "year": year,
                },
                {"_id": 0, "last_rank": 1},
            )
            data.append({
                "year": year,
                "closing_rank": row["last_rank"] if row and row.get("last_rank") else None,
            })

    elif exam_type in ("JEE_MAIN", "JEE_ADVANCED"):
        seat_type = JOSAA_SEAT_MAP.get(category, "OPEN")
        gender_filter = "Gender-Neutral"
        if gender.lower() in ("female", "girls"):
            gender_filter = "Female-only (including Supernumerary)"

        for year in years:
            # Try exact match first, then any round (take round 6 or last available)
            cursor = db.josaa_cutoffs.find(
                {
                    "institute_name": institute,
                    "program_name": branch,
                    "seat_type": seat_type,
                    "quota": quota,
                    "gender": gender_filter,
                    "year": year,
                    "closing_rank": {"$gt": 0},
                },
                {"_id": 0, "closing_rank": 1, "opening_rank": 1, "round": 1},
            ).sort("round", -1).limit(1)
            rows = await cursor.to_list(1)
            if rows:
                data.append({
                    "year": year,
                    "closing_rank": rows[0]["closing_rank"],
                    "opening_rank": rows[0].get("opening_rank", 0),
                })
            else:
                data.append({"year": year, "closing_rank": None, "opening_rank": None})

    # Filter out missing years
    valid = [d for d in data if d["closing_rank"]]

    if len(valid) < 2:
        return {
            "institute": institute,
            "branch": branch,
            "data": data,
            "trend": "insufficient_data",
            "change_pct": 0,
            "trend_label": "Not enough data",
            "predicted_2026": None,
        }

    # Trend analysis: higher rank = easier, lower rank = harder
    first_rank = valid[0]["closing_rank"]
    last_rank = valid[-1]["closing_rank"]
    change_pct = round(((last_rank - first_rank) / first_rank) * 100, 1)

    if change_pct > 5:
        trend = "easier"
        trend_label = f"Getting Easier ↑ (+{change_pct}%)"
    elif change_pct < -5:
        trend = "harder"
        trend_label = f"Getting Tougher ↓ ({change_pct}%)"
    else:
        trend = "stable"
        trend_label = f"Stable ({change_pct:+.1f}%)"

    # Simple linear projection for 2026
    if len(valid) >= 2:
        delta = valid[-1]["closing_rank"] - valid[-2]["closing_rank"]
        predicted_2026 = valid[-1]["closing_rank"] + delta
    else:
        predicted_2026 = valid[-1]["closing_rank"]

    return {
        "institute": institute,
        "branch": branch,
        "data": data,
        "trend": trend,
        "change_pct": change_pct,
        "trend_label": trend_label,
        "predicted_2026": max(1, predicted_2026),
        "years_with_data": len(valid),
    }
