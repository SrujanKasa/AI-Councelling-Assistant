from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=False,
                        samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False,
                        samesite="lax", max_age=604800, path="/")


def user_dict(user: dict) -> dict:
    user = dict(user)
    user["_id"] = str(user.get("_id", ""))
    user.pop("password_hash", None)
    return user


async def _get_db(request: Request):
    return request.app.state.db


@router.post("/register")
async def register(req: RegisterRequest, response: Response, request: Request):
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
    refresh_token = create_refresh_token(uid)
    set_auth_cookies(response, access_token, refresh_token)

    user_doc["_id"] = str(user_doc.get("_id", ""))
    user_doc.pop("password_hash", None)
    return {"user": user_doc, "access_token": access_token}


@router.post("/login")
async def login(req: LoginRequest, response: Response, request: Request):
    db = await _get_db(request)
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    uid = user.get("uid", str(user["_id"]))
    access_token = create_access_token(uid, email)
    refresh_token = create_refresh_token(uid)
    set_auth_cookies(response, access_token, refresh_token)

    return {"user": user_dict(user), "access_token": access_token}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


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
