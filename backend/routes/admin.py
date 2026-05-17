from fastapi import APIRouter, Request, HTTPException
from utils import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def _get_db(request: Request):
    return request.app.state.db


async def require_admin(request: Request, db):
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
async def get_stats(request: Request):
    db = await _get_db(request)
    await require_admin(request, db)

    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"is_premium": True})
    total_predictions = await db.predictions.count_documents({})
    total_payments = await db.payments.count_documents({"status": "paid"})
    total_revenue = total_payments * 50  # 50 INR each

    josaa_count = await db.josaa_cutoffs.count_documents({})
    ts_count = await db.ts_eamcet_cutoffs.count_documents({})

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "total_predictions": total_predictions,
        "total_payments": total_payments,
        "total_revenue": total_revenue,
        "josaa_records": josaa_count,
        "ts_eamcet_records": ts_count,
    }


@router.get("/users")
async def get_users(request: Request, page: int = 1, limit: int = 20):
    db = await _get_db(request)
    await require_admin(request, db)

    skip = (page - 1) * limit
    cursor = db.users.find({}, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    for u in users:
        u["_id"] = str(u["_id"])
    total = await db.users.count_documents({})
    return {"users": users, "total": total, "page": page}


@router.get("/payments")
async def get_payments(request: Request, page: int = 1, limit: int = 20):
    db = await _get_db(request)
    await require_admin(request, db)

    skip = (page - 1) * limit
    cursor = db.payments.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    payments = await cursor.to_list(limit)
    total = await db.payments.count_documents({})
    return {"payments": payments, "total": total}


@router.get("/predictions")
async def get_predictions(request: Request, page: int = 1, limit: int = 20):
    db = await _get_db(request)
    await require_admin(request, db)

    skip = (page - 1) * limit
    cursor = db.predictions.find({}, {"_id": 0, "results": 0}).sort("created_at", -1).skip(skip).limit(limit)
    preds = await cursor.to_list(limit)
    total = await db.predictions.count_documents({})
    return {"predictions": preds, "total": total}


@router.delete("/user/{uid}")
async def delete_user(uid: str, request: Request):
    db = await _get_db(request)
    await require_admin(request, db)
    result = await db.users.delete_one({"uid": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
