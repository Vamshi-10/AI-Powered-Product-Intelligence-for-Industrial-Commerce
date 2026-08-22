import os
from pathlib import Path
from app.core.config import SUPABASE_URL, SUPABASE_KEY, is_supabase_configured
from app.db.supabase import get_supabase_client
from app.services.product_service import product_service
from app.schemas.product import Product


def verify_supabase_setup():
    print("--- VERIFYING SUPABASE DATABASE SETUP ---")

    backend_dir = Path(__file__).resolve().parent.parent

    # 1. Check SQL schema file
    schema_path = backend_dir / "supabase" / "schema.sql"
    print(f"1. Checking SQL schema at {schema_path}...")
    assert schema_path.exists(), "schema.sql file is missing!"
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
    assert "CREATE TABLE IF NOT EXISTS public.products" in sql_content
    print("   [OK] schema.sql exists and contains correct CREATE TABLE statements.")

    # 2. Check .env and .env.example
    env_path = backend_dir / ".env"
    env_example_path = backend_dir / ".env.example"
    print(f"2. Checking environment files (.env, .env.example)...")
    assert env_example_path.exists(), ".env.example is missing!"
    assert env_path.exists(), ".env is missing!"
    print("   [OK] .env and .env.example exist.")

    # 3. Check config module
    print(f"3. Config loaded SUPABASE_URL: '{SUPABASE_URL}'")
    print(f"   Config loaded SUPABASE_KEY: '{SUPABASE_KEY[:10]}...' if key else 'None'")
    print(f"   is_supabase_configured(): {is_supabase_configured()}")

    # 4. Check Supabase client factory
    client = get_supabase_client()
    if is_supabase_configured():
        print(f"4. Supabase Client initialized: {client}")
        assert client is not None
    else:
        print("4. Supabase credentials are placeholder/unconfigured. Graceful fallback active.")
        assert client is None

    # 5. Verify ProductService compatibility
    print("5. Verifying ProductService operation with current setup...")
    test_prod = Product(
        name="Test Valve",
        category="Valves",
        price=150.0,
        competitor_price=160.0
    )
    res = product_service.create_product(test_prod)
    print(f"   Created product response: {res}")
    assert res["name"] == "Test Valve"
    assert res["price"] == 150.0

    analyze_res = product_service.analyze_product(test_prod)
    print(f"   Analyze product response: {analyze_res}")
    assert analyze_res["price_position"] == "Cheaper than competitor"

    print("\n--- ALL SUPABASE SETUP VERIFICATIONS PASSED ---")


if __name__ == "__main__":
    verify_supabase_setup()
