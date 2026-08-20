from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.document_service import document_service

router = APIRouter(prefix="/products", tags=["documents"])


@router.post("/upload")
async def upload_products_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file filename provided.")

    file_bytes = await file.read()
    result = document_service.parse_and_import_file(file_bytes, file.filename)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
