import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.speech import router as speech_router
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Speech recognition service (Groq Whisper) for Sprintive.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(speech_router)


@app.get("/health", tags=["health"])
async def root_health() -> dict:
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


if __name__ == "__main__":
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
