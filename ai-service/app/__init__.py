from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.api.health import router as health_router
from app.api.stt import router as stt_router
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Whisper model is loaded as a module-level singleton in whisper_engine.py
    # Import here to trigger loading at startup
    from app.stt.whisper_engine import whisper_stt  # noqa: F401
    logger.info(f"{settings.app_name} v{settings.app_version} started")
    yield
    logger.info("AI service shutting down")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(stt_router)
