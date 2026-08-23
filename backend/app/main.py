from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.product_controller import router as product_router
from app.controllers.document_controller import router as document_router, api_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.search_controller import router as search_router

app = FastAPI(title="AI Product Intelligence API")

# Add CORS middleware for the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(document_router)
app.include_router(api_router)
app.include_router(product_router)
app.include_router(search_router)


@app.get("/")
def root():
    return {"message": "AI Product Intelligence API is running"}