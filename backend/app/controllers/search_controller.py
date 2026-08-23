from fastapi import APIRouter, Query
import chromadb
from chromadb.utils import embedding_functions
import json
import os

router = APIRouter(prefix="/search", tags=["search"])

# Initialize ChromaDB client
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CHROMA_DB_PATH = "D:/ProductIQ_2TB_Storage/chromadb_vector_cache"

client = None
collection = None

def get_collection():
    global client, collection
    if collection is None:
        try:
            client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
            default_ef = embedding_functions.DefaultEmbeddingFunction()
            collection = client.get_collection(name="industrial_products", embedding_function=default_ef)
        except Exception as e:
            print(f"Error loading ChromaDB: {e}")
            return None
    return collection

@router.get("")
def search_products(q: str = Query(..., min_length=1)):
    """
    Performs AI Semantic Search on the industrial_products ChromaDB collection.
    """
    col = get_collection()
    if not col:
        return {"error": "Vector Database not initialized or empty. Run vector_ingest.py first.", "results": []}

    results = col.query(
        query_texts=[q],
        n_results=10
    )
    
    products = []
    if results and "metadatas" in results and results["metadatas"] and results["metadatas"][0]:
        for meta in results["metadatas"][0]:
            if "raw_json" in meta:
                products.append(json.loads(meta["raw_json"]))
            else:
                products.append(meta)
                
    return {"query": q, "results": products}
