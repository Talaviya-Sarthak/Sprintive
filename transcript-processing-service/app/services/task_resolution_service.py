"""Stage 3: Deterministic Task Resolution Service.

Performs deterministic, non-LLM processing of ScrumResult work items:
1. Assignee Identity Resolution (meeting participants -> team members waterfall)
2. Calendar Due Date Resolution (relative phrases, explicit dates, timezone-aware)
3. Task Schema Validation & Initial Status assignment ('todo')
4. Idempotent result generation
"""

import logging
import re
import uuid
from datetime import datetime, time as dt_time, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.resolved_task import ResolvedTask, TaskResolutionResult
from app.models.scrum_agent import ScrumResult, ScrumTask

logger = logging.getLogger(__name__)

VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_TYPES = {"task", "bug", "feature", "improvement"}
VALID_STATUSES = {"todo", "backlog", "in_progress", "review", "done"}

WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

MONTHS = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sept": 9, "sep": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}


class TaskValidationError(Exception):
    """Raised when a task payload fails deterministic validation."""
    pass


class TaskResolutionService:
    """Deterministic service resolving assignees, due dates, and validation for Scrum tasks."""

    def __init__(self):
        pass

    def resolve_assignee(
        self,
        raw_assignee: Optional[str],
        participants: Optional[List[Dict[str, Any]]] = None,
        team_members: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Deterministically resolve assignee string to a user ID.

        Candidate scope:
        1. meeting_participants -> users
        2. team_members -> users (fallback)

        Matching rules:
        - Level 1: Exact full-name match (case-insensitive, trimmed)
        - Level 2: First-name match
        - Level 3: Multi-token match

        Ambiguity rule:
        If multiple users match, return (None, None, raw_assignee).

        No match:
        Return (None, None, raw_assignee).

        Returns:
            Tuple of (resolved_full_name, resolved_user_id, raw_assignee)
        """
        if not raw_assignee or not raw_assignee.strip():
            return None, None, None

        cleaned_query = raw_assignee.strip()
        query_lower = cleaned_query.lower()

        # Helper to search candidates in a given pool
        def match_pool(candidates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
            if not candidates:
                return None

            # Filter out inactive candidates if flagged
            active_pool = [
                c for c in candidates
                if c.get("is_active", True) is not False and c.get("left_at") is None
            ]

            # Level 1 — Exact full-name match
            l1_matches = []
            for c in active_pool:
                full_name = (c.get("full_name") or "").strip().lower()
                if full_name == query_lower:
                    l1_matches.append(c)

            if len(l1_matches) == 1:
                return l1_matches[0]
            if len(l1_matches) > 1:
                # Ambiguous exact match
                return "AMBIGUOUS"

            # Level 2 — First-name match
            l2_matches = []
            for c in active_pool:
                full_name = (c.get("full_name") or "").strip()
                first_name = full_name.split()[0].lower() if full_name else ""
                if first_name == query_lower:
                    l2_matches.append(c)

            if len(l2_matches) == 1:
                return l2_matches[0]
            if len(l2_matches) > 1:
                # Ambiguous first-name match
                return "AMBIGUOUS"

            # Level 3 — Multi-token matching
            query_tokens = query_lower.split()
            l3_matches = []
            for c in active_pool:
                full_name = (c.get("full_name") or "").strip().lower()
                c_tokens = full_name.split()
                if len(query_tokens) > 1 and len(c_tokens) >= len(query_tokens):
                    # Check if all query tokens match candidate tokens (or prefixes)
                    match = True
                    for qt, ct in zip(query_tokens, c_tokens):
                        if not ct.startswith(qt):
                            match = False
                            break
                    if match:
                        l3_matches.append(c)

            if len(l3_matches) == 1:
                return l3_matches[0]
            if len(l3_matches) > 1:
                return "AMBIGUOUS"

            return None

        # 1. Search meeting_participants first
        res = match_pool(participants or [])
        if res == "AMBIGUOUS":
            logger.info("Assignee '%s' is ambiguous among meeting participants", cleaned_query)
            return None, None, cleaned_query
        if res is not None:
            user_id = str(res.get("user_id") or res.get("id"))
            full_name = res.get("full_name") or cleaned_query
            return full_name, user_id, cleaned_query

        # 2. Fallback: Search team_members
        res = match_pool(team_members or [])
        if res == "AMBIGUOUS":
            logger.info("Assignee '%s' is ambiguous among team members", cleaned_query)
            return None, None, cleaned_query
        if res is not None:
            user_id = str(res.get("user_id") or res.get("id"))
            full_name = res.get("full_name") or cleaned_query
            return full_name, user_id, cleaned_query

        # 3. No match found
        logger.info("Assignee '%s' could not be resolved in meeting or team pool", cleaned_query)
        return None, None, cleaned_query

    def resolve_due_date(
        self,
        raw_due_date: Optional[str],
        meeting_timestamp: Optional[Union[datetime, str]] = None,
        timezone_str: str = "UTC",
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Deterministically resolve relative or explicit due date string.

        Uses meeting start time and meeting timezone as anchor.

        Ambiguous Date Policy:
        - If phrase is ambiguous (e.g. Meeting date is Friday, Due date is 'by Friday'),
          preserve due_date='by Friday' and resolved_due_date=None.
        - Do not guess or invent arbitrary dates.

        Returns:
            Tuple of (due_date, resolved_due_date_iso)
        """
        if not raw_due_date or not raw_due_date.strip():
            return None, None

        cleaned_text = raw_due_date.strip()
        text_lower = cleaned_text.lower()

        # Normalize timezone
        try:
            tz = ZoneInfo(timezone_str.strip())
        except (ZoneInfoNotFoundError, Exception):
            tz = ZoneInfo("UTC")

        # 1. Check for explicit ISO format: YYYY-MM-DD
        iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?.*$", cleaned_text)
        if iso_match:
            try:
                year, month, day = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
                hour = int(iso_match.group(4)) if iso_match.group(4) else 23
                minute = int(iso_match.group(5)) if iso_match.group(5) else 59
                second = int(iso_match.group(6)) if iso_match.group(6) else 59
                dt = datetime(year, month, day, hour, minute, second, tzinfo=tz)
                return cleaned_text, dt.isoformat()
            except ValueError:
                # Invalid calendar date like 2026-02-30
                logger.warning("Explicit ISO date '%s' is an invalid calendar date", cleaned_text)
                return cleaned_text, None

        # Anchor meeting datetime
        if not meeting_timestamp:
            logger.info("Meeting timestamp missing; cannot deterministically resolve relative date '%s'", cleaned_text)
            return cleaned_text, None

        anchor_dt: datetime
        if isinstance(meeting_timestamp, str):
            try:
                anchor_dt = datetime.fromisoformat(meeting_timestamp.replace("Z", "+00:00"))
            except ValueError:
                logger.warning("Invalid meeting timestamp string: %s", meeting_timestamp)
                return cleaned_text, None
        elif isinstance(meeting_timestamp, datetime):
            anchor_dt = meeting_timestamp
        else:
            return cleaned_text, None

        # Convert anchor to meeting timezone
        if anchor_dt.tzinfo is None:
            anchor_dt = anchor_dt.replace(tzinfo=tz)
        else:
            anchor_dt = anchor_dt.astimezone(tz)

        anchor_date = anchor_dt.date()
        anchor_weekday = anchor_dt.weekday()  # Monday=0, Sunday=6

        # 2. Relative: "tomorrow"
        if text_lower == "tomorrow":
            target_date = anchor_date + timedelta(days=1)
            target_dt = datetime.combine(target_date, dt_time(23, 59, 59), tzinfo=tz)
            return cleaned_text, target_dt.isoformat()

        # 3. Relative: "today" or "eod"
        if text_lower in {"today", "eod", "end of day"}:
            target_dt = datetime.combine(anchor_date, dt_time(23, 59, 59), tzinfo=tz)
            return cleaned_text, target_dt.isoformat()

        # 4. Relative: "next <weekday>" (e.g. "next monday")
        next_match = re.match(r"^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$", text_lower)
        if next_match:
            target_weekday = WEEKDAYS[next_match.group(1)]
            days_ahead = (target_weekday - anchor_weekday) % 7
            if days_ahead == 0:
                days_ahead = 7
            target_date = anchor_date + timedelta(days=days_ahead)
            target_dt = datetime.combine(target_date, dt_time(23, 59, 59), tzinfo=tz)
            return cleaned_text, target_dt.isoformat()

        # 5. Relative: "by <weekday>" or "this <weekday>" (e.g. "by friday")
        by_match = re.match(r"^(?:by|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$", text_lower)
        if by_match:
            target_weekday = WEEKDAYS[by_match.group(1)]
            # AMBIGUOUS DATE POLICY:
            # If meeting date day equals target weekday (e.g. Meeting on Friday, due "by Friday"):
            # Ambiguous whether it means today or next Friday. Do NOT guess!
            if anchor_weekday == target_weekday:
                logger.info(
                    "Meeting day equals target day for '%s' (weekday=%d); applying Ambiguous Date Policy -> null",
                    cleaned_text,
                    target_weekday,
                )
                return cleaned_text, None

            # If anchor is before the target weekday in the same week:
            if anchor_weekday < target_weekday:
                days_ahead = target_weekday - anchor_weekday
                target_date = anchor_date + timedelta(days=days_ahead)
                target_dt = datetime.combine(target_date, dt_time(23, 59, 59), tzinfo=tz)
                return cleaned_text, target_dt.isoformat()

            # If anchor is already past the target weekday in the week (e.g. Saturday for "by Friday"):
            # Ambiguous (speaker might mean next Friday or made a past reference). Do NOT guess!
            logger.info(
                "Anchor weekday %d is after target %d for '%s'; applying Ambiguous Date Policy -> null",
                anchor_weekday,
                target_weekday,
                cleaned_text,
            )
            return cleaned_text, None

        # 6. Explicit month/day: e.g. "October 10", "Oct 10"
        month_match = re.match(r"^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$", text_lower)
        if month_match:
            month_name = month_match.group(1)
            if month_name in MONTHS:
                month_num = MONTHS[month_name]
                day_num = int(month_match.group(2))
                try:
                    target_date = datetime(anchor_dt.year, month_num, day_num).date()
                    target_dt = datetime.combine(target_date, dt_time(23, 59, 59), tzinfo=tz)
                    return cleaned_text, target_dt.isoformat()
                except ValueError:
                    return cleaned_text, None

        # 7. Unresolvable / Non-standard phrases (e.g. "asap", "next sprint", "end of month", "TBD")
        logger.info("Unrecognized or non-calendar relative date phrase '%s' preserved as unresolved", cleaned_text)
        return cleaned_text, None

    def validate_task(self, task: Union[ResolvedTask, Dict[str, Any]]) -> None:
        """
        Validate resolved task according to Section 7 constraints:
        - title is non-empty
        - description is valid string
        - type is supported
        - priority is supported
        - status is supported
        - acceptance_criteria is a list
        - meeting_id is present
        - team_id is present
        """
        if isinstance(task, ResolvedTask):
            title = task.title
            desc = task.description
            t_type = task.type
            priority = task.priority
            status = task.status
            criteria = task.acceptance_criteria
            m_id = task.meeting_id
            team_id = task.team_id
        elif isinstance(task, dict):
            title = task.get("title")
            desc = task.get("description", "")
            t_type = task.get("type", "task")
            priority = task.get("priority", "medium")
            status = task.get("status", "todo")
            criteria = task.get("acceptance_criteria", [])
            m_id = task.get("meeting_id")
            team_id = task.get("team_id")
        else:
            raise TaskValidationError(f"Invalid task data type: {type(task)}")

        if not title or not isinstance(title, str) or not title.strip():
            raise TaskValidationError("Task validation failed: title must be a non-empty string.")

        if not isinstance(desc, str):
            raise TaskValidationError("Task validation failed: description must be a string.")

        if t_type not in VALID_TYPES:
            raise TaskValidationError(f"Task validation failed: unsupported type '{t_type}'. Must be one of {sorted(VALID_TYPES)}.")

        if priority not in VALID_PRIORITIES:
            raise TaskValidationError(f"Task validation failed: unsupported priority '{priority}'. Must be one of {sorted(VALID_PRIORITIES)}.")

        if status not in VALID_STATUSES:
            raise TaskValidationError(f"Task validation failed: unsupported status '{status}'. Must be one of {sorted(VALID_STATUSES)}.")

        if not isinstance(criteria, list):
            raise TaskValidationError("Task validation failed: acceptance_criteria must be a list.")

        if not m_id or not str(m_id).strip():
            raise TaskValidationError("Task validation failed: meeting_id is required.")

        if not team_id or not str(team_id).strip():
            raise TaskValidationError("Task validation failed: team_id is required.")

    def resolve_tasks(
        self,
        scrum_result: ScrumResult,
        meeting_id: str,
        team_id: str,
        meeting_timestamp: Optional[Union[datetime, str]] = None,
        timezone_str: str = "UTC",
        participants: Optional[List[Dict[str, Any]]] = None,
        team_members: Optional[List[Dict[str, Any]]] = None,
        existing_tasks: Optional[List[Union[ResolvedTask, Dict[str, Any]]]] = None,
    ) -> TaskResolutionResult:
        """
        Execute deterministic task resolution pipeline on ScrumResult tasks.

        Structured logging per Section 12:
        Stage 3 task resolution started
        Meeting ID: ...
        Resolving assignees
        Tasks received: N
        Resolved assignees: X
        Unresolved assignees: Y
        Resolved due dates: X
        Unresolved due dates: Y
        Persisting generated tasks
        Tasks persisted: N
        Stage 3 task resolution completed
        """
        logger.info("Stage 3 task resolution started")
        logger.info("Meeting ID: %s", meeting_id)

        tasks_received = len(scrum_result.tasks) if scrum_result and scrum_result.tasks else 0
        logger.info("Resolving assignees")
        logger.info("Tasks received: %d", tasks_received)

        resolved_tasks: List[ResolvedTask] = []
        count_resolved_assignees = 0
        count_unresolved_assignees = 0
        count_resolved_due_dates = 0
        count_unresolved_due_dates = 0

        if not scrum_result or not scrum_result.tasks:
            logger.info("Resolved assignees: 0")
            logger.info("Unresolved assignees: 0")
            logger.info("Resolved due dates: 0")
            logger.info("Unresolved due dates: 0")
            logger.info("Persisting generated tasks")
            logger.info("Tasks persisted: 0")
            logger.info("Stage 3 task resolution completed")
            return TaskResolutionResult(
                meeting_id=meeting_id,
                team_id=team_id,
                tasks=[],
                total_tasks=0,
                resolved_assignees=0,
                unresolved_assignees=0,
                resolved_due_dates=0,
                unresolved_due_dates=0,
            )

        existing_pool = list(existing_tasks) if existing_tasks else []

        for task in scrum_result.tasks:
            # Reconcile with existing task to preserve stable ID and status
            matched_existing = None
            raw_action_item = (task.source_action_item or "").strip().lower()
            raw_title = (task.title or "").strip().lower()

            for et in existing_pool:
                et_action = (getattr(et, "source_action_item", None) if hasattr(et, "source_action_item") else et.get("source_action_item")) or ""
                et_title = (getattr(et, "title", None) if hasattr(et, "title") else et.get("title")) or ""
                if raw_action_item and et_action.strip().lower() == raw_action_item:
                    matched_existing = et
                    break
                if not matched_existing and raw_title and et_title.strip().lower() == raw_title:
                    matched_existing = et
                    break

            task_key = raw_action_item or raw_title or str(uuid.uuid4())
            deterministic_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{meeting_id}:{task_key}"))

            if matched_existing:
                stable_id = (
                    getattr(matched_existing, "id", None)
                    if hasattr(matched_existing, "id")
                    else matched_existing.get("id")
                ) or (
                    getattr(matched_existing, "ticket_id", None)
                    if hasattr(matched_existing, "ticket_id")
                    else matched_existing.get("ticket_id")
                ) or deterministic_uuid
                stable_status = (
                    getattr(matched_existing, "status", None)
                    if hasattr(matched_existing, "status")
                    else matched_existing.get("status")
                ) or "todo"
            else:
                stable_id = deterministic_uuid
                stable_status = "todo"

            # 1. Assignee resolution
            full_name, user_id, raw_assignee = self.resolve_assignee(
                task.assignee,
                participants=participants,
                team_members=team_members,
            )
            if user_id:
                count_resolved_assignees += 1
            elif raw_assignee:
                count_unresolved_assignees += 1

            # 2. Due date resolution
            due_date_str, resolved_due_date = self.resolve_due_date(
                task.due_date,
                meeting_timestamp=meeting_timestamp,
                timezone_str=timezone_str,
            )
            if resolved_due_date:
                count_resolved_due_dates += 1
            elif due_date_str:
                count_unresolved_due_dates += 1

            # Map task priority safely ('critical' -> 'urgent', None -> 'medium')
            task_priority = "medium"
            if task.priority:
                p_lower = str(task.priority).lower()
                if p_lower == "critical":
                    task_priority = "urgent"
                elif p_lower in ("low", "medium", "high", "urgent"):
                    task_priority = p_lower

            # Map task type safely ('story' -> 'feature', 'research' -> 'task')
            task_type = "task"
            if task.type:
                t_lower = str(task.type).lower()
                if t_lower == "story":
                    task_type = "feature"
                elif t_lower in ("task", "bug", "feature", "improvement"):
                    task_type = t_lower
                else:
                    task_type = "task"

            # 3. Construct ResolvedTask
            resolved_item = ResolvedTask(
                id=stable_id,
                ticket_id=stable_id,
                title=task.title,
                description=task.description,
                assignee=full_name,
                assignee_id=user_id,
                raw_assignee=raw_assignee,
                priority=task_priority,
                due_date=due_date_str,
                resolved_due_date=resolved_due_date,
                type=task_type,
                status=stable_status,
                acceptance_criteria=task.acceptance_criteria,
                source_action_item=task.source_action_item,
                meeting_id=meeting_id,
                team_id=team_id,
            )

            # 4. Validate task constraints
            self.validate_task(resolved_item)

            resolved_tasks.append(resolved_item)

        logger.info("Resolved assignees: %d", count_resolved_assignees)
        logger.info("Unresolved assignees: %d", count_unresolved_assignees)
        logger.info("Resolved due dates: %d", count_resolved_due_dates)
        logger.info("Unresolved due dates: %d", count_unresolved_due_dates)
        logger.info("Persisting generated tasks")
        logger.info("Tasks persisted: %d", len(resolved_tasks))
        logger.info("Stage 3 task resolution completed")

        return TaskResolutionResult(
            meeting_id=meeting_id,
            team_id=team_id,
            tasks=resolved_tasks,
            total_tasks=len(resolved_tasks),
            resolved_assignees=count_resolved_assignees,
            unresolved_assignees=count_unresolved_assignees,
            resolved_due_dates=count_resolved_due_dates,
            unresolved_due_dates=count_unresolved_due_dates,
        )


_task_resolution_service_instance: Optional[TaskResolutionService] = None


def get_task_resolution_service() -> TaskResolutionService:
    """Singleton provider for TaskResolutionService."""
    global _task_resolution_service_instance
    if _task_resolution_service_instance is None:
        _task_resolution_service_instance = TaskResolutionService()
    return _task_resolution_service_instance
