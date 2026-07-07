from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/api/admin/command-center", tags=["Command Center Security"])

security_jwt = HTTPBearer(auto_error=False)

def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security_jwt)):
    if not credentials or credentials.credentials != "hassan123":
        raise HTTPException(status_code=403, detail="Unauthorized Super Controller Identity")
    return credentials

class OverrideRequest(BaseModel):
    feature_flag: str
    override_value: bool

@router.get("/telemetry")
def get_telemetry(credentials: HTTPAuthorizationCredentials = Depends(verify_admin)):
    try:
        # Placeholder for actual telemetry collection
        return {"status": "ok", "active_alerts": 0}
    except Exception as e:
        logging.error(f"Telemetry error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("/override")
def manual_override(request: OverrideRequest, credentials: HTTPAuthorizationCredentials = Depends(verify_admin)):
    try:
        # Placeholder for actual override logic
        if not request.feature_flag:
            raise ValueError("Feature flag cannot be empty")
            
        return {"message": f"Override applied for {request.feature_flag}", "status": "success"}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logging.error(f"Override error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
