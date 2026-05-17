from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
import uuid
import httpx

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


def user_dict(user: dict) -> dict:
    user = dict(user)
    user["_id"] = str(user.get("_id", ""))
    user.pop("password_hash", None)
    return user


async def _get_db(request: Request):
    return request.app.state.db


@router.post("/register")
async def register(req: RegisterRequest, request: Request):
    db = await _get_db(request)
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    uid = str(uuid.uuid4())
    user_doc = {
        "uid": uid,
        "name": req.name,
        "email": email,
        "password_hash": hash_password(req.password),
        "role": "user",
        "is_premium": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    access_token = create_access_token(uid, email)
    user_doc["_id"] = str(user_doc.get("_id", ""))
    user_doc.pop("password_hash", None)
    return {"user": user_doc, "access_token": access_token}


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    db = await _get_db(request)
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    uid = user.get("uid", str(user["_id"]))
    access_token = create_access_token(uid, email)
    return {"user": user_dict(user), "access_token": access_token}


@router.post("/logout")
async def logout():
    return {"message": "Logged out"}


@router.post("/google-session")
async def google_session(req: GoogleSessionRequest, request: Request):
    """
    Exchange Emergent OAuth session_id for our app JWT.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    db = await _get_db(request)

    # Exchange session_id with Emergent auth service
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.get(
                EMERGENT_SESSION_URL,
                headers={"X-Session-ID": req.session_id},
            )
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=401, detail=f"Invalid or expired Google session: {e}")

    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google session did not return an email")

    # Upsert user (preserve uid, role, is_premium if existing)
    user = await db.users.find_one({"email": email})
    if not user:
        uid = str(uuid.uuid4())
        user_doc = {
            "uid": uid,
            "name": name,
            "email": email,
            "picture": picture,
            "auth_provider": "google",
            "role": "user",
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        # Update name/picture if needed (don't override role/is_premium)
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "auth_provider": user.get("auth_provider") or "google"}},
        )
        user = await db.users.find_one({"email": email})

    uid = user.get("uid") or str(user["_id"])
    access_token = create_access_token(uid, email)
    return {"user": user_dict(user), "access_token": access_token}


@router.get("/me")
async def me(request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)
    return user


@router.put("/profile")
async def update_profile(request: Request, data: dict):
    db = await _get_db(request)
    user = await get_current_user(request, db)
    allowed = {"name", "rank", "category", "exam_type"}
    update = {k: v for k, v in data.items() if k in allowed}
    if update:
        await db.users.update_one({"uid": user["uid"]}, {"$set": update})
    updated = await db.users.find_one({"uid": user["uid"]})
    return user_dict(updated)
