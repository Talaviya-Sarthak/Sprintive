import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes.transcript import router as transcript_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown events."""
    logger.info("Starting up %s (env=%s)...", settings.PROJECT_NAME, settings.APP_ENV)
    has_key = bool(settings.LLM_API_KEY and settings.LLM_API_KEY.strip())
    logger.info("LLM API key configured: %s", has_key)
    logger.info(
        "LLM configuration: provider=%s, model=%s, base_url=%s",
        settings.LLM_PROVIDER,
        settings.LLM_MODEL,
        settings.LLM_BASE_URL,
    )
    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Sprintive Transcript Processing Service. "
        "Module 1: Transcript Parsing (Raw Transcript -> Structured Transcript)."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(transcript_router)


@app.get("/health", tags=["system"], summary="Health check")
async def health_check():
    """Health check endpoint to verify service is alive."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
