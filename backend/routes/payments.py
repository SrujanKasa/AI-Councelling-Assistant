from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from utils import get_current_user
from datetime import datetime, timezone
import os
import razorpay
import asyncio
import resend

router = APIRouter(prefix="/api/payment", tags=["payment"])

PREMIUM_AMOUNT = 5000  # 50 INR in paise


async def _get_db(request: Request):
    return request.app.state.db


def get_razorpay_client():
    return razorpay.Client(
        auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"])
    )


@router.post("/create-order")
async def create_order(request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)

    if user.get("is_premium"):
        raise HTTPException(status_code=400, detail="Already premium user")

    client = get_razorpay_client()
    order = None
    try:
        order = client.order.create({
            "amount": PREMIUM_AMOUNT,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"user_id": user["uid"], "email": user["email"]},
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

    if not order:
        raise HTTPException(status_code=500, detail="Failed to create order")

    # Save payment record
    await db.payments.insert_one({
        "user_id": user["uid"],
        "order_id": order["id"],
        "amount": PREMIUM_AMOUNT,
        "currency": "INR",
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "order_id": order["id"],
        "amount": PREMIUM_AMOUNT,
        "currency": "INR",
        "key_id": os.environ["RAZORPAY_KEY_ID"],
    }


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/verify")
async def verify_payment(req: VerifyRequest, request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)

    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Update payment record
    await db.payments.update_one(
        {"order_id": req.razorpay_order_id},
        {
            "$set": {
                "payment_id": req.razorpay_payment_id,
                "status": "paid",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    # Upgrade user to premium
    await db.users.update_one(
        {"uid": user["uid"]},
        {"$set": {"is_premium": True, "premium_since": datetime.now(timezone.utc).isoformat()}}
    )

    # Send confirmation email
    asyncio.create_task(send_premium_email(user["email"], user.get("name", "Student")))

    return {"success": True, "message": "Payment verified. Premium access unlocked!"}


async def send_premium_email(email: str, name: str):
    try:
        resend.api_key = os.environ.get("RESEND_API_KEY", "")
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#F8FAFC;padding:40px;border-radius:16px;">
          <h1 style="background:linear-gradient(135deg,#3B82F6,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;">
            Welcome to Hynexs AI Councellor Premium!
          </h1>
          <p style="color:#94A3B8;">Hi {name},</p>
          <p style="color:#94A3B8;">Your premium access has been activated. You now have full access to:</p>
          <ul style="color:#F8FAFC;">
            <li>Unlimited AI Counseling Sessions</li>
            <li>Full College Predictions (Safe/Target/Dream)</li>
            <li>Personalized Counseling Strategy</li>
            <li>Priority Support</li>
          </ul>
          <a href="https://hynexsedu.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:20px;">
            Go to Dashboard
          </a>
          <p style="color:#64748B;margin-top:30px;font-size:12px;">
            Join our WhatsApp community for counseling updates: 
            <a href="https://chat.whatsapp.com/F3lEAtKrFLcJ5Fcgc3xUu5" style="color:#3B82F6;">Join Here</a>
          </p>
        </div>
        """
        await asyncio.to_thread(resend.Emails.send, {
            "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
            "to": [email],
            "subject": "Premium Access Activated - Hynexs AI Councellor",
            "html": html,
        })
    except Exception as e:
        print(f"Email send failed: {e}")


@router.get("/status")
async def payment_status(request: Request):
    db = await _get_db(request)
    user = await get_current_user(request, db)
    payment = await db.payments.find_one(
        {"user_id": user["uid"], "status": "paid"}, {"_id": 0}
    )
    return {
        "is_premium": user.get("is_premium", False),
        "payment": payment,
    }
