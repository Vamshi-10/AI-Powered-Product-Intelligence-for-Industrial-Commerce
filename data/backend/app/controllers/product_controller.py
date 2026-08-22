from fastapi import APIRouter
from app.schemas.product import Product
from app.services.product_service import product_service

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


@router.get("/{product_id}")
def get_product(product_id: int):
    return product_service.get_product_by_id(product_id)


@router.put("/{product_id}")
def update_product(product_id: int, product: Product):
    return product_service.update_product(product_id, product)


@router.delete("/{product_id}")
def delete_product(product_id: int):
    return product_service.delete_product(product_id)
