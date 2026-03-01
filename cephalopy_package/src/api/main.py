"""
FastAPI app initialization and configuration correct
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.dependencies import load_model
from api.endpoints import data, eval, health, models, predictions, retraining

# 🔹 Load .env from project root (cephalopy_package/.env)
BASE_DIR = Path(__file__).resolve().parents[2]  # -> cephalopy_package/
# load_dotenv(BASE_DIR / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting Cephalopy API...")
    try:
        load_model()
    except Exception:
        logger.error("Failed to load model during startup", exc_info=True)
        # App will still start, but model_loaded will be False in /health
    yield
    logger.info("Shutting down Cephalopy API...")


app = FastAPI(
    title="Cephalopy Landmark Detection API",
    description=(
        "API for cephalometric landmark detection using DeepFuse "
        "with model retraining capabilities"
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(predictions.router, prefix="/api/v1", tags=["predictions"])
app.include_router(eval.router, prefix="/api/v1", tags=["evaluation"])
app.include_router(retraining.router, prefix="/api/v1", tags=["retraining"])
app.include_router(models.router, prefix="/api/v1", tags=["models"])
app.include_router(data.router, prefix="/api/v1", tags=["data"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
