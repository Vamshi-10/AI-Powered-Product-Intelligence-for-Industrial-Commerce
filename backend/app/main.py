from fastapi import FastAPI
from app.controllers.product_controller import router as product_router
from app.controllers.document_controller import router as document_router, api_router
from app.controllers.auth_controller import router as auth_router

app = FastAPI(title="AI Product Intelligence API")

app.include_router(auth_router)
app.include_router(document_router)
app.include_router(api_router)
app.include_router(product_router)


@app.get("/")
def root():
    return {"message": "AI Product Intelligence API is running"}