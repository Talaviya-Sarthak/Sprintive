"""Database integration for Sprintive Transcript Processing Service.

Provides deterministic persistence to PostgreSQL (Neon DB) for:
1. Fetching meeting context, team members, and participants.
2. Persisting real AI summaries, action items, and resolved Scrum/Kanban tickets to meeting_summaries.
"""

import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

try:
    import psycopg
except ImportError:
    psycopg = None  # type: ignore

logger = logging.getLogger(__name__)


def is_valid_uuid(val: Any) -> bool:
    """Check if value is a valid UUID string."""
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False

# Default Neon DB connection string from Sprintive environment
DEFAULT_DATABASE_URL = (
    "postgresql://neondb_owner:npg_U5uInODCBk2z"
    "@ep-restless-tree-ayyl494y-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
)


def get_database_url() -> str:
    """Retrieve canonical DATABASE_URL from environment or fallback."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        # Check parent/backend env if available
        backend_env = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "backend",
            ".env",
        )
        if os.path.exists(backend_env):
            try:
                with open(backend_env, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip().startswith("DATABASE_URL="):
                            url = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                            break
            except Exception:
                pass
    return url or DEFAULT_DATABASE_URL


def get_db_connection():
    """Create a psycopg connection to PostgreSQL."""
    if psycopg is None:
        raise RuntimeError("psycopg is not installed. Please install 'psycopg[binary]'.")
    db_url = get_database_url()
    return psycopg.connect(db_url)


def get_meeting_context(meeting_id: str) -> Dict[str, Any]:
    """
    Fetch meeting metadata, team members, and participants for a given meeting ID.
    Used by Stage 3 TaskResolutionService to map assignees deterministically.
    """
    result: Dict[str, Any] = {
        "meeting_id": meeting_id,
        "team_id": None,
        "title": None,
        "duration_minutes": 0,
        "scheduled_start": None,
        "started_at": None,
        "team_members": [],
        "participants": [],
    }

    if not is_valid_uuid(meeting_id):
        logger.debug("Non-UUID meeting_id %s, returning offline context", meeting_id)
        return result

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Fetch meeting info
                cur.execute(
                    """
                    SELECT id, team_id, title, duration_minutes, scheduled_start, started_at
                    FROM meetings
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (meeting_id,),
                )
                m_row = cur.fetchone()
                if m_row:
                    result["meeting_id"] = str(m_row[0])
                    result["team_id"] = str(m_row[1]) if m_row[1] else None
                    result["title"] = m_row[2]
                    result["duration_minutes"] = m_row[3] or 0
                    result["scheduled_start"] = m_row[4]
                    result["started_at"] = m_row[5]

                team_id = result["team_id"]
                if team_id:
                    # 2. Fetch team members
                    cur.execute(
                        """
                        SELECT tm.user_id, u.full_name, u.avatar_url, tm.role
                        FROM team_members tm
                        JOIN users u ON u.id = tm.user_id
                        WHERE tm.team_id = %s
                        """,
                        (team_id,),
                    )
                    members = []
                    for row in cur.fetchall():
                        members.append({
                            "user_id": str(row[0]),
                            "name": row[1],
                            "full_name": row[1],
                            "avatar_url": row[2],
                            "role": row[3],
                        })
                    result["team_members"] = members

                # 3. Fetch meeting participants
                cur.execute(
                    """
                    SELECT mp.user_id, u.full_name
                    FROM meeting_participants mp
                    JOIN users u ON u.id = mp.user_id
                    WHERE mp.meeting_id = %s
                    """,
                    (meeting_id,),
                )
                participants = []
                for row in cur.fetchall():
                    participants.append({
                        "user_id": str(row[0]),
                        "name": row[1],
                        "full_name": row[1],
                    })
                result["participants"] = participants

                # 4. Fetch existing tasks from meeting_summaries for idempotent reconciliation
                cur.execute(
                    """
                    SELECT tickets_generated
                    FROM meeting_summaries
                    WHERE meeting_id = %s
                    LIMIT 1
                    """,
                    (meeting_id,),
                )
                s_row = cur.fetchone()
                if s_row and s_row[0]:
                    raw_tickets = s_row[0]
                    if isinstance(raw_tickets, str):
                        try:
                            result["existing_tasks"] = json.loads(raw_tickets)
                        except Exception:
                            result["existing_tasks"] = []
                    elif isinstance(raw_tickets, list):
                        result["existing_tasks"] = raw_tickets

    except Exception as exc:
        logger.warning(
            "Could not fetch database context for meeting %s: %s (falling back to offline defaults)",
            meeting_id,
            exc,
        )

    return result


def persist_meeting_summary_to_db(
    meeting_id: str,
    ai_summary: str,
    action_items: List[Any],
    tickets_generated: List[Any],
    duration_minutes: int = 0,
    attendance_count: int = 0,
) -> bool:
    """
    Persist generated AI summary, action items, and Kanban tasks to meeting_summaries table.
    Ensures idempotency and updates records atomically.
    """
    if not is_valid_uuid(meeting_id):
        logger.info(
            "Non-UUID meeting_id '%s'; skipping database persistence for test/mock run",
            meeting_id,
        )
        return True

    try:
        # Convert any Pydantic models or objects to plain JSON-serializable dictionaries
        serialized_actions = []
        for a in action_items:
            if hasattr(a, "model_dump"):
                serialized_actions.append(a.model_dump())
            elif isinstance(a, dict):
                serialized_actions.append(a)
            else:
                serialized_actions.append(str(a))

        serialized_tickets = []
        for t in tickets_generated:
            if hasattr(t, "model_dump"):
                td = t.model_dump()
            elif isinstance(t, dict):
                td = dict(t)
            else:
                continue

            # Ensure compatible field naming across Kanban and backend
            t_id = td.get("id") or td.get("ticket_id")
            td["id"] = t_id
            td["ticket_id"] = t_id
            if "resolved_due_date" in td and td["resolved_due_date"]:
                td["dueDate"] = td["resolved_due_date"]
                td["due_date"] = td["resolved_due_date"]
            elif "due_date" in td and td["due_date"]:
                td["dueDate"] = td["due_date"]

            if td.get("assignee_id"):
                assignee_val = td.get("assignee")
                if isinstance(assignee_val, dict):
                    assignee_name = assignee_val.get("name") or assignee_val.get("full_name") or ""
                else:
                    assignee_name = str(assignee_val or "")
                td["assignee"] = {
                    "id": str(td["assignee_id"]),
                    "name": assignee_name,
                }

            td["source"] = "ai"
            serialized_tickets.append(td)

        # Deterministic Duplicate Prevention: Guarantee unique tickets per meeting
        seen_ticket_keys = set()
        unique_tickets = []
        for td in serialized_tickets:
            t_id = td.get("id") or td.get("ticket_id")
            title_key = (td.get("title") or "").strip().lower()
            action_key = (td.get("source_action_item") or "").strip().lower()
            dedup_key = f"{t_id}:{title_key}:{action_key}"
            if dedup_key in seen_ticket_keys:
                continue
            seen_ticket_keys.add(dedup_key)
            unique_tickets.append(td)
        serialized_tickets = unique_tickets

        actions_json = json.dumps(serialized_actions)
        tickets_json = json.dumps(serialized_tickets)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO meeting_summaries (
                        meeting_id,
                        duration_minutes,
                        attendance_count,
                        total_participants,
                        ai_summary,
                        action_items,
                        tickets_generated
                    )
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                    ON CONFLICT (meeting_id) DO UPDATE SET
                        duration_minutes = CASE 
                            WHEN EXCLUDED.duration_minutes > 0 THEN EXCLUDED.duration_minutes 
                            ELSE meeting_summaries.duration_minutes 
                        END,
                        attendance_count = CASE 
                            WHEN EXCLUDED.attendance_count > 0 THEN EXCLUDED.attendance_count 
                            ELSE meeting_summaries.attendance_count 
                        END,
                        total_participants = CASE 
                            WHEN EXCLUDED.total_participants > 0 THEN EXCLUDED.total_participants 
                            ELSE meeting_summaries.total_participants 
                        END,
                        ai_summary = EXCLUDED.ai_summary,
                        action_items = EXCLUDED.action_items,
                        tickets_generated = EXCLUDED.tickets_generated
                    RETURNING id;
                    """,
                    (
                        meeting_id,
                        duration_minutes,
                        attendance_count,
                        attendance_count,
                        ai_summary,
                        actions_json,
                        tickets_json,
                    ),
                )
                conn.commit()
                logger.info(
                    "Successfully persisted meeting summary & %d Kanban tasks for meeting %s to database",
                    len(serialized_tickets),
                    meeting_id,
                )
                return True

    except Exception as exc:
        logger.exception(
            "Failed to persist meeting summary to database for meeting %s: %s",
            meeting_id,
            exc,
        )
        return False
