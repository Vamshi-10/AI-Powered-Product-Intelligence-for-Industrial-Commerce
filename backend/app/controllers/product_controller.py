from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List
from app.schemas.product import Product
from app.services.product_service import product_service
from shared.schemas.product import RawProduct
import uuid
import asyncio
import json

router = APIRouter(prefix="/products", tags=["products"])


@router.post("")
@router.post("/")
def create_product(product: Product):
    return product_service.create_product(product)


@router.get("")
@router.get("/")
def get_products():
    return product_service.get_all_products()


@router.post("/analyze")
def analyze_product(product: Product):
    return product_service.analyze_product(product)


@router.post("/enrich")
def enrich_product(raw: RawProduct):
    """
    Live API endpoint: Takes a messy RawProduct (e.g. just a part_desc),
    runs the full AI intelligence pipeline, saves to Supabase, and returns 
    the 252-column structured result.
    """
    return product_service.enrich_product(raw)


@router.post("/batch")
async def process_batch(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Background batch processor. Accepts a CSV file of products, generates a batch_id,
    and returns immediately while the products process in the background.
    """
    batch_id = str(uuid.uuid4())[:8]
    content = await file.read()
    background_tasks.add_task(product_service.process_batch_csv, content, batch_id)
    return {"batch_id": batch_id, "message": "Batch processing started."}


@router.post("/batch/multimodal")
async def process_multimodal_batch(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    """
    Background batch processor for PDFs, Images, and other files.
    """
    batch_id = str(uuid.uuid4())[:8]
    
    # Read all files into memory so we can close the HTTP connection
    files_data = []
    for f in files:
        content = await f.read()
        files_data.append({"filename": f.filename, "content": content})
        
    background_tasks.add_task(product_service.process_multimodal_batch, files_data, batch_id)
    return {"batch_id": batch_id, "message": "Multi-modal batch processing started."}


@router.get("/batch/{batch_id}")
def get_batch_status(batch_id: str):
    """
    Returns the live progress of a batch upload (Legacy Polling).
    """
    return product_service.get_batch_status(batch_id)


@router.get("/batch/{batch_id}/stream")
async def stream_batch_status(batch_id: str):
    """
    Server-Sent Events (SSE) endpoint to stream live progress.
    """
    async def event_generator():
        while True:
            status = product_service.get_batch_status(batch_id)
            yield f"data: {json.dumps(status)}\n\n"
            if status.get("status") in ["completed", "failed", "not_found"]:
                break
            await asyncio.sleep(1)  # Push update every second
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")



@router.get("/{product_id}")
def get_product(product_id: int):
    return product_service.get_product_by_id(product_id)


@router.put("/{product_id}")
def update_product(product_id: int, product: Product):
    return product_service.update_product(product_id, product)


@router.delete("/{product_id}")
def delete_product(product_id: int):
    return product_service.delete_product(product_id)
