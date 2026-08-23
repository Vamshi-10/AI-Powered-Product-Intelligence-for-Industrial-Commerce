import os
import sys
import json
import chromadb
from chromadb.utils import embedding_functions

sys.stdout.reconfigure(encoding='utf-8')

# Ensure paths
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSONL_FILE = os.path.join(root_dir, "data", "sample_products", "bulk_results.jsonl")
CHROMA_DB_PATH = "D:/ProductIQ_2TB_Storage/chromadb_vector_cache"  # High capacity SSD storage path for Vector DB

def build_search_document(product):
    """
    Creates a rich text document for the embedding model to ingest.
    We combine the description, brand, categories, and technical attributes.
    """
    doc_parts = []
    if product.get('short_desc'):
        doc_parts.append(product['short_desc'])
    if product.get('invoice_desc'):
        doc_parts.append(product['invoice_desc'])
    if product.get('brand'):
        doc_parts.append(f"Brand: {product['brand']}")
    if product.get('department'):
        doc_parts.append(f"Category: {product['department']}")
        
    attributes = product.get('attributes', [])
    for attr in attributes:
        name = attr.get('name', '')
        val = attr.get('value', '')
        uom = attr.get('uom', '')
        if name and val:
            if uom and uom != "N/A":
                doc_parts.append(f"{name}: {val} {uom}")
            else:
                doc_parts.append(f"{name}: {val}")
                
    return " | ".join(doc_parts)

def ingest_data():
    if not os.path.exists(JSONL_FILE):
        print(f"❌ Error: {JSONL_FILE} not found. Ensure bulk_engine.py has processed data.")
        return

    print("🚀 Initializing ChromaDB Persistent Client...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    
    # We use the default embedding function (all-MiniLM-L6-v2)
    default_ef = embedding_functions.DefaultEmbeddingFunction()
    
    collection = client.get_or_create_collection(
        name="industrial_products",
        embedding_function=default_ef
    )
    
    print("📖 Reading products from JSONL...")
    products = []
    with open(JSONL_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    products.append(json.loads(line))
                except:
                    pass
                    
    print(f"📊 Found {len(products)} products to ingest.")
    
    # Prepare batch data
    ids = []
    documents = []
    metadatas = []
    
    for p in products:
        mpn = str(p.get("mpn", "")).strip()
        if not mpn:
            continue
            
        doc = build_search_document(p)
        
        # Metadata must be strings, ints, floats, or bools (not dicts/lists)
        meta = {
            "mpn": mpn,
            "short_desc": str(p.get("short_desc", "")),
            "department": str(p.get("department", "")),
            "product_class": str(p.get("product_class", "")),
            "brand": str(p.get("brand", ""))
        }
        
        # Save raw json for the frontend to render
        meta["raw_json"] = json.dumps(p)
        
        ids.append(mpn)
        documents.append(doc)
        metadatas.append(meta)
        
    # Ingest in chunks of 5000 to prevent memory issues
    BATCH_SIZE = 5000
    for i in range(0, len(ids), BATCH_SIZE):
        batch_ids = ids[i:i + BATCH_SIZE]
        batch_docs = documents[i:i + BATCH_SIZE]
        batch_meta = metadatas[i:i + BATCH_SIZE]
        
        print(f"🔄 Ingesting batch {i} to {i + len(batch_ids)}...")
        
        # upsert handles updates to existing MPNs automatically
        collection.upsert(
            documents=batch_docs,
            metadatas=batch_meta,
            ids=batch_ids
        )
        
    print("✅ Ingestion complete! The Vector Search Engine is ready.")

if __name__ == "__main__":
    ingest_data()
