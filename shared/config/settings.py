"""
Global Configuration & Settings for AI Product Intelligence Platform
Configured to use 2TB External Storage (D:\\) for Vector Cache, Models, and Outputs
"""

import os
from pathlib import Path

# Primary Workspace & 2TB Drive Storage Paths
EXTERNAL_DRIVE_ROOT = Path("D:/AI unihack antigravity/AI-Powered-Product-Intelligence-for-Industrial-Commerce")
LOCAL_WORKSPACE_ROOT = Path(__file__).parent.parent.parent

# Choose external 2TB drive if available, otherwise project root
if Path("D:/").exists():
    STORAGE_ROOT = Path("D:/ProductIQ_2TB_Storage")
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    VECTOR_DB_DIR = STORAGE_ROOT / "chromadb_vector_cache"
    MODELS_DIR = STORAGE_ROOT / "local_models"
    OUTPUT_DIR = STORAGE_ROOT / "delivery_output"
else:
    STORAGE_ROOT = LOCAL_WORKSPACE_ROOT / "data"
    VECTOR_DB_DIR = STORAGE_ROOT / "vector_cache"
    MODELS_DIR = STORAGE_ROOT / "models"
    OUTPUT_DIR = STORAGE_ROOT / "output"

for d in [VECTOR_DB_DIR, MODELS_DIR, OUTPUT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Data Directories
DATA_DIR = LOCAL_WORKSPACE_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "sample_products"
REFERENCE_DIR = DATA_DIR / "reference"

# Model Mesh API Keys & Endpoints (All $0 Free Options)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = "qwen2.5:7b-instruct-q4_K_M"
OLLAMA_VISION_MODEL = "llava:7b"

# Model Roster IDs (Verified 100% Active 2026 Endpoints)
GROQ_MODEL = "openai/gpt-oss-20b"
GROQ_REASONER_MODEL = "openai/gpt-oss-120b"
GEMINI_MODEL = "gemini-3-flash-preview"
OPENROUTER_OX_ALPHA = "nvidia/nemotron-3.5-lightning:free"
OPENROUTER_NEMOTRON = "nvidia/nemotron-3.5-lightning:free"
OPENROUTER_DEEPSEEK_FREE = "z-ai/glm-5.2:free"

# LLM Generation Parameters
LLM_TEMPERATURE = 0.1
LLM_JSON_TEMPERATURE = 0.0
LLM_MAX_TOKENS = 2048
LLM_TIMEOUT_SECONDS = 30

# Vector Memory Settings (ChromaDB on 2TB drive)
VECTOR_SIMILARITY_THRESHOLD = 0.99
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Placeholders & Validation Constants
PLACEHOLDER_VALUES = {
    "-- Unbranded --",
    "-- No Unilog Brand --",
    "-- No DIB Brand --",
    "-",
    "",
    "COMMODITY - UNBRANDED",
    "UNKNOWN",
    "NONE"
}

# Description Constraints (Strict Commercial Rules)
INVOICE_DESC_MAX_CHARS = 40
MOBILE_DESC_MIN_CHARS = 60
MOBILE_DESC_MAX_CHARS = 80
SHORT_DESC_MAX_CHARS = 150
LONG_DESC_MAX_CHARS = 750
RETAIL_DESC_MAX_CHARS = 100

# Confidence Thresholds
CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.60
CONFIDENCE_LOW = 0.40
HUMAN_REVIEW_THRESHOLD = 0.70

# Server Config
API_HOST = "0.0.0.0"
API_PORT = 8000
FRONTEND_URL = "http://localhost:5173"
