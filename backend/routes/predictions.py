from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from utils import get_current_user, classify_college
from emergentintegrations.llm.chat import LlmChat, UserMessage
from college_meta import (
    BRANCH_GROUPS, match_branches, nirf_rank, college_type,
    TYPE_PRIORITY, classify_5tier, CLASSIFICATION_ORDER, fee_estimate,
)
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
    quota: Optional[str] = "AI"  # AI = All India, OS = Outside State, HS = Home State
    branches: Optional[List[str]] = None  # canonical branch labels from BRANCH_GROUPS
    college_types: Optional[List[str]] = None  # ["NIT","IIIT","GFTI","Other"] (JEE_MAIN); ["IIT"] forced for JEE_ADV


async def _get_db(request: Request):
    return request.app.state.db


@router.get("/branches")
async def list_branches():
    """Canonical branch labels for the frontend filter chips."""
    return {"branches": list(BRANCH_GROUPS.keys())}


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


def _build_explanation(row: dict, ratio: float, label: str, exam_type: str, category: str, quota: str) -> str:
    """One-line factual reason this college is in the user's results."""
    closing = row.get("closing_rank") or row.get("last_rank") or 0
    year = row.get("year", 2025)
    if exam_type == "TSEAMCET":
        ctx = f"TS EAMCET {category} cutoff ({year}) closed at rank {int(closing):,}"
    else:
        ctx = f"JoSAA {category}/{quota} cutoff ({year}) closed at rank {int(closing):,}"

    if label == "Very Safe":
        margin = int((ratio - 1.0) * 100)
        return f"{ctx} — your rank beats it by ~{margin}%, so admission is highly likely."
    if label == "Safe":
        return f"{ctx} — your rank is comfortably under the cutoff with good margin."
    if label == "Moderate":
        return f"{ctx} — your rank is near the cutoff; round-by-round movement matters."
    if label == "Competitive":
        return f"{ctx} — your rank is slightly above last year's cutoff; depends on dip."
    return f"{ctx} — your rank is above the cutoff; only realistic if cutoffs rise significantly."


@router.post("/predict")
async def predict(req: PredictRequest, request: Request):
    db = await _get_db(request)

    # Optionally check auth (allow anonymous)
    user = None
    try:
        user = await get_current_user(request, db)
    except Exception:
        pass

    raw_rows: list = []

    # -----------------------------------------------------------------
    # Fetch all eligible rows
    # -----------------------------------------------------------------
    if req.exam_type == "TSEAMCET":
        ts_cat = TS_CATEGORY_MAP.get(req.category, req.category)
        gender_filter = "BOYS" if req.gender.lower() in ("male", "boys") else "GIRLS"
        query = {
            "year": {"$in": [2025, 2024, 2023]},
            "category": ts_cat,
            "gender": gender_filter,
            "last_rank": {"$gt": 0},
        }
        cursor = db.ts_eamcet_cutoffs.find(query, {"_id": 0}).sort(
            [("year", -1), ("last_rank", 1)]
        )
        raw_rows = await cursor.to_list(length=None)

    elif req.exam_type in ("JEE_MAIN", "JEE_ADVANCED"):
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
        cursor = db.josaa_cutoffs.find(query, {"_id": 0}).sort(
            [("year", -1), ("closing_rank", 1)]
        )
        raw_rows = await cursor.to_list(length=None)

    # -----------------------------------------------------------------
    # Keep latest year per (college, branch); apply institute-type filter for JEE
    # -----------------------------------------------------------------
    best = {}
    for row in raw_rows:
        name = row.get("institute_name") or row.get("college_name", "")
        if not name:
            continue
        if req.exam_type == "JEE_ADVANCED" and college_type(name) != "IIT":
            continue
        if req.exam_type == "JEE_MAIN" and college_type(name) == "IIT":
            continue
        branch = row.get("program_name") or row.get("branch_name", "")
        key = (name, branch)
        if key not in best or row.get("year", 0) > best[key].get("year", 0):
            best[key] = row

    # -----------------------------------------------------------------
    # Build results with classification + filters
    # -----------------------------------------------------------------
    quota_used = req.quota or "AI"
    selected_types = set(req.college_types or [])
    if req.exam_type == "JEE_ADVANCED":
        selected_types = {"IIT"}  # forced

    results: list = []
    for row in best.values():
        name = row.get("institute_name") or row.get("college_name", "")
        branch = row.get("program_name") or row.get("branch_name", "")
        closing = row.get("closing_rank") or row.get("last_rank") or 0
        if closing <= 0:
            continue

        # branch filter (canonical groups)
        if req.branches and not match_branches(branch, req.branches):
            continue

        ctype = college_type(name)
        if selected_types and ctype not in selected_types:
            continue

        ratio = closing / req.rank if req.rank else 0
        label, prob = classify_5tier(req.rank, closing)
        results.append({
            "institute": name,
            "branch": branch,
            "type": "TS EAMCET" if req.exam_type == "TSEAMCET" else ctype,
            "college_type": ctype,
            "category": label,  # 5-tier label
            "probability": round(prob, 1),
            "closing_rank": int(closing),
            "opening_rank": int(row.get("opening_rank", 0) or 0),
            "round": row.get("round", 1),
            "year": row.get("year", 2025),
            "fees": fee_estimate(name, ctype),
            "quota": quota_used if req.exam_type != "TSEAMCET" else None,
            "nirf": nirf_rank(name),
            "explanation": _build_explanation(row, ratio, label, req.exam_type, req.category, quota_used),
            "college_code": row.get("college_code", ""),
        })

    # -----------------------------------------------------------------
    # Priority sort: classification → college_type → NIRF → probability
    # -----------------------------------------------------------------
    class_order = {lbl: i for i, lbl in enumerate(CLASSIFICATION_ORDER)}
    results.sort(key=lambda r: (
        class_order.get(r["category"], 99),
        TYPE_PRIORITY.get(r["college_type"], 99),
        r["nirf"],
        -r["probability"],
    ))

    # Group buckets (no truncation)
    grouped = {lbl: [] for lbl in CLASSIFICATION_ORDER}
    for r in results:
        grouped[r["category"]].append(r)

    # Sample for AI insight (top 3 per realistic bucket)
    sample_safe = grouped["Very Safe"][:3] + grouped["Safe"][:2]
    sample_target = grouped["Moderate"][:3] + grouped["Competitive"][:2]
    sample_dream = grouped["Difficult"][:3]

    ai_insight = await generate_ai_insight(
        req.rank, req.exam_type, req.category, sample_safe, sample_target, sample_dream
    )

    # Save prediction
    if user:
        pred_doc = {
            "user_id": user["uid"],
            "exam_type": req.exam_type,
            "rank": req.rank,
            "category": req.category,
            "gender": req.gender,
            "branches": req.branches or [],
            "college_types": list(selected_types),
            "results_count": len(results),
            "ai_insight": ai_insight,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.predictions.insert_one(pred_doc)

    # Back-compat fields (Safe/Target/Dream) for any legacy consumer
    legacy_safe = grouped["Very Safe"] + grouped["Safe"]
    legacy_target = grouped["Moderate"]
    legacy_dream = grouped["Competitive"] + grouped["Difficult"]

    return {
        "colleges": results,                  # full sorted list — all eligible
        "groups": grouped,                    # by 5-tier label
        "counts": {lbl: len(grouped[lbl]) for lbl in CLASSIFICATION_ORDER},
        "total": len(results),
        "ai_insight": ai_insight,
        "filters": {
            "exam_type": req.exam_type,
            "rank": req.rank,
            "category": req.category,
            "gender": req.gender,
            "quota": quota_used,
            "branches": req.branches or [],
            "college_types": list(selected_types),
        },
        # Legacy 3-tier groupings (deprecated, kept for older clients)
        "safe": legacy_safe,
        "target": legacy_target,
        "dream": legacy_dream,
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

    trend = "stable"
    trend_label = f"Stable ({change_pct:+.1f}%)"
    if change_pct > 5:
        trend = "easier"
        trend_label = f"Getting Easier ↑ (+{change_pct}%)"
    elif change_pct < -5:
        trend = "harder"
        trend_label = f"Getting Tougher ↓ ({change_pct}%)"

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
