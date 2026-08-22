from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.auth import UserSignUp, UserLogin, AuthResponse
from app.services.auth_service import auth_service
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def sign_up(payload: UserSignUp):
    result = auth_service.sign_up(payload.email, payload.password)
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    return result


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin):
    result = auth_service.sign_in(payload.email, payload.password)
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"]
        )
    return result


@router.get("/me")
def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "status": "authenticated",
        "user": current_user
    }
