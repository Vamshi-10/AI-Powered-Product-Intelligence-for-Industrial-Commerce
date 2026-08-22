"""
Main Execution Entrypoint for AI Product Intelligence Platform
Integrates the Document Processing Pipeline (Ingestion) with the AI Engine (Extraction)
and outputs the final 252-Column Commerce-Ready CSV.
Owned by Vamshi Krishna (Project Lead)
"""

import os
import sys
import json
import logging
from pathlib import Path

# Setup Pathing to include modules
root_dir = os.path.dirname(os.path.abspath(__file__))
for path in ["ai-engine", "document-processing", "shared"]:
    full_path = os.path.join(root_dir, path)
    if full_path not in sys.path:
        sys.path.insert(0, full_path)

from universal_engine import UniversalAIEngine
from adapters.csv_adapter import CSVAdapter
from delivery_formatter import DeliveryFormatter
from schemas.product import RawProduct
from config.settings import OUTPUT_DIR, DATA_DIR

# Setup Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("MainOrchestrator")


def process_catalog_file(file_path: str):
    """
    End-to-End processing of a catalog file.
    1. Ingest via Document Processing Adapter
    2. Enhance via Universal AI Engine
    3. Format to 252-Column standard via Delivery Formatter
    """
    logger.info(f"🚀 Starting processing for file: {file_path}")

    # Initialize components
    ai_engine = UniversalAIEngine()
    formatter = DeliveryFormatter()

    if not os.path.exists(file_path):
        logger.error(f"❌ File not found: {file_path}")
        return

    if not file_path.lower().endswith('.csv'):
        logger.error("❌ Unsupported file format. Please provide a CSV file.")
        return

    try:
        import pandas as pd
        df = pd.read_csv(file_path)
        logger.info(f"✅ Loaded {len(df)} rows from {file_path}")
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return

    enriched_records = []

    for index, row in df.iterrows():
        try:
            logger.info(f"⚙️ Processing Product {index + 1}/{len(df)}...")

            # Extract raw fields (adjust keys based on your actual CSV headers)
            raw = RawProduct(
                mfg_part_num=str(row.get("MPN", row.get("mfg_part_num", ""))),
                part_desc=str(row.get("Description", row.get("part_desc", ""))),
                e1_brand=str(row.get("Brand", row.get("e1_brand", ""))),
                part_manuf=str(row.get("Manufacturer", row.get("part_manuf", ""))),
                url=str(row.get("URL", row.get("url", "")))
            )

            if not raw.mfg_part_num and not raw.part_desc:
                logger.warning(f"Row {index + 1} has no MPN and no Description. Skipping.")
                continue

            # 2. Process via AI Engine
            intelligence = ai_engine.process_product(raw, enable_web=True)
            enriched_records.append(intelligence)

        except Exception as e:
            logger.error(f"Error processing row {index + 1}: {e}")

    # 3. Format and Deliver
    if not enriched_records:
        logger.warning("No records were successfully processed.")
        return

    try:
        output_csv_path = os.path.join(OUTPUT_DIR, f"enriched_catalog_{os.path.basename(file_path)}")
        
        # For immediate MVP output, we'll serialize the Pydantic models to a flattened pandas dataframe
        export_data = []
        for record in enriched_records:
            flat = {
                "Internal_Product_ID": record.identity.product_id,
                "Manufacturer": record.identity.manufacturer_resolved,
                "Brand": record.identity.brand_resolved,
                "MPN": record.identity.mpn,
                "Product_Type": record.classification.product_type,
                "Department": record.classification.department,
                "Invoice_Description": record.content.invoice_description,
                "Mobile_Description": record.content.mobile_description,
                "Short_Description": record.content.short_description,
                "Long_Description": record.content.long_description,
                "Images": ", ".join([img.url for img in record.digital_assets if img.url]),
                "Confidence_Score": record.overall_confidence,
                "Needs_Review": record.needs_human_review,
                "Cache_Hit": record.cache_hit
            }
            # Add dynamic attributes
            for attr in record.attributes:
                flat[f"Attr_{attr.name}"] = f"{attr.normalized_value} {attr.uom}".strip()
                
            export_data.append(flat)

        export_df = pd.DataFrame(export_data)
        export_df.to_csv(output_csv_path, index=False)
        
        logger.info(f"🎉 Success! Exported {len(enriched_records)} enriched products to {output_csv_path}")

    except Exception as e:
        logger.error(f"Error during export formatting: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("AI Product Intelligence Engine - Batch Processor")
    print("=" * 60)
    
    # Check if a file was passed as an argument
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        sample_file = os.path.join(DATA_DIR, "sample_products", "test_catalog.csv")
        if not os.path.exists(sample_file):
            import pandas as pd
            os.makedirs(os.path.dirname(sample_file), exist_ok=True)
            dummy_data = pd.DataFrame([
                {"MPN": "49-94-0013", "Description": "Milw 5x.045x7/8 Metal Cut Off Disc", "Brand": "Milwaukee"},
                {"MPN": "2606-20", "Description": "M18 1/2 Drill Driver Bare Tool", "Brand": "Milwaukee"}
            ])
            dummy_data.to_csv(sample_file, index=False)
            
        target_file = sample_file

    process_catalog_file(target_file)
