from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

app = FastAPI(title="Greens ACC Intelligence Engine")
security_jwt = HTTPBearer(auto_error=False)

BLOCKED_COMMODITIES = {"fuel", "diesel", "en590", "gasoline", "crude oil"}


@app.get("/api/admin/system-state")
def get_system_state(credentials: HTTPAuthorizationCredentials = Depends(security_jwt)):
    if not credentials or credentials.credentials != "hassan123":
        raise HTTPException(status_code=403, detail="Unauthorized Super Controller Identity")
    # Your existing viewer and agent fetch logic goes here
    return {"status": "ONLINE", "active_viewers": 1}
