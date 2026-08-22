from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.schemas.document import UrlInput, TextInput, UploadJobResponse, JobStatusResponse
from app.schemas.product import Product
from app.services.document_service import document_service

router = APIRouter(prefix="/products", tags=["documents"])
api_router = APIRouter(prefix="/api", tags=["api_uploads"])


# ------------------------------------------------------------------
# 1. FILE UPLOAD ENDPOINT (Preserving existing /products/upload)
# ------------------------------------------------------------------
@router.post("/upload")
async def upload_products_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file filename provided.")

    file_bytes = await file.read()
    result = document_service.parse_and_import_file(file_bytes, file.filename)

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    # Create job tracking entry for job compatibility
    job = document_service.create_job(sources_count=1, sources=[result])
    result["jobId"] = job["jobId"]
    result["status"] = job["status"]

    return result


# ------------------------------------------------------------------
# 2. PRODUCT URL INPUT ENDPOINT
# ------------------------------------------------------------------
@router.post("/url")
@api_router.post("/url")
def upload_product_url(payload: UrlInput):
    result = document_service.process_url(payload.url)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    job = document_service.create_job(sources_count=1, sources=[result])
    return {**result, "jobId": job["jobId"], "status": job["status"]}


# ------------------------------------------------------------------
# 3. PASTED PRODUCT TEXT ENDPOINT
# ------------------------------------------------------------------
@router.post("/text")
@api_router.post("/text")
def upload_product_text(payload: TextInput):
    result = document_service.process_pasted_text(payload.text)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    job = document_service.create_job(sources_count=1, sources=[result])
    return {**result, "jobId": job["jobId"], "status": job["status"]}


# ------------------------------------------------------------------
# 4. MANUAL PRODUCT FIELDS ENTRY ENDPOINT
# ------------------------------------------------------------------
@router.post("/manual")
@api_router.post("/manual")
def upload_manual_product(payload: Product):
    result = document_service.process_manual_product(payload)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    job = document_service.create_job(sources_count=1, sources=[result])
    return {**result, "jobId": job["jobId"], "status": job["status"]}


# ------------------------------------------------------------------
# 5. UNIFIED UPLOAD ROUTE (/api/uploads)
# ------------------------------------------------------------------
@api_router.post("/uploads", response_model=UploadJobResponse)
async def unified_upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file filename provided.")

    file_bytes = await file.read()
    result = document_service.parse_and_import_file(file_bytes, file.filename)

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    job = document_service.create_job(sources_count=1, sources=[result])
    return UploadJobResponse(
        jobId=job["jobId"],
        status=job["status"],
        sourcesReceived=job["sourcesReceived"]
    )


# ------------------------------------------------------------------
# 6. JOB STATUS TRACKING ROUTE (/api/jobs/{job_id})
# ------------------------------------------------------------------
@api_router.get("/jobs/{job_id}", response_model=JobStatusResponse)
@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    result = document_service.get_job_status(job_id)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])

    return JobStatusResponse(**result)
