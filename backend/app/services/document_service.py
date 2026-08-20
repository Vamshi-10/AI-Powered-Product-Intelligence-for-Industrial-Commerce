import io
import pandas as pd
from typing import Dict, Any
from app.schemas.product import Product
from app.services.product_service import product_service


class DocumentService:
    def parse_and_import_file(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        filename_lower = filename.lower()

        try:
            if filename_lower.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_bytes))
            elif filename_lower.endswith((".xlsx", ".xls")):
                df = pd.read_excel(io.BytesIO(file_bytes))
            else:
                return {
                    "error": "Unsupported file format. Please upload a .csv or .xlsx/.xls file."
                }
        except Exception as e:
            return {"error": f"Failed to read file contents: {str(e)}"}

        if df.empty:
            return {"error": "The uploaded file is empty."}

        # Standardize column headers
        column_mapping = {}
        for col in df.columns:
            clean_col = str(col).strip().lower().replace(" ", "_")
            if clean_col in ["product_name", "product", "item", "title"]:
                column_mapping[col] = "name"
            elif clean_col in ["cat", "type"]:
                column_mapping[col] = "category"
            elif clean_col in ["cost", "unit_price", "our_price"]:
                column_mapping[col] = "price"
            elif clean_col in ["comp_price", "competitor", "market_price"]:
                column_mapping[col] = "competitor_price"
            else:
                column_mapping[col] = clean_col

        df = df.rename(columns=column_mapping)

        required_columns = ["name", "category", "price", "competitor_price"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {
                "error": f"Missing required columns: {', '.join(missing_columns)}. Found columns: {list(df.columns)}"
            }

        inserted_products = []
        errors = []
        processed_count = 0

        for index, row in df.iterrows():
            processed_count += 1
            try:
                product_data = Product(
                    name=str(row["name"]).strip(),
                    category=str(row["category"]).strip(),
                    price=float(row["price"]),
                    competitor_price=float(row["competitor_price"])
                )
                created = product_service.create_product(product_data)
                inserted_products.append(created)
            except Exception as row_error:
                errors.append({
                    "row": index + 1,
                    "error": str(row_error)
                })

        return {
            "filename": filename,
            "processed_rows": processed_count,
            "inserted_count": len(inserted_products),
            "failed_count": len(errors),
            "inserted_products": inserted_products,
            "errors": errors
        }


document_service = DocumentService()
