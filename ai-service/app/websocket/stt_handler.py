"""
WebSocket endpoint: /ws/stt/{meeting_id}

Message protocol (binary + JSON mixed):
  - Client sends binary frames: raw PCM audio (int16, mono, 16kHz)
  - Client sends JSON text frames:
      { "type": "start",  "speaker": "<name>" }
      { "type": "end" }
  - Server sends JSON text frames:
      { "type": "chunk",  "speaker": "<name>", "text": "...", "timestamp": 1.23 }
      { "type": "final",  "meeting_id": "...", "duration": 42 }
      { "type": "error",  "message": "..." }
"""

import json
import time
from fastapi import WebSocket, WebSocketDisconnect
from app.stt.whisper_engine import whisper_stt
from app.services.session_manager import session_manager
from app.services.transcript_service import transcript_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Minimum audio bytes before we attempt transcription (~0.5 s at 16kHz int16)
MIN_BYTES = 16000


async def stt_websocket_handler(websocket: WebSocket, meeting_id: str) -> None:
    await websocket.accept()
    logger.info(f"STT session opened: meeting={meeting_id}")

    speaker: str = "Unknown"
    session_manager.start_session(meeting_id)

    try:
        while True:
            message = await websocket.receive()

            # ── JSON control frame ────────────────────────────────────────────
            if "text" in message:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type")

                if msg_type == "start":
                    speaker = data.get("speaker", "Unknown")
                    logger.info(f"Speaker set: {speaker} (meeting={meeting_id})")

                elif msg_type == "end":
                    # Flush remaining audio for this speaker
                    remaining = session_manager.flush_audio(meeting_id, speaker)
                    if len(remaining) >= MIN_BYTES:
                        text = whisper_stt.transcribe_chunk(remaining)
                        if text:
                            session_manager.add_transcript_line(meeting_id, speaker, text)
                            await websocket.send_text(json.dumps({
                                "type": "chunk",
                                "speaker": speaker,
                                "text": text,
                                "timestamp": time.time(),
                            }))

                    # Build and save final transcript
                    lines    = session_manager.get_transcript_lines(meeting_id)
                    duration = session_manager.get_duration(meeting_id)
                    content  = transcript_service.build_content(meeting_id, lines)
                    path, size = transcript_service.save(meeting_id, content)

                    await transcript_service.notify_backend(
                        meeting_id=meeting_id,
                        transcript_path=str(path),
                        transcript_name=path.name,
                        transcript_size=size,
                        duration=duration,
                    )

                    await websocket.send_text(json.dumps({
                        "type": "final",
                        "meeting_id": meeting_id,
                        "duration": duration,
                    }))

                    session_manager.end_session(meeting_id)
                    logger.info(f"STT session ended: meeting={meeting_id}")
                    break

            # ── Binary audio frame ────────────────────────────────────────────
            elif "bytes" in message:
                chunk: bytes = message["bytes"]
                session_manager.append_audio(meeting_id, speaker, chunk)

                # Transcribe when buffer is large enough
                buffered = session_manager.get_or_create_buffer(meeting_id, speaker).audio_buffer
                if len(buffered) >= MIN_BYTES:
                    audio = session_manager.flush_audio(meeting_id, speaker)
                    text  = whisper_stt.transcribe_chunk(audio)
                    if text:
                        session_manager.add_transcript_line(meeting_id, speaker, text)
                        await websocket.send_text(json.dumps({
                            "type": "chunk",
                            "speaker": speaker,
                            "text": text,
                            "timestamp": time.time(),
                        }))

    except WebSocketDisconnect:
        logger.info(f"STT client disconnected: meeting={meeting_id}, speaker={speaker}")
    except Exception as exc:
        logger.error(f"STT error: {exc}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(exc)}))
        except Exception:
            pass
    finally:
        await websocket.close()
