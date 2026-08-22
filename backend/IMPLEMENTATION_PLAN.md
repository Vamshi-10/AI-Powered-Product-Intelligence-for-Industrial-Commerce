# BACKEND — Complete Implementation Plan (0% → 100%)

> **READ THIS FIRST**: This file contains EVERYTHING needed to build the Backend module. It is the API layer, database, and orchestrator for an "AI Product Data Intelligence Platform".

---

## 1. PROJECT CONTEXT

This backend serves as the REST API layer between the React frontend and the AI Engine. It handles file upload, product storage, pipeline orchestration, and 252-column CSV export.

### What the backend does:
- Accept CSV file uploads containing messy product data
- Store raw and enriched product records in SQLite
- Trigger the AI Engine pipeline for individual or batch processing
- Serve enriched product data to the frontend via REST API
- Export processed products to the client's 252-column delivery format
- Track processing status, batch progress, and dashboard statistics

### Input: 6-column CSV
```csv
Mfg_Part_Num,Part_Desc,E1_Brand,Unilog_Brand,DIB_Brand,Part_Manuf
```

### Output: 252-column CSV matching client delivery format

---

## 2. TECHNOLOGY STACK

```
fastapi>=0.104.0
uvicorn>=0.24.0
sqlalchemy>=2.0
python-multipart>=0.0.6
openpyxl>=3.1.0
pydantic>=2.0
```

Run: `pip install fastapi uvicorn sqlalchemy python-multipart openpyxl pydantic`

---

## 3. FOLDER STRUCTURE

```
backend/
├── __init__.py
├── main.py              # FastAPI application entry point
├── database.py          # SQLite/SQLAlchemy setup
├── models.py            # Database ORM models
├── api/
│   ├── __init__.py
│   ├── upload.py        # POST /api/upload — file upload
│   ├── products.py      # GET/PATCH /api/products — CRUD
│   ├── process.py       # POST /api/process — trigger AI pipeline
│   └── export.py        # GET /api/export — 252-column export
└── services/
    ├── __init__.py
    ├── orchestrator.py   # Batch processing coordinator
    └── export_engine.py  # Maps ProductIntelligence → 252 columns
```

---

## 4. FILE-BY-FILE IMPLEMENTATION

### File: `backend/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import upload, products, process, export
from .database import engine as db_engine
from . import models

models.Base.metadata.create_all(bind=db_engine)

app = FastAPI(title="AI Product Intelligence Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(process.router, prefix="/api", tags=["Processing"])
app.include_router(export.router, prefix="/api", tags=["Export"])

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ai-product-intelligence"}
```

Start with: `uvicorn backend.main:app --reload --port 8000`

### File: `backend/database.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./products.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### File: `backend/models.py`
```python
from sqlalchemy import Column, String, Float, Boolean, Integer, Text, DateTime, JSON
from datetime import datetime
from .database import Base

class ProductRecord(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String, unique=True, index=True)
    batch_id = Column(String, index=True)
    mpn = Column(String, index=True)
    raw_input = Column(JSON)
    enriched_data = Column(JSON)
    manufacturer = Column(String)
    brand = Column(String)
    classpath = Column(String)
    overall_confidence = Column(Float, default=0.0)
    confidence_level = Column(String, default="very_low")
    needs_human_review = Column(Boolean, default=True)
    processing_status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UploadBatch(Base):
    __tablename__ = "upload_batches"
    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String, unique=True, index=True)
    filename = Column(String)
    total_rows = Column(Integer)
    processed_rows = Column(Integer, default=0)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
```

### File: `backend/api/upload.py`
```python
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
import uuid, csv, io
from ..database import get_db
from ..models import ProductRecord, UploadBatch
from shared.config.settings import PLACEHOLDER_VALUES

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    
    batch_id = str(uuid.uuid4())[:8]
    rows = []
    for row in reader:
        clean = {}
        for k, v in row.items():
            val = v.strip() if v else None
            if val in PLACEHOLDER_VALUES:
                val = None
            clean[k] = val
        rows.append(clean)
    
    # Create batch
    batch = UploadBatch(batch_id=batch_id, filename=file.filename, total_rows=len(rows))
    db.add(batch)
    
    # Create product records
    for row in rows:
        product_id = str(uuid.uuid4())[:8]
        record = ProductRecord(
            product_id=product_id,
            batch_id=batch_id,
            mpn=row.get("Mfg_Part_Num", ""),
            raw_input=row,
            processing_status="pending"
        )
        db.add(record)
    
    db.commit()
    return {"batch_id": batch_id, "total_products": len(rows), "status": "uploaded", "filename": file.filename}
```

### File: `backend/api/products.py`
```python
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import ProductRecord
from typing import Optional

router = APIRouter()

@router.get("/products")
def list_products(
    status: Optional[str] = None,
    confidence: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    batch_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ProductRecord)
    if status: query = query.filter(ProductRecord.processing_status == status)
    if confidence: query = query.filter(ProductRecord.confidence_level == confidence)
    if category: query = query.filter(ProductRecord.classpath.contains(category))
    if batch_id: query = query.filter(ProductRecord.batch_id == batch_id)
    if search: query = query.filter(
        (ProductRecord.mpn.contains(search)) | (ProductRecord.raw_input.contains(search))
    )
    
    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "products": [
            {
                "product_id": p.product_id,
                "mpn": p.mpn,
                "batch_id": p.batch_id,
                "raw_input": p.raw_input,
                "enriched_data": p.enriched_data,
                "manufacturer": p.manufacturer,
                "brand": p.brand,
                "classpath": p.classpath,
                "overall_confidence": p.overall_confidence,
                "confidence_level": p.confidence_level,
                "needs_human_review": p.needs_human_review,
                "processing_status": p.processing_status,
            }
            for p in products
        ]
    }

@router.get("/products/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(ProductRecord).count()
    pending = db.query(ProductRecord).filter_by(processing_status="pending").count()
    completed = db.query(ProductRecord).filter_by(processing_status="completed").count()
    review = db.query(ProductRecord).filter_by(needs_human_review=True, processing_status="completed").count()
    error = db.query(ProductRecord).filter_by(processing_status="error").count()
    
    conf_dist = {}
    for level in ["high", "medium", "low", "very_low"]:
        conf_dist[level] = db.query(ProductRecord).filter_by(confidence_level=level).count()
    
    avg_conf = db.query(func.avg(ProductRecord.overall_confidence)).filter(
        ProductRecord.processing_status == "completed"
    ).scalar() or 0
    
    return {
        "total": total, "pending": pending, "completed": completed,
        "needs_review": review, "errors": error,
        "confidence_distribution": conf_dist,
        "average_confidence": round(float(avg_conf), 3)
    }

@router.get("/products/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(ProductRecord).filter_by(product_id=product_id).first()
    if not p: raise HTTPException(404, "Product not found")
    return {
        "product_id": p.product_id, "mpn": p.mpn, "batch_id": p.batch_id,
        "raw_input": p.raw_input, "enriched_data": p.enriched_data,
        "manufacturer": p.manufacturer, "brand": p.brand,
        "classpath": p.classpath, "overall_confidence": p.overall_confidence,
        "confidence_level": p.confidence_level, "needs_human_review": p.needs_human_review,
        "processing_status": p.processing_status
    }

@router.patch("/products/{product_id}")
def update_product(product_id: str, updates: dict, db: Session = Depends(get_db)):
    p = db.query(ProductRecord).filter_by(product_id=product_id).first()
    if not p: raise HTTPException(404, "Product not found")
    if p.enriched_data and isinstance(updates, dict):
        enriched = p.enriched_data.copy() if p.enriched_data else {}
        for key, value in updates.items():
            enriched[key] = value
        p.enriched_data = enriched
    if "needs_human_review" in updates:
        p.needs_human_review = updates["needs_human_review"]
    db.commit()
    return {"status": "updated", "product_id": product_id}
```

### File: `backend/api/process.py`
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ProductRecord, UploadBatch
from shared.schemas.product import RawProduct

router = APIRouter()

def _get_engine():
    from document_processing.reference_data import ReferenceDataService
    from ai_engine.engine import AIEngine
    ref = ReferenceDataService.get_instance()
    return AIEngine(ref)

@router.post("/process/{product_id}")
def process_single(product_id: str, db: Session = Depends(get_db)):
    record = db.query(ProductRecord).filter_by(product_id=product_id).first()
    if not record: raise HTTPException(404, "Product not found")
    
    engine = _get_engine()
    raw_data = record.raw_input
    raw = RawProduct(
        mfg_part_num=raw_data.get("Mfg_Part_Num", ""),
        part_desc=raw_data.get("Part_Desc", ""),
        e1_brand=raw_data.get("E1_Brand"),
        unilog_brand=raw_data.get("Unilog_Brand"),
        dib_brand=raw_data.get("DIB_Brand"),
        part_manuf=raw_data.get("Part_Manuf"),
    )
    
    result = engine.process_product(raw)
    enriched = result.model_dump()
    
    record.enriched_data = enriched
    record.processing_status = result.processing_status
    record.overall_confidence = result.overall_confidence
    record.confidence_level = result.confidence_level.value
    record.needs_human_review = result.needs_human_review
    record.manufacturer = result.identity.manufacturer_resolved
    record.brand = result.identity.brand_resolved
    record.classpath = result.classification.classpath
    db.commit()
    
    return enriched

def _process_batch_task(batch_id: str):
    from .database import SessionLocal
    db = SessionLocal()
    try:
        engine = _get_engine()
        records = db.query(ProductRecord).filter_by(batch_id=batch_id, processing_status="pending").all()
        batch = db.query(UploadBatch).filter_by(batch_id=batch_id).first()
        if batch: batch.status = "processing"
        db.commit()
        
        for record in records:
            raw_data = record.raw_input
            raw = RawProduct(
                mfg_part_num=raw_data.get("Mfg_Part_Num", ""),
                part_desc=raw_data.get("Part_Desc", ""),
                e1_brand=raw_data.get("E1_Brand"),
                unilog_brand=raw_data.get("Unilog_Brand"),
                dib_brand=raw_data.get("DIB_Brand"),
                part_manuf=raw_data.get("Part_Manuf"),
            )
            result = engine.process_product(raw)
            enriched = result.model_dump()
            record.enriched_data = enriched
            record.processing_status = result.processing_status
            record.overall_confidence = result.overall_confidence
            record.confidence_level = result.confidence_level.value
            record.needs_human_review = result.needs_human_review
            record.manufacturer = result.identity.manufacturer_resolved
            record.brand = result.identity.brand_resolved
            record.classpath = result.classification.classpath
            if batch: batch.processed_rows = (batch.processed_rows or 0) + 1
            db.commit()
        
        if batch: batch.status = "completed"
        db.commit()
    finally:
        db.close()

@router.post("/process/batch/{batch_id}")
def process_batch(batch_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    batch = db.query(UploadBatch).filter_by(batch_id=batch_id).first()
    if not batch: raise HTTPException(404, "Batch not found")
    pending = db.query(ProductRecord).filter_by(batch_id=batch_id, processing_status="pending").count()
    background_tasks.add_task(_process_batch_task, batch_id)
    return {"batch_id": batch_id, "pending_products": pending, "status": "processing_started"}

@router.get("/process/status/{batch_id}")
def batch_status(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(UploadBatch).filter_by(batch_id=batch_id).first()
    if not batch: raise HTTPException(404, "Batch not found")
    return {
        "batch_id": batch_id, "status": batch.status,
        "total_rows": batch.total_rows,
        "processed_rows": batch.processed_rows or 0,
        "progress": round((batch.processed_rows or 0) / max(batch.total_rows, 1) * 100, 1)
    }
```

### File: `backend/api/export.py`
```python
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv, io
from ..database import get_db
from ..models import ProductRecord
from ..services.export_engine import ExportEngine

router = APIRouter()

@router.get("/export")
def export_products(
    batch_id: str = None,
    status: str = "completed",
    format: str = Query("csv", enum=["csv"]),
    db: Session = Depends(get_db)
):
    query = db.query(ProductRecord).filter_by(processing_status=status)
    if batch_id:
        query = query.filter_by(batch_id=batch_id)
    records = query.all()
    
    export_engine = ExportEngine()
    rows = []
    for record in records:
        if record.enriched_data:
            row = export_engine.export_product(record.enriched_data)
            # Add raw input fields
            raw = record.raw_input or {}
            row["Mfg_Part_Num"] = raw.get("Mfg_Part_Num", "")
            row["Part_Desc"] = raw.get("Part_Desc", "")
            row["E1_Brand"] = raw.get("E1_Brand", "")
            row["Unilog_Brand"] = raw.get("Unilog_Brand", "")
            row["DIB_Brand"] = raw.get("DIB_Brand", "")
            row["Part_Manuf"] = raw.get("Part_Manuf", "")
            rows.append(row)
    
    if not rows:
        return {"error": "No products to export"}
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=ExportEngine.COLUMN_ORDER)
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=delivery_format_{batch_id or 'all'}.csv"}
    )
```

### File: `backend/services/export_engine.py`
```python
class ExportEngine:
    COLUMN_ORDER = [
        "MFR URL", "Ref URL 1", "Ref URL 2", "Ref URL 3", "Ref URL 4", "Ref URL 5",
        "PART_NUMBER", "Dept", "Class", "Fine", "SKU - MY_PART_NUMBER",
        "Mfg_Part_Num", "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf",
        "MANUFACTURER_NAME", "BRAND_NAME", "TRADE_NAME", "MANUFACTURER_PART_NUMBER", "ALTERNATE_PART_NUMBER",
        "Classpath", "MOBILE_DESC", "INVOICE_DESC", "SHORT_DESC", "LONG_DESC1", "RETAIL_DESC", "MARKETING_DESCRIPTION",
    ] + [f"ITEM_FEATURES_{i}" for i in range(1, 21)] + [
        "With", "Standard/Approvals", "Prop 65", "Application", "Includes", "Product Name",
    ] + [col for i in range(1, 51) for col in [f"ATTRIBUTE_LABEL {i}", f"ATTRIBUTE_VALUE {i}", f"ATTRIBUTE_UOM {i}"]
    ] + [
        "UPC", "EAN", "GTIN", "UNSPSC", "Warranty", "List Price", "Selling Qty", "Selling UOM",
        "Standard Packaging Information", "LENGTH", "LENGTH_UOM", "HEIGHT", "HEIGHT_UOM",
        "WIDTH", "WIDTH_UOM", "WEIGHT", "WEIGHT_UOM", "VOLUME", "VOLUME_UOM",
        "Product Image", "Alternate Image 1", "Alternate Image 2", "Alternate Image 3", "Alternate Image 4",
        "SDS", "SDS_1", "Warranty Information", "Catalog", "Specification Sheet",
        "Instruction/Installation Manual", "Service Manual", "Owners/User Manual",
        "Line Drawing", "MTR", "RoHS", "Full Engineering Drawing", "Energy Star Guide",
        "Technical Bulletin", "Submittal", "Compatibility Chart", "Size Chart",
        "Product Label/Insert", "Video Link", "Video Link 1",
        "Country Of Origin", "Discontinued", "Actual Image (Yes/No)"
    ]

    def export_product(self, enriched: dict) -> dict:
        row = {col: "" for col in self.COLUMN_ORDER}
        identity = enriched.get("identity", {})
        classification = enriched.get("classification", {})
        content = enriched.get("content", {})
        attributes = enriched.get("attributes", [])

        row["MANUFACTURER_NAME"] = identity.get("manufacturer_resolved", "")
        row["BRAND_NAME"] = identity.get("brand_resolved", "")
        row["TRADE_NAME"] = identity.get("trade_name", "")
        row["MANUFACTURER_PART_NUMBER"] = identity.get("mpn", "")
        row["Dept"] = classification.get("department", "")
        row["Class"] = classification.get("product_class", "")
        row["Fine"] = classification.get("fine_category", "")
        row["Classpath"] = classification.get("classpath", "")
        row["INVOICE_DESC"] = content.get("invoice_description", "")
        row["MOBILE_DESC"] = content.get("mobile_description", "")
        row["SHORT_DESC"] = content.get("product_title", "")
        row["LONG_DESC1"] = content.get("long_description", "")
        row["RETAIL_DESC"] = content.get("retail_description", "")
        row["With"] = content.get("with_text", "")
        row["Standard/Approvals"] = content.get("standards_approvals", "")
        row["Product Name"] = content.get("product_name", "")
        row["UNSPSC"] = classification.get("unspsc", "")

        features = content.get("features", [])
        for i, feat in enumerate(features[:20], 1):
            row[f"ITEM_FEATURES_{i}"] = feat

        for i, attr in enumerate(attributes[:50], 1):
            row[f"ATTRIBUTE_LABEL {i}"] = attr.get("name", "")
            row[f"ATTRIBUTE_VALUE {i}"] = attr.get("normalized_value", "") or attr.get("raw_value", "")
            row[f"ATTRIBUTE_UOM {i}"] = attr.get("uom", "")

        return row
```

---

## 5. API CONTRACT (for Frontend)

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/api/health` | — | `{"status": "ok"}` |
| POST | `/api/upload` | `multipart/form-data` with `file` | `{"batch_id": "abc", "total_products": 100}` |
| GET | `/api/products` | `?status=&confidence=&search=&page=&page_size=` | `{"total": 100, "products": [...]}` |
| GET | `/api/products/stats` | — | `{"total": 100, "pending": 50, "completed": 40, ...}` |
| GET | `/api/products/{id}` | — | Full product record |
| PATCH | `/api/products/{id}` | JSON body with updates | `{"status": "updated"}` |
| POST | `/api/process/{id}` | — | Full enriched product |
| POST | `/api/process/batch/{batch_id}` | — | `{"status": "processing_started"}` |
| GET | `/api/process/status/{batch_id}` | — | `{"progress": 45.0, "processed_rows": 45}` |
| GET | `/api/export` | `?batch_id=&status=&format=csv` | CSV file download |

---

## 6. INTEGRATION CONTRACTS

### Backend calls AI Engine:
```python
from ai_engine.engine import AIEngine
from document_processing.reference_data import ReferenceDataService
from shared.schemas.product import RawProduct

ref = ReferenceDataService.get_instance()
engine = AIEngine(ref)
result = engine.process_product(RawProduct(mfg_part_num="...", part_desc="...", ...))
```

### Backend imports shared schema:
```python
from shared.schemas.product import RawProduct, ProductIntelligence
```

---

## 7. BUILD ORDER

| Step | Files | Test |
|------|-------|------|
| 1 | `database.py`, `models.py`, `main.py` | `curl http://localhost:8000/api/health` |
| 2 | `api/upload.py` | Upload a CSV, check DB |
| 3 | `api/products.py` | List, get, stats endpoints |
| 4 | `api/process.py` | Process single product |
| 5 | `services/export_engine.py`, `api/export.py` | Download CSV |
| 6 | Batch processing, progress tracking | Process 50+ products |

**END OF BACKEND PLAN**
