import os
import sys

# Ensure paths are set correctly for testing
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
ai_engine_dir = os.path.join(root_dir, "ai-engine")
if ai_engine_dir not in sys.path:
    sys.path.insert(0, ai_engine_dir)

from shared.schemas.product import RawProduct
from universal_engine import UniversalAIEngine

def test_pipeline_crash_protection_and_schema():
    print("Testing Universal AI Engine...")
    
    # 1. Create a dummy raw product
    raw = RawProduct(
        mfg_part_num="TEST-12345",
        part_desc="Milwaukee 5 in. x 0.045 in. x 7/8 in. Metal Cut-Off Wheel. Super long description to see what happens.",
        e1_brand="MILWAUKEE"
    )
    
    # 2. Initialize engine
    engine = UniversalAIEngine()
    
    # 3. Process product (disable web search to speed up test)
    result = engine.process_product(raw, enable_web=False)
    
    # 4. Verify crash protection worked (either success or graceful fail)
    print(f"Status: {result.processing_status}")
    if result.error_message:
        print(f"Caught error (handled safely): {result.error_message}")
    else:
        print("Pipeline executed successfully without crashing.")
    
    # 5. Verify schema validation
    if result.content and result.content.invoice_description:
        invoice = result.content.invoice_description
        print(f"Invoice Desc: '{invoice}'")
        assert len(invoice) <= 40, f"Invoice description is too long! ({len(invoice)} chars)"
        assert invoice == invoice.upper(), "Invoice description must be ALL CAPS!"
        print("✅ Schema validation successful!")
        
    print("✅ Test Complete.")

if __name__ == "__main__":
    test_pipeline_crash_protection_and_schema()
