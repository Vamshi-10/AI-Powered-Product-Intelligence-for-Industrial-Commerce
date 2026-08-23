"""
Vector Memory Cache (ChromaDB on 2TB External Storage)
Bypasses LLM latency and token costs for 90%+ similar products.
Owned by Vamshi Krishna (AI Engine Developer & Project Lead)
"""

import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from shared.config.settings import (
    VECTOR_DB_DIR,
    VECTOR_SIMILARITY_THRESHOLD,
    EMBEDDING_MODEL,
)

logger = logging.getLogger("ProductMemory")


class ProductVectorMemory:
    """
    Persistent ChromaDB cache stored on the 2TB external drive.
    Searches previously enriched products. If similarity >= 90%, returns cached data in 0.05s.
    """

    def __init__(self, persist_dir: Path = VECTOR_DB_DIR):
        self.persist_dir = str(persist_dir)
        self.chroma_client = None
        self.collection = None
        self.embedder = None
        self._init_db()

    def _init_db(self):
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer

            self.chroma_client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = self.chroma_client.get_or_create_collection(
                name="industrial_products_cache",
                metadata={"hnsw:space": "cosine"},
            )
            # Lightweight 80MB local embedding model
            self.embedder = SentenceTransformer(EMBEDDING_MODEL)
            logger.info(f"✅ Vector Memory Cache initialized on 2TB storage: {self.persist_dir}")
        except Exception as e:
            logger.warning(f"ChromaDB / SentenceTransformer not available: {e}. Falling back to memory bypass.")
            self.collection = None

    def find_similar_product(self, description: str, threshold: float = VECTOR_SIMILARITY_THRESHOLD) -> Dict[str, Any]:
        """
        Queries the vector index for similar products.
        Returns cached record if similarity exceeds threshold.
        """
        if not self.collection or not self.embedder:
            return {"found": False}

        if not description or not description.strip():
            return {"found": False}

        try:
            # Normalize text to improve cache hit rate (ignore extra spacing/newlines)
            normalized_desc = " ".join(description.strip().split())
            embedding = self.embedder.encode(normalized_desc).tolist()
            results = self.collection.query(
                query_embeddings=[embedding],
                n_results=1,
            )

            if results["distances"] and results["distances"][0]:
                cosine_dist = results["distances"][0][0]
                similarity = round(1.0 - cosine_dist, 3)
                if similarity >= threshold:
                    metadata = results["metadatas"][0][0]
                    cached_record = json.loads(metadata.get("enriched_record", "{}"))
                    logger.info(f"⚡ Vector Cache HIT (Similarity: {similarity})! Bypassed LLM.")
                    return {
                        "found": True,
                        "similarity": similarity,
                        "cached_record": cached_record,
                    }
        except Exception as e:
            logger.warning(f"Error querying Vector Cache: {e}")

        return {"found": False}

    def store_enriched_product(self, product_id: str, description: str, enriched_record: Dict[str, Any]):
        """
        Stores an enriched product in the vector database for future caching.
        """
        if not self.collection or not self.embedder:
            return

        if not description or not description.strip():
            return

        try:
            # Normalize text to match search format
            normalized_desc = " ".join(description.strip().split())
            embedding = self.embedder.encode(normalized_desc).tolist()
            self.collection.upsert(
                ids=[product_id],
                embeddings=[embedding],
                documents=[normalized_desc],
                metadatas=[{"enriched_record": json.dumps(enriched_record)}],
            )
            logger.info(f"💾 Saved product {product_id} to Vector Memory on 2TB drive.")
        except Exception as e:
            logger.warning(f"Error saving to Vector Cache: {e}")
