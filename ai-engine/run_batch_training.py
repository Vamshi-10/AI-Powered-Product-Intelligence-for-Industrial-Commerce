import os
import sys
import csv
import time
import concurrent.futures
from dotenv import load_dotenv

# Ensure paths
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_dir)
ai_engine_dir = os.path.join(root_dir, "ai-engine")
sys.path.insert(0, ai_engine_dir)

# Load environment variables
load_dotenv(os.path.join(root_dir, ".env"))

from shared.schemas.product import RawProduct
from universal_engine import UniversalAIEngine

# Configuration for 100,000 scale
MAX_WORKERS = 5  # Adjust based on API rate limits. 5 is safe for free tiers.
CSV_FILE_PATH = os.path.join(root_dir, "data", "sample_products", "unihack_batch.csv")

def process_single_row(row, engine, index, total):
    start_time = time.time()
    
    # Safely extract columns
    mfg_part_num = row.get("Mfg_Part_Num", "").strip()
    part_desc = row.get("Part_Desc", "").strip()
    
    # Skip completely empty rows
    if not mfg_part_num and not part_desc:
        return {"status": "skipped", "mpn": "N/A"}
        
    raw = RawProduct(
        mfg_part_num=mfg_part_num,
        part_desc=part_desc,
        e1_brand=row.get("E1_Brand", "").strip(),
        unilog_brand=row.get("Unilog_Brand", "").strip(),
        dib_brand=row.get("DIB_Brand", "").strip(),
        part_manuf=row.get("Part_Manuf", "").strip()
    )
    
    try:
        # We disable web search (enable_web=False) during massive bulk ingestion 
        # to save time and prevent search API rate limits.
        result = engine.process_product(raw, enable_web=False)
        elapsed = round(time.time() - start_time, 2)
        
        status_symbol = "✅" if result.processing_status == "completed" else "⚠️"
        cache_str = "(CACHE HIT)" if getattr(result, "cache_hit", False) else "(AI GENERATED)"
        
        print(f"[{index}/{total}] {status_symbol} {raw.mfg_part_num} | {result.content.invoice_description} | {elapsed}s {cache_str}")
        return {"status": result.processing_status, "mpn": raw.mfg_part_num, "result": result}
    except Exception as e:
        print(f"[{index}/{total}] ❌ FAILED {raw.mfg_part_num}: {e}")
        return {"status": "error", "mpn": raw.mfg_part_num, "error": str(e)}

def run_batch():
    print("🚀 Initializing Universal AI Engine for BULK processing...")
    print(f"Loading dataset: {CSV_FILE_PATH}")
    
    if not os.path.exists(CSV_FILE_PATH):
        print(f"Error: Could not find {CSV_FILE_PATH}")
        return
        
    # Initialize the engine once
    engine = UniversalAIEngine()
    
    # Read all rows into memory
    rows = []
    with open(CSV_FILE_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
            
    total_rows = len(rows)
    print(f"📊 Found {total_rows} products to process.")
    print(f"⚙️ Running with {MAX_WORKERS} concurrent threads for high-speed processing...\n")
    
    success_count = 0
    error_count = 0
    cache_hits = 0
    skipped_count = 0
    
    start_time = time.time()
    
    # Process concurrently using ThreadPoolExecutor
    # This architecture scales gracefully to 100,000+ rows
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        for i, row in enumerate(rows):
            futures.append(executor.submit(process_single_row, row, engine, i+1, total_rows))
            time.sleep(1.5)  # Stagger requests to prevent slamming free tier rate limits (429)
            
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res["status"] == "completed":
                success_count += 1
                if res.get("result") and getattr(res["result"], "cache_hit", False):
                    cache_hits += 1
            elif res["status"] == "skipped":
                skipped_count += 1
            else:
                error_count += 1
                
    total_time = round(time.time() - start_time, 2)
    
    # Final Output Summary
    print("\n" + "="*50)
    print("🏁 BULK PROCESSING COMPLETE")
    print("==================================================")
    print(f"Total Products Checked: {total_rows}")
    print(f"Successful Ingestions:  {success_count}")
    print(f"Errors / Failed:        {error_count}")
    print(f"Skipped (Empty):        {skipped_count}")
    print(f"Cache Hits:             {cache_hits} (Saved API Cost & Time)")
    print(f"Total Wall-Clock Time:  {total_time} seconds")
    print(f"Avg Time Per Item:      {round(total_time/total_rows if total_rows else 0, 2)} seconds")
    print("==================================================")

if __name__ == "__main__":
    run_batch()
