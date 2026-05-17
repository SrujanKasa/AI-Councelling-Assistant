"""
Script to seed JOSAA and TS EAMCET cutoff data from CSV files into MongoDB.
Run once during startup or manually: python seed_data.py
"""
import asyncio
import os
import pandas as pd
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

BATCH_SIZE = 1000


async def seed_josaa(db, csv_path: str):
    count = await db.josaa_cutoffs.count_documents({})
    if count > 0:
        print(f"JOSAA data already seeded ({count} records)")
        return

    print("Seeding JOSAA cutoff data...")
    df = pd.read_csv(csv_path)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    # Rename columns
    df = df.rename(columns={
        "institute_name": "institute_name",
        "academic_program_name": "program_name",
        "seat_type": "seat_type",
        "opening_rank": "opening_rank",
        "closing_rank": "closing_rank",
    })
    df["closing_rank"] = pd.to_numeric(df["closing_rank"], errors="coerce").fillna(0).astype(int)
    df["opening_rank"] = pd.to_numeric(df["opening_rank"], errors="coerce").fillna(0).astype(int)

    records = df.to_dict("records")
    # Insert in batches
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        await db.josaa_cutoffs.insert_many(batch)
        if i % 10000 == 0:
            print(f"  Inserted {i}/{len(records)} JOSAA records...")

    await db.josaa_cutoffs.create_index([("year", 1), ("seat_type", 1), ("quota", 1), ("gender", 1)])
    await db.josaa_cutoffs.create_index([("closing_rank", 1)])
    await db.josaa_cutoffs.create_index([("institute_name", 1)])
    print(f"JOSAA seeding complete: {len(records)} records")


async def seed_ts_eamcet(db, csv_path: str):
    count = await db.ts_eamcet_cutoffs.count_documents({})
    if count > 0:
        print(f"TS EAMCET data already seeded ({count} records)")
        return

    print("Seeding TS EAMCET cutoff data...")
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    df.columns = [c.strip().lower() for c in df.columns]
    df["last_rank"] = pd.to_numeric(df["last_rank"], errors="coerce").fillna(0).astype(int)

    records = df.to_dict("records")
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        await db.ts_eamcet_cutoffs.insert_many(batch)
        if i % 10000 == 0:
            print(f"  Inserted {i}/{len(records)} TS EAMCET records...")

    await db.ts_eamcet_cutoffs.create_index([("year", 1), ("category", 1), ("gender", 1)])
    await db.ts_eamcet_cutoffs.create_index([("last_rank", 1)])
    await db.ts_eamcet_cutoffs.create_index([("college_name", 1)])
    print(f"TS EAMCET seeding complete: {len(records)} records")


async def run_seed():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    base = ROOT_DIR
    josaa_path = base / "josaa_cutoff_2023_2025.csv"
    ts_path = base / "ts_eamcet_cutoffs_2023_2025.csv"

    if josaa_path.exists():
        await seed_josaa(db, str(josaa_path))
    else:
        print(f"JOSAA CSV not found at {josaa_path}")

    if ts_path.exists():
        await seed_ts_eamcet(db, str(ts_path))
    else:
        print(f"TS EAMCET CSV not found at {ts_path}")

    client.close()


if __name__ == "__main__":
    asyncio.run(run_seed())
