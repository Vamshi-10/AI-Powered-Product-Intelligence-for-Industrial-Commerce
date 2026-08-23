import os
import sys
import json
from dotenv import load_dotenv

# Set paths
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
ai_engine_dir = os.path.join(root_dir, "ai-engine")
if ai_engine_dir not in sys.path:
    sys.path.insert(0, ai_engine_dir)

# Load the API keys from .env! (This was missing in the test script)
load_dotenv(os.path.join(root_dir, ".env"))

from shared.schemas.product import RawProduct
from universal_engine import UniversalAIEngine

def run_demo():
    print("Initializing Universal AI Engine (v2.0)...")
    engine = UniversalAIEngine()
    
    print("\nProcessing BRAND NEW Messy Raw Product (Bypassing Cache):")
    print("--------------------------------")
    print("MPN:         DCF887B")
    print("Description: dewlt 20v max xr brushlss impact drvr bare tool. no batt")
    print("Brand:       DEWLT")
    print("--------------------------------\n")
    
    raw = RawProduct(
        mfg_part_num="DCF887B",
        part_desc="dewlt 20v max xr brushlss impact drvr bare tool. no batt",
        e1_brand="DEWLT"
    )
    
    print("AI Engine is thinking (Calling LLM Mesh)...")
    # This will now use your real API keys!
    result = engine.process_product(raw, enable_web=False)
    
    print("\nFINAL STRUCTURED INTELLIGENCE OUTPUT:")
    print("==================================================")
    print(f"Status: {result.processing_status}")
    print(f"Time Taken: {result.processing_time_ms} ms")
    print(f"Overall Confidence: {result.overall_confidence}")
    print("\n--- IDENTITY ---")
    print(f"Manufacturer: {result.identity.manufacturer_resolved}")
    print(f"Brand:        {result.identity.brand_resolved}")
    
    print("\n--- CONTENT GENERATED ---")
    print(f"Invoice Desc: {result.content.invoice_description}")
    print(f"Long Desc:    {result.content.long_description}")
    
    print("\n--- FULL JSON DUMP ---")
    print(json.dumps(result.model_dump(mode="json"), indent=2))
    print("==================================================")

if __name__ == "__main__":
    run_demo()
