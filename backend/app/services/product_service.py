from app.schemas.product import Product
from app.db.supabase import get_supabase_client
import sys
import os
import csv
import io
import json

# Add root directory and ai-engine to python path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
ai_engine_dir = os.path.join(root_dir, "ai-engine")
for p in [root_dir, ai_engine_dir]:
    if p not in sys.path:
        sys.path.append(p)


from shared.schemas.product import RawProduct
from importlib import import_module


class ProductService:
    def __init__(self):
        self.products: dict[int, dict] = {}
        self.next_product_id: int = 1
        self.batch_status: dict[str, dict] = {}

    def create_product(self, product: Product) -> dict:
        supabase = get_supabase_client()
        product_data = product.model_dump(exclude_none=True)

        if supabase:
            try:
                response = supabase.table("products").insert(product_data).execute()
                if response.data:
                    row = response.data[0]
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
            except Exception as e:
                print(f"Supabase error in create_product: {e}")

        # Fallback to in-memory store
        self.products[self.next_product_id] = product_data
        created_product = {
            "id": self.next_product_id,
            **self.products[self.next_product_id]
        }
        self.next_product_id += 1
        return created_product

    def get_all_products(self) -> dict:
        """
        Reads the latest processed products directly from the daemon's bulk_results.jsonl
        This bypasses Supabase so the dashboard can see live extractions.
        """
        jsonl_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "sample_products", "bulk_results.jsonl")
        if not os.path.exists(jsonl_path):
            return {}
            
        products_dict = {}
        # Read the file and get the last 50 lines
        with open(jsonl_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Get up to the last 50 items
        recent_lines = lines[-50:]
        
        # Reverse them so newest is first
        recent_lines.reverse()
        
        for idx, line in enumerate(recent_lines):
            try:
                obj = json.loads(line.strip())
                mpn = obj.get("mpn", f"unknown-{idx}")
                products_dict[mpn] = obj
            except:
                pass
                
        return products_dict

    def get_product_by_id(self, product_id: int) -> dict:
        supabase = get_supabase_client()

        if supabase:
            try:
                response = supabase.table("products").select("*").eq("id", product_id).execute()
                if response.data:
                    row = response.data[0]
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
                return {"error": "Product not found"}
            except Exception as e:
                print(f"Supabase error in get_product_by_id: {e}")

        # Fallback to in-memory store
        if product_id not in self.products:
            return {"error": "Product not found"}

        return {
            "id": product_id,
            **self.products[product_id]
        }

    def update_product(self, product_id: int, product: Product) -> dict:
        supabase = get_supabase_client()
        product_data = product.model_dump(exclude_none=True)

        if supabase:
            try:
                response = supabase.table("products").update(product_data).eq("id", product_id).execute()
                if response.data:
                    row = response.data[0]
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
                return {"error": "Product not found"}
            except Exception as e:
                print(f"Supabase error in update_product: {e}")

        # Fallback to in-memory store
        if product_id not in self.products:
            return {"error": "Product not found"}

        self.products[product_id] = product_data
        return {
            "id": product_id,
            **self.products[product_id]
        }

    def delete_product(self, product_id: int) -> dict:
        supabase = get_supabase_client()

        if supabase:
            try:
                response = supabase.table("products").delete().eq("id", product_id).execute()
                if response.data:
                    row = response.data[0]
                    deleted_product = {
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
                    return {
                        "message": "Product deleted successfully",
                        "id": row["id"],
                        "product": deleted_product
                    }
                return {"error": "Product not found"}
            except Exception as e:
                print(f"Supabase error in delete_product: {e}")

        # Fallback to in-memory store
        if product_id not in self.products:
            return {"error": "Product not found"}

        deleted_product = self.products.pop(product_id)
        return {
            "message": "Product deleted successfully",
            "id": product_id,
            "product": deleted_product
        }

    def analyze_product(self, product: Product) -> dict:
        price_difference = product.price - product.competitor_price

        if price_difference < 0:
            price_position = "Cheaper than competitor"
        elif price_difference > 0:
            price_position = "More expensive than competitor"
        else:
            price_position = "Same price as competitor"

        return {
            "product": product.name,
            "category": product.category,
            "price": product.price,
            "competitor_price": product.competitor_price,
            "price_difference": price_difference,
            "price_position": price_position
        }

    def enrich_product(self, raw_product: RawProduct) -> dict:
        """
        Passes a raw, messy product to the AI Engine for full 252-column extraction,
        and saves the complete intelligence JSON to Supabase.
        """
        try:
            # Dynamically import engine to avoid circular/path issues
            ai_engine_module = import_module("universal_engine")
            UniversalAIEngine = getattr(ai_engine_module, "UniversalAIEngine")
            
            # Initialize engine and process
            engine = UniversalAIEngine()
            intelligence = engine.process_product(raw_product)
        except Exception as e:
            print(f"Critical AI Engine Error: {e}")
            from shared.schemas.product import ProductIntelligence, ProductIdentity
            intelligence = ProductIntelligence(
                identity=ProductIdentity(product_id="error", mpn=raw_product.mfg_part_num or "UNKNOWN"),
                processing_status="failed",
                error_message=str(e)
            )
        
        # Convert the Pydantic model to a standard dictionary (JSON)
        intelligence_dict = intelligence.model_dump(mode="json")
        
        # Save to Supabase
        supabase = get_supabase_client()
        if supabase:
            try:
                # We save a quick summary to the main columns, and the massive blob to ai_intelligence
                db_payload = {
                    "name": intelligence.content.product_title or raw_product.part_desc[:100],
                    "category": intelligence.classification.department or "Uncategorized",
                    "price": 0.0,  # AI engine might not extract price natively in this version
                    "competitor_price": 0.0,
                    "ai_intelligence": intelligence_dict
                }
                supabase.table("products").insert(db_payload).execute()
            except Exception as e:
                print(f"Supabase error saving AI data: {e}")
                
        return intelligence_dict

    def process_batch_csv(self, file_content: bytes, batch_id: str):
        """
        Background task: Parses a CSV file, iterates through all rows, 
        and enriches each product using the Universal AI Engine.
        """
        self.batch_status[batch_id] = {
            "status": "processing",
            "total": 0,
            "processed": 0,
            "errors": 0,
            "current_item": "",
            "message": "Initializing batch..."
        }
        
        try:
            # Parse CSV
            text = file_content.decode('utf-8', errors='replace')
            reader = list(csv.DictReader(io.StringIO(text)))
            total_items = len(reader)
            
            self.batch_status[batch_id]["total"] = total_items
            self.batch_status[batch_id]["message"] = f"Found {total_items} items to process."
            
            for index, row in enumerate(reader):
                # Safely extract MPN and description from various possible CSV headers
                mpn = row.get("Mfg_Part_Num", row.get("mpn", row.get("MPN", "")))
                desc = row.get("Part_Desc", row.get("description", row.get("Description", "")))
                
                self.batch_status[batch_id]["current_item"] = f"Item {index + 1}: {mpn} - {desc[:30]}"
                
                raw_product = RawProduct(
                    mfg_part_num=mpn,
                    part_desc=desc,
                    e1_brand=row.get("E1_Brand"),
                    unilog_brand=row.get("Unilog_Brand"),
                    dib_brand=row.get("DIB_Brand"),
                    part_manuf=row.get("Part_Manuf"),
                )
                
                try:
                    # Enrich and save (this calls the AI Engine and Supabase)
                    self.enrich_product(raw_product)
                    self.batch_status[batch_id]["processed"] += 1
                except Exception as e:
                    print(f"Error processing row {index}: {e}")
                    self.batch_status[batch_id]["errors"] += 1
                    
            self.batch_status[batch_id]["status"] = "completed"
            self.batch_status[batch_id]["message"] = f"Successfully processed {self.batch_status[batch_id]['processed']} items."
            
        except Exception as e:
            self.batch_status[batch_id]["status"] = "failed"
            self.batch_status[batch_id]["message"] = f"Batch failed: {str(e)}"

    def process_multimodal_batch(self, files_data: list, batch_id: str):
        """
        Background task: Iterates over a list of PDFs and Images.
        Uses multimodal_parser to extract text, and then enriches using Universal AI Engine.
        """
        self.batch_status[batch_id] = {
            "status": "processing",
            "total": len(files_data),
            "processed": 0,
            "errors": 0,
            "current_item": "",
            "message": "Initializing multi-modal batch..."
        }

        try:
            # Dynamically import parser
            ai_engine_module = import_module("multimodal_parser")
            multimodal_parser = getattr(ai_engine_module, "multimodal_parser")

            for index, file_info in enumerate(files_data):
                filename = file_info["filename"]
                content = file_info["content"]
                
                self.batch_status[batch_id]["current_item"] = f"Extracting {filename}..."
                
                # 1. Parse Document/Image to Text
                extracted_text = multimodal_parser.parse_file(content, filename)
                
                self.batch_status[batch_id]["current_item"] = f"AI Enriching {filename}..."
                
                # 2. Construct RawProduct
                raw_product = RawProduct(
                    mfg_part_num=filename.split('.')[0][:20], # Rough guess
                    part_desc=f"Extracted from {filename}:\n\n{extracted_text[:3000]}", # Pass text
                )
                
                try:
                    # 3. Enrich and save
                    self.enrich_product(raw_product)
                    self.batch_status[batch_id]["processed"] += 1
                except Exception as e:
                    print(f"Error AI enriching {filename}: {e}")
                    self.batch_status[batch_id]["errors"] += 1

            self.batch_status[batch_id]["status"] = "completed"
            self.batch_status[batch_id]["message"] = f"Successfully processed {self.batch_status[batch_id]['processed']} documents."
            
        except Exception as e:
            self.batch_status[batch_id]["status"] = "failed"
            self.batch_status[batch_id]["message"] = f"Batch failed: {str(e)}"

    def get_batch_status(self, batch_id: str) -> dict:
        if batch_id not in self.batch_status:
            return {"status": "not_found", "message": "Batch ID does not exist."}
        return self.batch_status[batch_id]


# Global singleton instance for service persistence
product_service = ProductService()
