import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the backend package
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file from backend root directory
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")


def is_supabase_configured() -> bool:
    """Check if valid non-placeholder Supabase credentials are configured."""
    return bool(
        SUPABASE_URL
        and SUPABASE_KEY
        and "your-supabase-project" not in SUPABASE_URL
        and "your-supabase-anon" not in SUPABASE_KEY
    )
