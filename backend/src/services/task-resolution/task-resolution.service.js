import { createHash, randomUUID } from 'crypto';
import { AppError } from '../../middleware/error.middleware.js';

function generateDeterministicTaskId(meetingId, taskKey) {
  const hash = createHash('sha1').update(`${meetingId}:${taskKey}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
import { logger } from '../../utils/logger.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';
import { teamRepository } from '../../repositories/team.repository.js';

const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent', 'critical']);
const VALID_TYPES = new Set(['task', 'bug', 'feature', 'improvement', 'story', 'research']);
const VALID_STATUSES = new Set(['todo', 'backlog', 'in_progress', 'review', 'done']);

const WEEKDAYS = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const MONTHS = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

export class TaskResolutionService {
  /**
   * Deterministically resolve assignee name string to user ID.
   *
   * Search priority:
   * 1. meeting_participants -> users
   * 2. team_members -> users (fallback)
   *
   * Matching rules:
   * Level 1: Exact full-name match (case-insensitive, trimmed)
   * Level 2: First-name match
   * Level 3: Multi-token match
   *
   * Ambiguity rule:
   * If multiple users match in the candidate pool, return null assignee.
   *
   * @param {string|null} rawAssignee
   * @param {Array<object>} participants
   * @param {Array<object>} teamMembers
   * @returns {{ assignee: string|null, assignee_id: string|null, raw_assignee: string|null }}
   */
  resolveAssignee(rawAssignee, participants = [], teamMembers = []) {
    if (!rawAssignee || typeof rawAssignee !== 'string' || !rawAssignee.trim()) {
      return { assignee: null, assignee_id: null, raw_assignee: null };
    }

    const cleaned = rawAssignee.trim();
    const queryLower = cleaned.toLowerCase();

    const matchPool = (candidates) => {
      if (!Array.isArray(candidates) || candidates.length === 0) return null;

      // Filter active candidates (not left or inactive)
      const activePool = candidates.filter((c) => c.is_active !== false && !c.left_at);

      // Level 1: Exact full-name match
      const l1Matches = activePool.filter((c) => (c.full_name || '').trim().toLowerCase() === queryLower);
      if (l1Matches.length === 1) return l1Matches[0];
      if (l1Matches.length > 1) return 'AMBIGUOUS';

      // Level 2: First-name match
      const l2Matches = activePool.filter((c) => {
        const fullName = (c.full_name || '').trim();
        const firstName = fullName.split(/\s+/)[0]?.toLowerCase() || '';
        return firstName === queryLower;
      });
      if (l2Matches.length === 1) return l2Matches[0];
      if (l2Matches.length > 1) return 'AMBIGUOUS';

      // Level 3: Multi-token match
      const queryTokens = queryLower.split(/\s+/);
      if (queryTokens.length > 1) {
        const l3Matches = activePool.filter((c) => {
          const cTokens = (c.full_name || '').trim().toLowerCase().split(/\s+/);
          if (cTokens.length < queryTokens.length) return false;
          return queryTokens.every((qt, idx) => cTokens[idx] && cTokens[idx].startsWith(qt));
        });
        if (l3Matches.length === 1) return l3Matches[0];
        if (l3Matches.length > 1) return 'AMBIGUOUS';
      }

      return null;
    };

    // 1. Search meeting_participants first
    const participantMatch = matchPool(participants);
    if (participantMatch === 'AMBIGUOUS') {
      logger.info(`[Stage3] Assignee '${cleaned}' is ambiguous among meeting participants`);
      return { assignee: null, assignee_id: null, raw_assignee: cleaned };
    }
    if (participantMatch) {
      const userId = participantMatch.user_id || participantMatch.id;
      return {
        assignee: participantMatch.full_name || cleaned,
        assignee_id: userId ? String(userId) : null,
        raw_assignee: cleaned,
      };
    }

    // 2. Fallback: Search team_members
    const teamMatch = matchPool(teamMembers);
    if (teamMatch === 'AMBIGUOUS') {
      logger.info(`[Stage3] Assignee '${cleaned}' is ambiguous among team members`);
      return { assignee: null, assignee_id: null, raw_assignee: cleaned };
    }
    if (teamMatch) {
      const userId = teamMatch.user_id || teamMatch.id;
      return {
        assignee: teamMatch.full_name || cleaned,
        assignee_id: userId ? String(userId) : null,
        raw_assignee: cleaned,
      };
    }

    // 3. No match found
    logger.info(`[Stage3] Assignee '${cleaned}' not found in participants or team members`);
    return { assignee: null, assignee_id: null, raw_assignee: cleaned };
  }

  /**
   * Deterministically resolve relative or explicit due dates using meeting start timestamp and timezone.
   *
   * Ambiguous Date Policy:
   * If phrase is ambiguous (e.g. Meeting date is Friday, Due date is 'by Friday'),
   * preserve due_date='by Friday' and resolved_due_date=null without guessing.
   *
   * @param {string|null} rawDueDate
   * @param {string|Date|null} meetingStartedAt
   * @param {string} meetingTimezone
   * @returns {{ due_date: string|null, resolved_due_date: string|null }}
   */
  resolveDueDate(rawDueDate, meetingStartedAt = null, meetingTimezone = 'UTC') {
    if (!rawDueDate || typeof rawDueDate !== 'string' || !rawDueDate.trim()) {
      return { due_date: null, resolved_due_date: null };
    }

    const cleaned = rawDueDate.trim();
    const textLower = cleaned.toLowerCase();

    // 1. Explicit ISO date check (YYYY-MM-DD)
    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?.*$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 23;
      const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 59;
      const sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 59;

      const dateObj = new Date(Date.UTC(year, month, day, hour, min, sec));
      if (
        dateObj.getUTCFullYear() !== year ||
        dateObj.getUTCMonth() !== month ||
        dateObj.getUTCDate() !== day
      ) {
        logger.warn(`[Stage3] Explicit date '${cleaned}' is an invalid calendar date`);
        return { due_date: cleaned, resolved_due_date: null };
      }
      return { due_date: cleaned, resolved_due_date: dateObj.toISOString() };
    }

    // Anchor meeting date check
    if (!meetingStartedAt) {
      logger.info(`[Stage3] Meeting timestamp missing; cannot resolve relative date '${cleaned}'`);
      return { due_date: cleaned, resolved_due_date: null };
    }

    const anchorDate = new Date(meetingStartedAt);
    if (isNaN(anchorDate.getTime())) {
      logger.warn(`[Stage3] Invalid meeting start timestamp: ${meetingStartedAt}`);
      return { due_date: cleaned, resolved_due_date: null };
    }

    // Determine day of week in target timezone (0=Sunday in JS, convert to Monday=0 .. Sunday=6)
    // Convert anchor to target timezone components
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: meetingTimezone || 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'long',
      hour12: false,
    });
    const parts = formatter.formatToParts(anchorDate);
    const partMap = {};
    for (const p of parts) partMap[p.type] = p.value;

    const tzYear = parseInt(partMap.year, 10);
    const tzMonth = parseInt(partMap.month, 10) - 1;
    const tzDay = parseInt(partMap.day, 10);
    const tzWeekdayName = (partMap.weekday || '').toLowerCase();
    const tzWeekday = WEEKDAYS[tzWeekdayName] ?? 0; // Monday=0 .. Sunday=6

    // Helper to format end-of-day in target timezone as ISO
    const formatEndOfDay = (y, m, d) => {
      const dt = new Date(Date.UTC(y, m, d, 23, 59, 59));
      return dt.toISOString();
    };

    // 2. Relative: "tomorrow"
    if (textLower === 'tomorrow') {
      const target = new Date(Date.UTC(tzYear, tzMonth, tzDay + 1, 23, 59, 59));
      return { due_date: cleaned, resolved_due_date: target.toISOString() };
    }

    // 3. Relative: "today" or "eod"
    if (textLower === 'today' || textLower === 'eod' || textLower === 'end of day') {
      const target = new Date(Date.UTC(tzYear, tzMonth, tzDay, 23, 59, 59));
      return { due_date: cleaned, resolved_due_date: target.toISOString() };
    }

    // 4. Relative: "next <weekday>" (e.g. "next monday")
    const nextMatch = textLower.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
    if (nextMatch) {
      const targetWeekday = WEEKDAYS[nextMatch[1]];
      let daysAhead = (targetWeekday - tzWeekday) % 7;
      if (daysAhead <= 0) daysAhead += 7;
      const target = new Date(Date.UTC(tzYear, tzMonth, tzDay + daysAhead, 23, 59, 59));
      return { due_date: cleaned, resolved_due_date: target.toISOString() };
    }

    // 5. Relative: "by <weekday>" or "this <weekday>" (e.g. "by friday")
    const byMatch = textLower.match(/^(?:by|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
    if (byMatch) {
      const targetWeekday = WEEKDAYS[byMatch[1]];

      // Ambiguous Date Policy:
      // If meeting day equals target weekday (e.g. Meeting on Friday, due "by Friday"):
      // Ambiguous whether it means today or next Friday. Do NOT guess!
      if (tzWeekday === targetWeekday) {
        logger.info(`[Stage3] Meeting day matches target day for '${cleaned}' (weekday=${targetWeekday}) -> ambiguous null`);
        return { due_date: cleaned, resolved_due_date: null };
      }

      // If anchor is before the target weekday in the same week:
      if (tzWeekday < targetWeekday) {
        const daysAhead = targetWeekday - tzWeekday;
        const target = new Date(Date.UTC(tzYear, tzMonth, tzDay + daysAhead, 23, 59, 59));
        return { due_date: cleaned, resolved_due_date: target.toISOString() };
      }

      // If anchor is already past the target weekday in the week (e.g. Saturday for "by Friday"):
      // Ambiguous (could mean next Friday or missed). Do NOT guess!
      logger.info(`[Stage3] Meeting day past target day for '${cleaned}' -> ambiguous null`);
      return { due_date: cleaned, resolved_due_date: null };
    }

    // 6. Explicit month/day: "October 10", "Oct 10"
    const monthMatch = textLower.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
    if (monthMatch && MONTHS[monthMatch[1]] !== undefined) {
      const targetMonth = MONTHS[monthMatch[1]];
      const targetDay = parseInt(monthMatch[2], 10);
      const target = new Date(Date.UTC(tzYear, targetMonth, targetDay, 23, 59, 59));
      if (target.getUTCMonth() === targetMonth && target.getUTCDate() === targetDay) {
        return { due_date: cleaned, resolved_due_date: target.toISOString() };
      }
      return { due_date: cleaned, resolved_due_date: null };
    }

    // 7. Non-standard phrases ("asap", "next sprint", "TBD")
    logger.info(`[Stage3] Non-calendar relative phrase '${cleaned}' preserved as unresolved`);
    return { due_date: cleaned, resolved_due_date: null };
  }

  /**
   * Validate resolved task according to Section 7 constraints.
   */
  validateTask(task, meetingId, teamId) {
    if (!task || typeof task !== 'object') {
      throw new AppError('Task validation failed: task must be an object', 422, 'TASK_VALIDATION_ERROR');
    }

    const title = task.title;
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError('Task validation failed: title must be a non-empty string', 422, 'TASK_VALIDATION_ERROR');
    }

    if (task.description !== undefined && typeof task.description !== 'string') {
      throw new AppError('Task validation failed: description must be a string', 422, 'TASK_VALIDATION_ERROR');
    }

    const type = task.type || 'task';
    if (!VALID_TYPES.has(type)) {
      throw new AppError(`Task validation failed: unsupported type '${type}'`, 422, 'TASK_VALIDATION_ERROR');
    }

    const priority = task.priority || 'medium';
    if (!VALID_PRIORITIES.has(priority)) {
      throw new AppError(`Task validation failed: unsupported priority '${priority}'`, 422, 'TASK_VALIDATION_ERROR');
    }

    const status = task.status || 'todo';
    if (!VALID_STATUSES.has(status)) {
      throw new AppError(`Task validation failed: unsupported status '${status}'`, 422, 'TASK_VALIDATION_ERROR');
    }

    if (task.acceptance_criteria !== undefined && !Array.isArray(task.acceptance_criteria)) {
      throw new AppError('Task validation failed: acceptance_criteria must be an array', 422, 'TASK_VALIDATION_ERROR');
    }

    const mId = task.meeting_id || meetingId;
    if (!mId || typeof mId !== 'string' || !mId.trim()) {
      throw new AppError('Task validation failed: meeting_id is required', 422, 'TASK_VALIDATION_ERROR');
    }

    const tId = task.team_id || teamId;
    if (!tId || typeof tId !== 'string' || !tId.trim()) {
      throw new AppError('Task validation failed: team_id is required', 422, 'TASK_VALIDATION_ERROR');
    }
  }

  /**
   * Deterministically resolve a list of ScrumTasks.
   *
   * @param {object} params
   * @param {Array<object>} params.tasks - Stage 2 ScrumTasks
   * @param {string} params.meetingId
   * @param {string} params.teamId
   * @param {string|Date|null} params.meetingStartedAt
   * @param {string} params.meetingTimezone
   * @param {Array<object>} params.participants
   * @param {Array<object>} params.teamMembers
   * @returns {object}
   */
  resolveTasks({
    tasks = [],
    meetingId,
    teamId,
    meetingStartedAt = null,
    meetingTimezone = 'UTC',
    participants = [],
    teamMembers = [],
    existingTasks = [],
  }) {
    logger.info('Stage 3 task resolution started');
    logger.info(`Meeting ID: ${meetingId}`);

    const tasksReceived = Array.isArray(tasks) ? tasks.length : 0;
    logger.info('Resolving assignees');
    logger.info(`Tasks received: ${tasksReceived}`);

    let resolvedAssignees = 0;
    let unresolvedAssignees = 0;
    let resolvedDueDates = 0;
    let unresolvedDueDates = 0;

    const existingPool = Array.isArray(existingTasks) ? [...existingTasks] : [];
    const resolvedTasks = [];

    for (const rawTask of tasks || []) {
      // Reconcile with existing task to preserve stable ID and status
      let matchedExisting = null;
      const rawActionItem = (rawTask.source_action_item || '').trim().toLowerCase();
      const rawTitle = (rawTask.title || '').trim().toLowerCase();

      if (rawActionItem) {
        matchedExisting = existingPool.find(
          (et) => (et.source_action_item || '').trim().toLowerCase() === rawActionItem
        );
      }
      if (!matchedExisting && rawTitle) {
        matchedExisting = existingPool.find(
          (et) => (et.title || '').trim().toLowerCase() === rawTitle
        );
      }

      // Preserve existing ID, or compute deterministic UUID from meeting & task key, or generate fresh UUID
      const taskKey = rawActionItem || rawTitle || '';
      const stableId = rawTask.id || rawTask.ticket_id || matchedExisting?.id || matchedExisting?.ticket_id || (taskKey ? generateDeterministicTaskId(meetingId, taskKey) : randomUUID());
      // Preserve existing user-modified status or fallback to 'todo'
      const stableStatus = matchedExisting?.status || rawTask.status || 'todo';

      // 1. Assignee resolution
      const { assignee, assignee_id, raw_assignee } = this.resolveAssignee(
        rawTask.assignee,
        participants,
        teamMembers
      );
      if (assignee_id) resolvedAssignees++;
      else if (raw_assignee) unresolvedAssignees++;

      // 2. Date resolution
      const { due_date, resolved_due_date } = this.resolveDueDate(
        rawTask.due_date,
        meetingStartedAt,
        meetingTimezone
      );
      if (resolved_due_date) resolvedDueDates++;
      else if (due_date) unresolvedDueDates++;

      // Normalize priority from Python LLM agent ('critical' -> 'urgent')
      let normalizedPriority = String(rawTask.priority || 'medium').toLowerCase();
      if (normalizedPriority === 'critical') normalizedPriority = 'urgent';
      if (!VALID_PRIORITIES.has(normalizedPriority)) normalizedPriority = 'medium';

      // Normalize task type from Python LLM agent ('story' -> 'feature', 'research' -> 'task')
      let normalizedType = String(rawTask.type || 'task').toLowerCase();
      if (normalizedType === 'story') normalizedType = 'feature';
      if (normalizedType === 'research') normalizedType = 'task';
      if (!VALID_TYPES.has(normalizedType)) normalizedType = 'task';

      // 3. Construct resolved task object
      const resolved = {
        id: stableId,
        ticket_id: stableId,
        title: rawTask.title,
        description: rawTask.description || '',
        assignee,
        assignee_id,
        raw_assignee,
        priority: normalizedPriority,
        due_date,
        resolved_due_date,
        type: normalizedType,
        status: stableStatus,
        acceptance_criteria: Array.isArray(rawTask.acceptance_criteria) ? rawTask.acceptance_criteria : [],
        source_action_item: rawTask.source_action_item || null,
        meeting_id: meetingId,
        team_id: teamId,
      };

      // 4. Validate task constraints
      this.validateTask(resolved, meetingId, teamId);

      resolvedTasks.push(resolved);
    }

    logger.info(`Resolved assignees: ${resolvedAssignees}`);
    logger.info(`Unresolved assignees: ${unresolvedAssignees}`);
    logger.info(`Resolved due dates: ${resolvedDueDates}`);
    logger.info(`Unresolved due dates: ${unresolvedDueDates}`);

    return {
      meeting_id: meetingId,
      team_id: teamId,
      tasks: resolvedTasks,
      total_tasks: resolvedTasks.length,
      resolved_assignees: resolvedAssignees,
      unresolved_assignees: unresolvedAssignees,
      resolved_due_dates: resolvedDueDates,
      unresolved_due_dates: unresolvedDueDates,
    };
  }

  /**
   * Complete Stage 3 end-to-end:
   * Load meeting & context -> Deterministically resolve tasks -> Idempotently persist via upsertSummary.
   *
   * @param {object} params
   * @param {string} params.meetingId
   * @param {object} params.scrumResult - Stage 2 result { tasks: [...] }
   * @param {string|null} params.teamId - Optional team ID override
   * @returns {Promise<{ resolved_tasks: Array<object>, summary: object }>}
   */
  async resolveAndPersist({ meetingId, scrumResult, teamId = null, aiSummary = null, actionItems = null }) {
    logger.info(`[AI PIPELINE] stage=task-resolution status=started meetingId=${meetingId}`);
    if (!meetingId) {
      throw new AppError('Meeting ID is required for task persistence', 400, 'INVALID_MEETING_ID');
    }

    try {
      const meeting = await meetingRepository.findById(meetingId);
      if (!meeting) {
        throw new AppError(`Meeting ${meetingId} not found`, 404, 'MEETING_NOT_FOUND');
      }

      const effectiveTeamId = teamId || meeting.team_id;
      const meetingTimestamp = meeting.started_at || meeting.scheduled_start;
      const meetingTimezone = meeting.timezone || 'UTC';

      // Query participants and team members scoped strictly to this meeting/team
      const participants = await meetingRepository.getParticipants(meetingId);
      const teamMembers = effectiveTeamId ? await teamRepository.getMembers(effectiveTeamId) : [];

      // Retrieve existing summary to preserve ai_summary, action_items, and existing tasks for reconciliation
      const existingSummary = await meetingRepository.getSummary(meetingId);
      const existingTasks = Array.isArray(existingSummary?.tickets_generated) ? existingSummary.tickets_generated : [];

      const rawTasks = scrumResult?.tasks || [];
      logger.info(`[AI PIPELINE] stage=task-resolution input_task_count=${rawTasks.length}`);

      const resolution = this.resolveTasks({
        tasks: rawTasks,
        meetingId,
        teamId: effectiveTeamId,
        meetingStartedAt: meetingTimestamp,
        meetingTimezone,
        participants,
        teamMembers,
        existingTasks,
      });

      logger.info(`[AI PIPELINE] stage=task-resolution status=returned resolved_task_count=${resolution.tasks.length}`);

      logger.info(`[AI PIPELINE] stage=persistence status=started`);
      const summaryRecord = await meetingRepository.upsertSummary({
        meeting_id: meetingId,
        duration_minutes: existingSummary?.duration_minutes ?? meeting.duration_minutes ?? 0,
        attendance_count: existingSummary?.attendance_count ?? participants.length,
        total_participants: existingSummary?.total_participants ?? participants.length,
        ai_summary: aiSummary ?? existingSummary?.ai_summary ?? null,
        action_items: actionItems ?? existingSummary?.action_items ?? [],
        tickets_generated: resolution.tasks, // Idempotent overwrite / snapshot
      });

      logger.info(`[AI PIPELINE] stage=persistence status=completed`);
      logger.info(`[AI PIPELINE] status=completed`);

      return {
        resolved_tasks: resolution.tasks,
        summary: summaryRecord,
        metrics: {
          total_tasks: resolution.total_tasks,
          resolved_assignees: resolution.resolved_assignees,
          unresolved_assignees: resolution.unresolved_assignees,
          resolved_due_dates: resolution.resolved_due_dates,
          unresolved_due_dates: resolution.unresolved_due_dates,
        },
      };
    } catch (err) {
      logger.error(`[AI PIPELINE] stage=task-resolution status=failed error=${err.message}`);
      throw err;
    }
  }
}

export const taskResolutionService = new TaskResolutionService();
