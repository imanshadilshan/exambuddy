#!/usr/bin/env python3
"""
Run SQL migrations
"""
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment variables")
    sys.exit(1)

# Migration files to run
migration_files = [
    "add_price_to_exams.sql",
    "create_enrollment_payment_tables.sql"
]

# Create engine
engine = create_engine(DATABASE_URL)

for migration_file_name in migration_files:
    migration_file = Path(__file__).parent / "migrations" / migration_file_name

    if not migration_file.exists():
        print(f"⚠️  Migration file not found: {migration_file_name} (skipping)")
        continue

    print(f"Running migration: {migration_file_name}")
    print("=" * 60)

    try:
        with open(migration_file, 'r') as f:
            migration_sql = f.read()

        with engine.connect() as conn:
            # Execute migration
            conn.execute(text(migration_sql))
            conn.commit()
            print(f"✓ Migration completed: {migration_file_name}")
    except Exception as e:
        # Check if error is about already existing objects
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print(f"✓ Migration already applied: {migration_file_name}")
        else:
            print(f"ERROR: Migration failed: {e}")
            sys.exit(1)

    print("=" * 60)
    print()

print("✅ All migrations completed successfully!")
