import os
import sys
import csv
import json
import time
import httpx
from dotenv import load_dotenv
import re

sys.stdout.reconfigure(encoding='utf-8')

# Ensure paths
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_dir)
load_dotenv(os.path.join(root_dir, ".env"))

CSV_FILE_PATH = os.path.join(root_dir, "data", "sample_products", "unihack_batch.csv")
OUTPUT_FILE = os.path.join(root_dir, "data", "sample_products", "bulk_results.jsonl")
CHUNK_SIZE = 5
DELAY_BETWEEN_CHUNKS = 13.0 # Guarantees we stay under Groq's 8000 Tokens Per Minute (TPM) limit

def process_chunk(chunk, retry=0):
    if not chunk: return []
    
    # Format the chunk as a mini-CSV
    chunk_csv = "MPN,Description,Brand,Manufacturer\n"
    for r in chunk:
        mpn = r.get('Mfg_Part_Num', '').replace(',', ' ').strip()
        desc = r.get('Part_Desc', '').replace(',', ' ').strip()
        brand = r.get('E1_Brand', '').replace(',', ' ').strip()
        mfg = r.get('Part_Manuf', '').replace(',', ' ').strip()
        chunk_csv += f"{mpn},{desc},{brand},{mfg}\n"

    prompt = f"""
You are an expert industrial commerce data extraction engine.
I am providing you with {len(chunk)} raw product records in CSV format.

RAW PRODUCTS:
{chunk_csv}

Output EXACTLY ONE JSON OBJECT PER LINE for each product, and NOTHING ELSE. No reasoning, no markdown, no <think> blocks.
Example format:
{{"mpn": "value", "department": "value", "product_class": "value", "fine_category": "value", "product_type": "value", "invoice_desc": "value", "short_desc": "value", "attributes": [{{"name": "Attr", "value": "Val", "uom": "UOM"}}]}}
"""

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        print("❌ Error: GROQ_API_KEY is missing!")
        return []

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": [
            {"role": "system", "content": "You are a strict JSON extraction bot. Output only valid JSON Lines separated by newlines."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 1500,
        "temperature": 0.1
    }

    try:
        res = httpx.post(url, headers=headers, json=payload, timeout=60.0)
        res.raise_for_status()
        data = res.json()["choices"][0]["message"]["content"]
        
        # Strip any markdown blocks completely
        data = re.sub(r'```(?:json)?', '', data).strip()
        
        products = []
        
        # 1. Try to parse line-by-line (perfect for JSON Lines)
        for line in data.split('\n'):
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try: products.append(json.loads(line))
                except: pass
                    
        # 2. If we didn't get enough, try wrapping it in an array
        if len(products) < len(chunk):
            try:
                parsed = json.loads(data)
                if isinstance(parsed, list): products = parsed
                elif isinstance(parsed, dict) and "products" in parsed: products = parsed["products"]
            except:
                try:
                    modified = re.sub(r'\}\s*\{', '},{', data)
                    parsed = json.loads(f"[{modified}]")
                    if isinstance(parsed, list): products = parsed
                except: pass
                    
        # 3. Final fallback: regex extraction of objects
        if len(products) < len(chunk):
            matches = re.finditer(r'\{[^{}]*"mpn"[^{}]*\}', data)
            extracted = []
            for m in matches:
                try: extracted.append(json.loads(m.group(0)))
                except: pass
            if len(extracted) > len(products): products = extracted
                
        if len(products) != len(chunk):
            print(f"⚠️ Warning: Expected {len(chunk)} products, got {len(products)}")
        return products
    except Exception as e:
        print(f"❌ API Error on chunk: {e}")
        try: print(res.text)
        except: pass
        if retry < 3:
            print("⏳ Retrying chunk in 20s...")
            time.sleep(20)
            return process_chunk(chunk, retry + 1)
        return []

def run_bulk_engine():
    print("🚀 Initializing 24/7 Daemon Bulk Chunking Engine...")
    
    # 1. Load previously processed MPNs to enable auto-resume
    processed_mpns = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        obj = json.loads(line)
                        if "mpn" in obj: processed_mpns.add(str(obj["mpn"]).strip())
                    except: pass
    
    print(f"🔄 Auto-Resume: Found {len(processed_mpns)} products already processed.")
    
    # 2. Load dataset and filter out processed items
    rows = []
    with open(CSV_FILE_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            mpn = r.get("Mfg_Part_Num", "").strip()
            if mpn and mpn not in processed_mpns:
                rows.append(r)
                
    total_remaining = len(rows)
    if total_remaining == 0:
        print("✅ All products have been successfully processed!")
        return

    print(f"📊 Loaded {total_remaining} remaining products to process.")
    
    chunks = [rows[i:i + CHUNK_SIZE] for i in range(0, len(rows), CHUNK_SIZE)]
    print(f"📦 Created {len(chunks)} chunks of size {CHUNK_SIZE}.")
    
    success = 0
    start_time = time.time()
    
    # 3. Process in append mode
    with open(OUTPUT_FILE, "a", encoding="utf-8") as out:
        for idx, chunk in enumerate(chunks):
            chunk_start = time.time()
            print(f"➡️ Processing Chunk {idx+1}/{len(chunks)} ({len(chunk)} products)...")
            
            try:
                results = process_chunk(chunk)
                for res in results:
                    out.write(json.dumps(res) + "\n")
                    out.flush() # Instantly save to disk so no data is lost if killed
                    success += 1
            except Exception as e:
                print(f"🚨 FATAL ERROR IN CHUNK LOOP: {e}")
                print("💤 Sleeping for 60 seconds before continuing to prevent crash loop...")
                time.sleep(60)
                
            chunk_time = round(time.time() - chunk_start, 2)
            print(f"✅ Chunk {idx+1} complete in {chunk_time}s. Total successful items this session: {success}/{total_remaining}")
            
            if idx < len(chunks) - 1:
                time.sleep(DELAY_BETWEEN_CHUNKS)
                
    total_time = round(time.time() - start_time, 2)
    print("\n" + "="*50)
    print("🏁 BULK CHUNKING COMPLETE")
    print(f"Total Products Processed This Session: {success}/{total_remaining}")
    print(f"Total Wall-Clock Time:    {total_time} seconds")
    print("==================================================")

if __name__ == "__main__":
    while True:
        try:
            run_bulk_engine()
            # If run_bulk_engine finishes normally without exceptions, the dataset is complete.
            break
        except Exception as e:
            print(f"💥 DAEMON CRASH PROTECT: Unhandled exception: {e}")
            print("💤 Restarting daemon in 60 seconds...")
            time.sleep(60)
