from typing import Optional
from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_KEY, is_supabase_configured

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Retrieve or initialize the Supabase client if configured."""
    global _supabase_client

    if not is_supabase_configured():
        return None

    if _supabase_client is None:
        try:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"Warning: Failed to initialize Supabase client: {e}")
            return None

    return _supabase_client
