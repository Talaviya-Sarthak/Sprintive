from fastapi import APIRouter, WebSocket
from app.websocket.stt_handler import stt_websocket_handler

router = APIRouter(tags=["stt"])


@router.websocket("/ws/stt/{meeting_id}")
async def stt_endpoint(websocket: WebSocket, meeting_id: str):
    await stt_websocket_handler(websocket, meeting_id)
