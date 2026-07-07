import logging
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin/command-center", tags=["Command Center Security"])

security_jwt = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


def _admin_token() -> str:
    return os.getenv("COMMAND_CENTER_ADMIN_TOKEN", "").strip()


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security_jwt)):
    expected_token = _admin_token()
    if not expected_token:
        logger.error("Command center admin token is not configured.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    if not credentials or not secrets.compare_digest(credentials.credentials, expected_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return credentials


class OverrideRequest(BaseModel):
    feature_flag: str
    override_value: bool


@router.get("/telemetry")
def get_telemetry(credentials: HTTPAuthorizationCredentials = Depends(verify_admin)):
    try:
        # Placeholder for actual telemetry collection
        return {"status": "ok", "active_alerts": 0}
    except Exception:
        logger.exception("Telemetry collection failed.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/override")
def manual_override(request: OverrideRequest, credentials: HTTPAuthorizationCredentials = Depends(verify_admin)):
    try:
        # Placeholder for actual override logic
        feature_flag = request.feature_flag.strip()
        if not feature_flag:
            raise ValueError("Feature flag cannot be empty")

        return {"message": f"Override applied for {feature_flag}", "status": "success"}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        logger.exception("Manual override failed.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
