from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from utils import hash_password

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from routes.auth import router as auth_router
from routes.predictions import router as predictions_router
from routes.counselor import router as counselor_router
from routes.payments import router as payments_router
from routes.admin import router as admin_router

app = FastAPI(title="Hynexs AI Councellor API")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app.state.db = db

# CORS - Allow all origins since we use Bearer tokens not cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Hynexs AI Councellor API", "status": "ok"}


@api_router.get("/health")
async def health():
    josaa_count = await db.josaa_cutoffs.count_documents({})
    ts_count = await db.ts_eamcet_cutoffs.count_documents({})
    return {
        "status": "ok",
        "josaa_records": josaa_count,
        "ts_eamcet_records": ts_count,
    }


@api_router.get("/colleges/stats")
async def college_stats():
    josaa_colleges = await db.josaa_cutoffs.distinct("institute_name")
    ts_colleges = await db.ts_eamcet_cutoffs.distinct("college_name")
    return {
        "josaa_colleges": len(josaa_colleges),
        "ts_colleges": len(ts_colleges),
        "total_predictions": await db.predictions.count_documents({}),
        "total_users": await db.users.count_documents({}),
    }


app.include_router(api_router)
app.include_router(auth_router)
app.include_router(predictions_router)
app.include_router(counselor_router)
app.include_router(payments_router)
app.include_router(admin_router)


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@hynexsedu.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        import uuid
        await db.users.insert_one({
            "uid": str(uuid.uuid4()),
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "is_premium": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logging.info(f"Admin seeded: {admin_email}")

    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# Test Credentials - Hynexs Edu Counseller

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User Account
- Email: testuser@hynexsedu.com
- Password: Test@123
- Role: user

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

## Payment
- Amount: 50 INR (5000 paise)
- Razorpay Test Card: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits
""")


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("uid", unique=True)
    await db.predictions.create_index("user_id")
    await db.payments.create_index("user_id")
    await db.conversations.create_index([("user_id", 1), ("session_id", 1)])


async def seed_csv_data():
    import importlib.util, sys
    spec = importlib.util.spec_from_file_location("seed_data", ROOT_DIR / "seed_data.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules["seed_data"] = module
    spec.loader.exec_module(module)
    await module.run_seed()


@app.on_event("startup")
async def startup():
    logging.basicConfig(level=logging.INFO)
    await create_indexes()
    await seed_admin()
    # Run CSV seeding in background
    import asyncio
    asyncio.create_task(seed_csv_data())
    logging.info("Hynexs AI Councellor API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
