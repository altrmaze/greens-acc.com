from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"

app = FastAPI(title="Greens ACC")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MarketScanRequest(BaseModel):
    watch_list: list[str] = Field(default_factory=lambda: ["NVDA", "AAPL", "MSFT", "TSLA", "AMD", "AMZN", "META"])


@app.get("/api/health")
def health() -> JSONResponse:
    return JSONResponse({"ok": True})


@app.post("/api/v1/predict-best-stock")
async def predict_best_stock(payload: MarketScanRequest) -> JSONResponse:
    try:
        normalized_watch_list = [ticker.strip().upper() for ticker in payload.watch_list if ticker and ticker.strip()]
        if not normalized_watch_list:
            raise HTTPException(status_code=400, detail="watch_list must include at least one ticker symbol.")

        from stock_prediction_crew import stock_prediction_crew

        final_verdict = stock_prediction_crew.kickoff(inputs={"ticker_list": ", ".join(normalized_watch_list)})
        return JSONResponse({"status": "success", "recommended_stock": str(final_verdict)})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Engine compilation failed: {exc}") from exc


if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="site")
