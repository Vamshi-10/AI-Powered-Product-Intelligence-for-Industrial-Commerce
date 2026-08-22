import io
import json
import uuid
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional

import pandas as pd
from PIL import Image
from pypdf import PdfReader

from app.schemas.product import Product
from app.services.product_service import product_service


class DocumentService:

    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.job_counter: int = 1001

    def parse_and_import_file(
        self,
        file_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:

        if not filename:
            return {
                "error": "No filename provided."
            }

        filename_lower = filename.lower()

        # ---------------------------------------------------------
        # 1. CSV / EXCEL FILES
        # ---------------------------------------------------------
        if filename_lower.endswith(".csv") or filename_lower.endswith(
            (".xlsx", ".xls")
        ):
            return self._process_tabular_file(
                file_bytes,
                filename
            )

        # ---------------------------------------------------------
        # 2. JSON FILE
        # ---------------------------------------------------------
        if filename_lower.endswith(".json"):
            return self._process_json_file(
                file_bytes,
                filename
            )

        # ---------------------------------------------------------
        # 3. TXT FILE
        # ---------------------------------------------------------
        if filename_lower.endswith(".txt"):
            return self._process_text_file(
                file_bytes,
                filename
            )

        # ---------------------------------------------------------
        # 4. PDF FILE
        # ---------------------------------------------------------
        if filename_lower.endswith(".pdf"):
            return self._process_pdf_file(
                file_bytes,
                filename
            )

        # ---------------------------------------------------------
        # 5. IMAGE FILES
        # ---------------------------------------------------------
        if filename_lower.endswith(
            (
                ".png",
                ".jpg",
                ".jpeg",
                ".webp",
                ".gif",
                ".bmp",
                ".tiff",
                ".tif"
            )
        ):
            return self._process_image_file(
                file_bytes,
                filename
            )

        # ---------------------------------------------------------
        # 6. UNSUPPORTED FILE
        # ---------------------------------------------------------
        return {
            "error": (
                "Unsupported file format. Supported formats are: "
                "PDF, CSV, XLS, XLSX, JSON, TXT, PNG, JPG, JPEG, "
                "WEBP, GIF, BMP, TIFF."
            )
        }

    # =============================================================
    # CSV / EXCEL PROCESSING
    # =============================================================

    def _process_tabular_file(
        self,
        file_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:

        try:

            if filename.lower().endswith(".csv"):
                df = pd.read_csv(
                    io.BytesIO(file_bytes)
                )

            else:
                df = pd.read_excel(
                    io.BytesIO(file_bytes)
                )

        except Exception as e:
            return {
                "error": f"Failed to read file contents: {str(e)}"
            }

        if df.empty:
            return {
                "error": "The uploaded file is empty."
            }

        # ---------------------------------------------------------
        # Standardize column headers
        # ---------------------------------------------------------

        column_mapping = {}

        for col in df.columns:

            clean_col = (
                str(col)
                .strip()
                .lower()
                .replace(" ", "_")
            )

            if clean_col in [
                "product_name",
                "product",
                "item",
                "title"
            ]:
                column_mapping[col] = "name"

            elif clean_col in [
                "cat",
                "type"
            ]:
                column_mapping[col] = "category"

            elif clean_col in [
                "cost",
                "unit_price",
                "our_price"
            ]:
                column_mapping[col] = "price"

            elif clean_col in [
                "comp_price",
                "competitor",
                "market_price"
            ]:
                column_mapping[col] = "competitor_price"

            else:
                column_mapping[col] = clean_col

        df = df.rename(
            columns=column_mapping
        )

        # ---------------------------------------------------------
        # Required columns for the existing Product model
        # ---------------------------------------------------------

        required_columns = [
            "name",
            "category",
            "price",
            "competitor_price"
        ]

        missing_columns = [
            col
            for col in required_columns
            if col not in df.columns
        ]

        if missing_columns:
            return {
                "error": (
                    "Missing required columns: "
                    + ", ".join(missing_columns)
                    + ". Found columns: "
                    + str(list(df.columns))
                )
            }

        inserted_products = []
        errors = []
        processed_count = 0

        # ---------------------------------------------------------
        # Insert products
        # ---------------------------------------------------------

        for index, row in df.iterrows():

            processed_count += 1

            try:

                product_data = Product(
                    name=str(
                        row["name"]
                    ).strip(),

                    category=str(
                        row["category"]
                    ).strip(),

                    price=float(
                        row["price"]
                    ),

                    competitor_price=float(
                        row["competitor_price"]
                    )
                )

                created = product_service.create_product(
                    product_data
                )

                inserted_products.append(
                    created
                )

            except Exception as row_error:

                errors.append(
                    {
                        "row": index + 1,
                        "error": str(row_error)
                    }
                )

        return {
            "filename": filename,
            "file_type": "tabular",
            "processed_rows": processed_count,
            "inserted_count": len(inserted_products),
            "failed_count": len(errors),
            "inserted_products": inserted_products,
            "errors": errors
        }

    # =============================================================
    # JSON PROCESSING
    # =============================================================

    def _process_json_file(
        self,
        file_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:

        try:

            content = file_bytes.decode(
                "utf-8"
            )

            data = json.loads(
                content
            )

        except Exception as e:

            return {
                "error": (
                    f"Failed to read JSON file: {str(e)}"
                )
            }

        # If JSON contains a list of products, try to process it
        if isinstance(data, list):

            try:

                df = pd.DataFrame(data)

                if df.empty:
                    return {
                        "error": "The uploaded JSON file is empty."
                    }

                return self._process_dataframe(
                    df,
                    filename,
                    "json"
                )

            except Exception as e:

                return {
                    "error": (
                        f"Failed to process JSON products: {str(e)}"
                    )
                }

        # If JSON contains one product object
        if isinstance(data, dict):

            try:

                df = pd.DataFrame(
                    [data]
                )

                return self._process_dataframe(
                    df,
                    filename,
                    "json"
                )

            except Exception as e:

                return {
                    "error": (
                        f"Failed to process JSON product: {str(e)}"
                    )
                }

        return {
            "error": (
                "JSON must contain a product object "
                "or a list of product objects."
            )
        }

    # =============================================================
    # DATAFRAME PROCESSING FOR JSON
    # =============================================================

    def _process_dataframe(
        self,
        df: pd.DataFrame,
        filename: str,
        file_type: str
    ) -> Dict[str, Any]:

        if df.empty:
            return {
                "error": "The uploaded file is empty."
            }

        column_mapping = {}

        for col in df.columns:

            clean_col = (
                str(col)
                .strip()
                .lower()
                .replace(" ", "_")
            )

            if clean_col in [
                "product_name",
                "product",
                "item",
                "title"
            ]:
                column_mapping[col] = "name"

            elif clean_col in [
                "cat",
                "type"
            ]:
                column_mapping[col] = "category"

            elif clean_col in [
                "cost",
                "unit_price",
                "our_price"
            ]:
                column_mapping[col] = "price"

            elif clean_col in [
                "comp_price",
                "competitor",
                "market_price"
            ]:
                column_mapping[col] = "competitor_price"

            else:
                column_mapping[col] = clean_col

        df = df.rename(
            columns=column_mapping
        )

        required_columns = [
            "name",
            "category",
            "price",
            "competitor_price"
        ]

        missing_columns = [
            col
            for col in required_columns
            if col not in df.columns
        ]

        # JSON can be accepted even when it doesn't yet contain
        # all product fields. This allows it to move to the
        # future processing / AI stage.
        if missing_columns:

            return {
                "filename": filename,
                "file_type": file_type,
                "status": "accepted_for_processing",
                "processed_rows": len(df),
                "inserted_count": 0,
                "failed_count": 0,
                "missing_fields": missing_columns,
                "data": df.to_dict(
                    orient="records"
                )
            }

        # If all required fields exist, import normally
        return self._insert_dataframe_products(
            df,
            filename,
            file_type
        )

    # =============================================================
    # INSERT DATAFRAME PRODUCTS
    # =============================================================

    def _insert_dataframe_products(
        self,
        df: pd.DataFrame,
        filename: str,
        file_type: str
    ) -> Dict[str, Any]:

        inserted_products = []
        errors = []

        for index, row in df.iterrows():

            try:

                product_data = Product(
                    name=str(
                        row["name"]
                    ).strip(),

                    category=str(
                        row["category"]
                    ).strip(),

                    price=float(
                        row["price"]
                    ),

                    competitor_price=float(
                        row["competitor_price"]
                    )
                )

                created = product_service.create_product(
                    product_data
                )

                inserted_products.append(
                    created
                )

            except Exception as row_error:

                errors.append(
                    {
                        "row": index + 1,
                        "error": str(row_error)
                    }
                )

        return {
            "filename": filename,
            "file_type": file_type,
            "processed_rows": len(df),
            "inserted_count": len(inserted_products),
            "failed_count": len(errors),
            "inserted_products": inserted_products,
            "errors": errors
        }

    # =============================================================
    # TXT PROCESSING
    # =============================================================

    def _process_text_file(
        self,
        file_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:

        try:

            text = file_bytes.decode(
                "utf-8"
            ).strip()

        except UnicodeDecodeError:

            return {
                "error": (
                    "The TXT file could not be decoded as UTF-8."
                )
            }

        if not text:
            return {
                "error": "The uploaded TXT file is empty."
            }

        return {
            "filename": filename,
            "file_type": "txt",
            "status": "accepted_for_processing",
            "processed_rows": 1,
            "inserted_count": 0,
            "failed_count": 0,
            "content": text
        }

    # =============================================================
    # PDF PROCESSING
    # =============================================================

    def _process_pdf_file(
        self,
        file_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:

        try:

            reader = PdfReader(
                io.BytesIO(file_bytes)
            )

            pages = []

            for page_number, page in enumerate(
                reader.pages,
                start=1
            ):

                page_text = (
                    page.extract_text()
                    or ""
                )

                pages.append(
                    {
                        "page": page_number,
                        "text": page_text
                    }
                )

            full_text = "\n".join(
                page["text"]
                for page in pages
            ).strip()

        except Exception as e:

            return {
                "error": (
                    f"Failed to read PDF file: {str(e)}"
                )
            }

        if not full_text:

            return {
                "filename": filename,
                "file_type": "pdf",
                "status": "accepted_for_processing",
                "processed_rows": len(pages),
                "inserted_count": 0,
                "failed_count": 0,
                "content": "",
                "pages": pages,
                "warning": (
                    "No text could be extracted from this PDF. "
                    "It may be a scanned/image-only PDF and "
                    "will require OCR during processing."
                )
            }

        return {
            "filename": filename,
            "file_type": "pdf",
            "status": "accepted_for_processing",
            "processed_rows": len(pages),
            "inserted_count": 0,
            "failed_count": 0,
            "content": full_text,
            "pages": pages
        }

    # =============================================================
    # IMAGE PROCESSING
    # =============================================================

    def _process_image_file(
        self,
        file_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:

        try:

            image = Image.open(
                io.BytesIO(file_bytes)
            )

            image_format = image.format
            width, height = image.size

        except Exception as e:

            return {
                "error": (
                    f"Failed to read image file: {str(e)}"
                )
            }

        return {
            "filename": filename,
            "file_type": "image",
            "status": "accepted_for_processing",
            "processed_rows": 1,
            "inserted_count": 0,
            "failed_count": 0,
            "image": {
                "format": image_format,
                "width": width,
                "height": height
            },
            "message": (
                "Image accepted successfully. "
                "OCR/image analysis can be performed "
                "by the processing/AI module."
            )
        }

    # =============================================================
    # URL PROCESSING
    # =============================================================

    def process_url(self, url: str) -> Dict[str, Any]:
        if not url or not isinstance(url, str):
            return {"error": "Invalid URL provided."}

        parsed = urlparse(url.strip())
        if not parsed.scheme or parsed.scheme not in ["http", "https"] or not parsed.netloc:
            return {"error": "Invalid URL. Scheme must be http or https."}

        source_id = f"src-url-{uuid.uuid4().hex[:8]}"
        return {
            "sourceId": source_id,
            "source_type": "url",
            "url": url.strip(),
            "status": "accepted_for_processing",
            "message": "Product URL accepted successfully for later processing."
        }

    # =============================================================
    # PASTED TEXT PROCESSING
    # =============================================================

    def process_pasted_text(self, text: str) -> Dict[str, Any]:
        if not text or not isinstance(text, str) or not text.strip():
            return {"error": "Pasted text cannot be empty."}

        # Safe replacement encoding/decoding for invalid characters
        clean_text = text.encode("utf-8", errors="replace").decode("utf-8").strip()
        source_id = f"src-txt-{uuid.uuid4().hex[:8]}"

        return {
            "sourceId": source_id,
            "source_type": "text",
            "status": "accepted_for_processing",
            "content": clean_text,
            "message": "Pasted text accepted successfully for later processing."
        }

    # =============================================================
    # MANUAL PRODUCT PROCESSING
    # =============================================================

    def process_manual_product(self, product: Product) -> Dict[str, Any]:
        created = product_service.create_product(product)
        return {
            "source_type": "manual",
            "status": "inserted",
            "product": created
        }

    # =============================================================
    # JOB TRACKING MANAGEMENT
    # =============================================================

    def create_job(
        self,
        sources_count: int = 1,
        sources: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        job_id = f"JOB-{self.job_counter}"
        self.job_counter += 1

        job_info = {
            "jobId": job_id,
            "status": "queued",
            "progress": 0,
            "currentStage": "sources_added",
            "sourcesReceived": sources_count,
            "overallConfidence": 1.0,
            "sources": sources or []
        }
        self.jobs[job_id] = job_info

        return {
            "jobId": job_id,
            "status": "queued",
            "sourcesReceived": sources_count
        }

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        if job_id not in self.jobs:
            return {"error": f"Job {job_id} not found."}

        job = self.jobs[job_id]
        return {
            "jobId": job["jobId"],
            "status": job["status"],
            "progress": job["progress"],
            "currentStage": job["currentStage"],
            "sourcesReceived": job.get("sourcesReceived", 1),
            "overallConfidence": job.get("overallConfidence", 1.0)
        }


document_service = DocumentService()