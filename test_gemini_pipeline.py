import os
import sys
import time
import json
import csv
import httpx
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

root = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(root, '.env'))

gemini_key = os.getenv("GEMINI_API_KEY", "")

if not gemini_key:
    print("❌ ERROR: GEMINI_API_KEY is not set in .env file!")
    sys.exit(1)

print("==================================================================")
print("     ⚡ PURE GEMINI 3 FLASH — LIVE INDUSTRIAL DATA PROCESSING")
print("==================================================================")

# 1. Load a real raw product from CSV
csv_file = os.path.join(root, 'data', 'sample_products', 'sample_raw_items.csv')
sample_rows = []
if os.path.exists(csv_file):
    with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Part_Desc') or row.get('PART_DESC') or row.get('Description'):
                sample_rows.append({k.lower().strip(): v for k, v in row.items()})
            if len(sample_rows) >= 3:
                break

if not sample_rows:
    sample_rows = [{
        'mfg_part_num': 'LC1D25BD',
        'part_desc': 'TeSys D Contactor 3P 24V DC 25A Coil Voltage 24V DC Rated Current 25A 3 Poles',
        'e1_brand': '-- Unbranded --',
        'part_manuf': 'Schneider Electric'
    }]

raw = sample_rows[0]
mpn = raw.get('mfg_part_num') or raw.get('item_number') or 'INDUSTRIAL-SKU-1'
desc = raw.get('part_desc') or raw.get('description') or 'Industrial Product'
raw_brand = raw.get('e1_brand') or raw.get('unilog_brand') or '-- Unbranded --'
raw_manuf = raw.get('part_manuf') or 'Unknown'

print(f"\n📥 [INPUT] RAW CATALOG RECORD FROM CSV:")
print(f"  • MPN / SKU:       {mpn}")
print(f"  • Description:     {desc}")
print(f"  • Raw Brand:       {raw_brand}")
print(f"  • Raw Manuf:       {raw_manuf}")

# 2. Construct Master Industrial Extraction Prompt
prompt = f"""
You are the ADHARRA Industrial Commerce Intelligence Engine.
Analyze the following messy industrial product catalog record and extract commercial-grade structured data.

Input Record:
- MPN: {mpn}
- Description: {desc}
- Brand Hint: {raw_brand}
- Manufacturer Hint: {raw_manuf}

Output strictly valid JSON matching this exact structure:
{{
  "brand_resolved": "Clean Standardized Brand Name (resolve unbranded or messy aliases)",
  "manufacturer_resolved": "Standardized Manufacturer Corporate Name",
  "product_title": "Standardized title: Brand + Model + Product Class + Key Spec (max 100 chars)",
  "department": "e.g. Electrical / Power Distribution, Tools, Plumbing, Hydraulics",
  "product_class": "e.g. IEC Contactors, Sanding Belts, Hydraulic Valves",
  "unspsc_code": "8-digit UNSPSC code if identifiable or null",
  "invoice_description": "UPPERCASE commercial description (STRICTLY MAXIMUM 40 CHARACTERS)",
  "mobile_description": "Mobile ecommerce description (STRICTLY BETWEEN 60 AND 80 CHARACTERS)",
  "short_description": "Technical short description (1-2 sentences)",
  "attributes": [
    {{
      "name": "Attribute Name (e.g. Voltage, Current, Size, Material, Grit)",
      "value": "Normalized numerical or categorical value",
      "uom": "Standard Industrial UOM (e.g. V, A, in, mm, kW, pc) or empty string",
      "confidence": 0.95
    }}
  ],
  "confidence_score": 0.95
}}
"""

print("\n🚀 [PROCESSING] Querying Gemini 3 Flash API directly...")
t0 = time.time()

try:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={gemini_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json"
        }
    }
    
    res = httpx.post(url, json=payload, timeout=30)
    dur = round(time.time() - t0, 2)
    
    if res.status_code == 200:
        data = res.json()
        raw_output = data['candidates'][0]['content']['parts'][0]['text']
        extracted = json.loads(raw_output)
        
        print(f"\n==================================================================")
        print(f"  ✅ GEMINI 3 FLASH EXTRACTION COMPLETED IN {dur}s")
        print("==================================================================")
        
        print(f"\n🏷️  1. IDENTITY & CLASSIFICATION:")
        print(f"  • Resolved Brand:        {extracted.get('brand_resolved')}")
        print(f"  • Resolved Manufacturer: {extracted.get('manufacturer_resolved')}")
        print(f"  • Product Title:         {extracted.get('product_title')}")
        print(f"  • Department:            {extracted.get('department')}")
        print(f"  • Product Class:         {extracted.get('product_class')}")
        print(f"  • UNSPSC Code:           {extracted.get('unspsc_code')}")
        
        print(f"\n📝 2. COMMERCIAL DESCRIPTIONS (Rule-Constrained):")
        inv_desc = extracted.get('invoice_description', '')
        mob_desc = extracted.get('mobile_description', '')
        print(f"  • Invoice Desc ({len(inv_desc)}/40 chars):  {inv_desc}")
        print(f"  • Mobile Desc  ({len(mob_desc)}/80 chars):  {mob_desc}")
        print(f"  • Short Description:         {extracted.get('short_description')}")
        
        print(f"\n⚙️  3. NORMALIZED TECHNICAL ATTRIBUTES ({len(extracted.get('attributes', []))} Extracted):")
        print("  " + "-" * 60)
        print(f"  {'ATTRIBUTE NAME':<25} | {'VALUE':<20} | {'UOM':<8}")
        print("  " + "-" * 60)
        for attr in extracted.get('attributes', []):
            name = attr.get('name', '')
            val = str(attr.get('value', ''))
            uom = attr.get('uom', '')
            print(f"  {name:<25} | {val:<20} | {uom:<8}")
        print("  " + "-" * 60)
        
        print(f"\n📊 4. CONFIDENCE & QUALITY SCORE:")
        print(f"  • Engine Confidence:     {extracted.get('confidence_score', 0.95) * 100:.1f}% (HIGH)")
        print(f"  • Execution Time:        {dur} seconds")
        print("==================================================================\n")
    else:
        print(f"⚠️ Gemini API Status: {res.status_code}")
        print(f"Error Details: {res.text}")
except Exception as e:
    print(f"❌ Error executing Gemini extraction: {e}")
