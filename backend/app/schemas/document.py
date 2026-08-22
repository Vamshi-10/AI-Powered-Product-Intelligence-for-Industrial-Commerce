from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class UrlInput(BaseModel):
    url: str


class TextInput(BaseModel):
    text: str


class UploadJobResponse(BaseModel):
    jobId: str
    status: str
    sourcesReceived: int


class JobStatusResponse(BaseModel):
    jobId: str
    status: str
    progress: int
    currentStage: str
    sourcesReceived: Optional[int] = 1
    overallConfidence: Optional[float] = 1.0
