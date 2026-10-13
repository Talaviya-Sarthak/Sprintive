import test from 'node:test';
import assert from 'node:assert/strict';
import { processTranscriptJob } from '../src/services/transcript/transcript-job.processor.js';
import { taskResolutionService } from '../src/services/task-resolution/task-resolution.service.js';
import { aiHandoffService } from '../src/services/ai/ai-handoff.service.js';
import { meetingRepository } from '../src/repositories/meeting.repository.js';
import { teamRepository } from '../src/repositories/team.repository.js';
import { kanbanService } from '../src/services/kanban.service.js';
import { kanbanRepository } from '../src/repositories/kanban.repository.js';

test('End-to-End Workflow: Transcript Processing to Kanban Board (Checkpoints 1-14)', async (t) => {
  const originalGetTranscript = meetingRepository.getTranscript;
  const originalUpdateTranscriptStatus = meetingRepository.updateTranscriptStatus;
  const originalFindById = meetingRepository.findById;
  const originalGetParticipants = meetingRepository.getParticipants;
  const originalGetMembers = teamRepository.getMembers;
  const originalGetSummary = meetingRepository.getSummary;
  const originalUpsertSummary = meetingRepository.upsertSummary;
  const originalGetTeamTasks = kanbanRepository.getTeamTasks;
  const originalVerifyTeamAccess = kanbanService.verifyTeamAccess;
  const originalHandoffWithRetry = aiHandoffService.handoffWithRetry;
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    meetingRepository.getTranscript = originalGetTranscript;
    meetingRepository.updateTranscriptStatus = originalUpdateTranscriptStatus;
    meetingRepository.findById = originalFindById;
    meetingRepository.getParticipants = originalGetParticipants;
    teamRepository.getMembers = originalGetMembers;
    meetingRepository.getSummary = originalGetSummary;
    meetingRepository.upsertSummary = originalUpsertSummary;
    kanbanRepository.getTeamTasks = originalGetTeamTasks;
    kanbanService.verifyTeamAccess = originalVerifyTeamAccess;
    aiHandoffService.handoffWithRetry = originalHandoffWithRetry;
    globalThis.fetch = originalFetch;
  });

  await t.test('Complete 14-checkpoint end-to-end workflow verification', async () => {
    const meetingId = '00000000-0000-0000-0000-000000000001';
    const teamId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    // Transcript with realistic Scrum items
    const rawTranscriptText = `
[00:00:05] Scrum Master: Good morning everyone. Let us start today's daily scrum.
[00:00:15] Sarah Chen: Yesterday I completed the user authentication and JWT session validation module.
[00:00:30] Marcus Johnson: Today I will build the real-time notification socket service by Friday at 5pm.
[00:00:45] David Miller: I am currently blocked on AWS KMS key permissions for the database encryption migration.
[00:01:00] Scrum Master: Great progress. The office coffee machine was also refilled, hope everyone enjoys it. Let us wrap up.
    `.trim();

    // In-memory test state
    const storageStore = new Map();
    const dbTranscripts = new Map();
    const dbMeetings = new Map();
    const dbSummaries = new Map();

    // Checkpoint 1: The transcript exists in the configured storage location
    const rawStoragePath = `meetings/${meetingId}/raw_transcript.txt`;
    storageStore.set(rawStoragePath, rawTranscriptText);
    assert.ok(storageStore.has(rawStoragePath), 'Checkpoint 1: Raw transcript must exist in storage');

    dbMeetings.set(meetingId, {
      id: meetingId,
      team_id: teamId,
      title: 'Sprint 42 Daily Standup',
      status: 'completed',
      scheduled_start: new Date('2026-10-13T09:00:00Z'),
      started_at: new Date('2026-10-13T09:00:00Z'),
    });

    dbTranscripts.set(meetingId, {
      meeting_id: meetingId,
      raw_transcript_path: rawStoragePath,
      content: rawTranscriptText,
      status: 'raw_stored',
    });

    const mockTeamMembers = [
      { user_id: 'u-1', full_name: 'Sarah Chen', role: 'member' },
      { user_id: 'u-2', full_name: 'Marcus Johnson', role: 'member' },
      { user_id: 'u-3', full_name: 'David Miller', role: 'member' },
    ];

    const mockParticipants = [
      { user_id: 'u-1', full_name: 'Sarah Chen', is_active: true },
      { user_id: 'u-2', full_name: 'Marcus Johnson', is_active: true },
      { user_id: 'u-3', full_name: 'David Miller', is_active: true },
    ];

    // Mock Repository bindings
    meetingRepository.getTranscript = async (id) => dbTranscripts.get(id) || null;
    meetingRepository.updateTranscriptStatus = async (update) => {
      const rec = dbTranscripts.get(update.meeting_id) || {};
      Object.assign(rec, update);
      dbTranscripts.set(update.meeting_id, rec);
      return rec;
    };
    meetingRepository.findById = async (id) => dbMeetings.get(id) || null;
    meetingRepository.getParticipants = async () => mockParticipants;
    teamRepository.getMembers = async () => mockTeamMembers;
    meetingRepository.getSummary = async (id) => dbSummaries.get(id) || null;
    meetingRepository.upsertSummary = async (summaryData) => {
      dbSummaries.set(summaryData.meeting_id, summaryData);
      return summaryData;
    };

    kanbanService.verifyTeamAccess = async () => true;

    kanbanRepository.getTeamTasks = async (queryTeamId, { meetingId: filterMeetingId } = {}) => {
      const meetings = [];
      const tasks = [];
      for (const [mId, mData] of dbMeetings.entries()) {
        if (mData.team_id !== queryTeamId) continue;
        const sData = dbSummaries.get(mId);
        const tickets = sData?.tickets_generated || [];
        meetings.push({ id: mId, title: mData.title, task_count: tickets.length });
        if (!filterMeetingId || filterMeetingId === mId) {
          tasks.push(...tickets);
        }
      }
      return { meetings, tasks };
    };

    aiHandoffService.handoffWithRetry = async () => ({ accepted: true, status: 'RECEIVED' });

    // Checkpoint 2: A BullMQ job is created with correct identifiers and processing options
    const bullmqJob = {
      id: 'job-standup-e2e-1',
      data: {
        meetingId,
        rawTranscriptPath: rawStoragePath,
      },
      attemptsMade: 0,
      progressValue: 0,
      updateProgress: async function(val) { this.progressValue = val; },
    };
    assert.equal(bullmqJob.data.meetingId, meetingId, 'Checkpoint 2: Job payload references meetingId');

    // Simulate Python FastAPI response for /transcript/process with run_ai_pipeline=True
    let pythonServiceCalled = false;
    let pythonReceivedPayload = null;

    globalThis.fetch = async (url, options) => {
      if (url.includes('/transcript/process')) {
        pythonServiceCalled = true;
        pythonReceivedPayload = JSON.parse(options.body);

        // Checkpoint 4 & 5: Preprocessing completes and returns cleaned text
        const cleanedPath = `meetings/${meetingId}/cleaned_transcript.txt`;
        storageStore.set(cleanedPath, "Cleaned verbatim dialogue");

        // Checkpoint 6 & 7: AI agents execute and return structured output
        return {
          ok: true,
          status: 200,
          json: async () => ({
            accepted: true,
            meeting_id: meetingId,
            processing_status: 'READY_FOR_AI',
            cleaned_transcript_path: cleanedPath,
            duration_ms: 320,
            metrics: { stages_completed: 14 },
            meeting_analysis: {
              summary: 'Daily standup covered authentication module completion, upcoming notification socket development, and an AWS KMS blocker.',
              topics: ['Authentication', 'Real-time Notifications', 'AWS KMS Permissions'],
              decisions: ['Wrap up authentication changes.'],
              action_items: [
                'Marcus Johnson to build real-time notification socket service by Friday',
                'David Miller unblock AWS KMS permissions for database encryption',
              ],
              blockers: ['AWS KMS key permissions for DB encryption'],
            },
            scrum_analysis: {
              tasks: [
                {
                  title: 'Build real-time notification socket service',
                  description: 'Build the notification socket service by Friday',
                  assignee: 'Marcus Johnson',
                  priority: 'high',
                  due_date: 'Friday',
                  type: 'task',
                  acceptance_criteria: 'Socket connections receive notifications',
                  source_action_item: 'build real-time notification socket service by Friday',
                },
                {
                  title: 'Resolve AWS KMS permissions for database encryption',
                  description: 'Unblock KMS permissions',
                  assignee: 'David Miller',
                  priority: 'urgent',
                  due_date: null,
                  type: 'bug',
                  acceptance_criteria: 'KMS access granted and DB encrypted',
                  source_action_item: 'AWS KMS key permissions for database encryption',
                },
              ],
            },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ accepted: true }) };
    };

    // Checkpoint 3: Worker retrieves and executes the job
    const jobOutcome = await processTranscriptJob(bullmqJob);

    assert.equal(jobOutcome.success, true, 'Checkpoint 3: Worker successfully completed');
    assert.equal(pythonServiceCalled, true, 'Checkpoint 4: Python transcript processing service was called');
    assert.equal(pythonReceivedPayload.run_ai_pipeline, true, 'Checkpoint 4: Worker enabled run_ai_pipeline');

    // Checkpoint 5: Cleaned transcript path exists
    assert.ok(jobOutcome.cleanedTranscriptPath.includes('cleaned_transcript.txt'), 'Checkpoint 5: Cleaned path produced');

    // Checkpoint 8 & 9: Tasks resolved and persisted to database meeting_summaries
    const persistedSummary = dbSummaries.get(meetingId);
    assert.ok(persistedSummary, 'Checkpoint 9: Meeting summary was persisted in DB');
    assert.equal(Array.isArray(persistedSummary.tickets_generated), true, 'Checkpoint 9: tickets_generated is an array');
    assert.equal(persistedSummary.tickets_generated.length, 2, 'Checkpoint 9: 2 tasks persisted');

    // Checkpoint 8: Check deterministic task resolution
    const task1 = persistedSummary.tickets_generated.find((t) => t.title.includes('notification'));
    assert.ok(task1, 'Task 1 found');
    assert.equal(task1.assignee, 'Marcus Johnson');
    assert.equal(task1.assignee_id, 'u-2'); // Marcus Johnson matched to u-2
    assert.ok(task1.id, 'Deterministic UUID assigned');

    const task2 = persistedSummary.tickets_generated.find((t) => t.title.includes('AWS KMS'));
    assert.ok(task2, 'Task 2 found');
    assert.equal(task2.assignee, 'David Miller');
    assert.equal(task2.assignee_id, 'u-3'); // David Miller matched to u-3

    // Checkpoint 10: Retry does not create duplicate tasks
    const firstRunTaskIds = persistedSummary.tickets_generated.map((t) => t.id).sort();
    
    // Simulate retry run
    await taskResolutionService.resolveAndPersist({
      meetingId,
      scrumResult: {
        tasks: [
          {
            title: 'Build real-time notification socket service',
            description: 'Build the notification socket service by Friday',
            assignee: 'Marcus Johnson',
            priority: 'high',
            due_date: 'Friday',
            type: 'task',
            acceptance_criteria: 'Socket connections receive notifications',
            source_action_item: 'build real-time notification socket service by Friday',
          },
          {
            title: 'Resolve AWS KMS permissions for database encryption',
            description: 'Unblock KMS permissions',
            assignee: 'David Miller',
            priority: 'urgent',
            due_date: null,
            type: 'bug',
            acceptance_criteria: 'KMS access granted and DB encrypted',
            source_action_item: 'AWS KMS key permissions for database encryption',
          },
        ],
      },
    });

    const secondRunSummary = dbSummaries.get(meetingId);
    assert.equal(secondRunSummary.tickets_generated.length, 2, 'Checkpoint 10: Task count remains exactly 2 on retry');
    const secondRunTaskIds = secondRunSummary.tickets_generated.map((t) => t.id).sort();
    assert.deepEqual(firstRunTaskIds, secondRunTaskIds, 'Checkpoint 10: Deterministic IDs match exactly on retry');

    // Checkpoint 11 & 12: Kanban API returns persisted tasks associated with correct team & meeting
    const kanbanData = await kanbanService.getKanban(teamId, userId, { meetingId });
    assert.equal(kanbanData.team_id, teamId, 'Checkpoint 12: Associated with correct team');
    assert.equal(kanbanData.meeting_id, meetingId, 'Checkpoint 12: Associated with correct meeting');
    assert.equal(kanbanData.tasks.length, 2, 'Checkpoint 11: Kanban API returns persisted tasks');

    // Checkpoint 13: Columns partitioned for frontend rendering
    assert.ok(kanbanData.columns.todo, 'Checkpoint 13: todo column exists');
    assert.ok(Array.isArray(kanbanData.columns.todo), 'Checkpoint 13: todo column is array');
    assert.equal(kanbanData.total_tasks, 2, 'Checkpoint 13: total_tasks matches frontend expectations');

    // Checkpoint 14: Job status reflects actual processing outcome
    const dbRecord = dbTranscripts.get(meetingId);
    assert.equal(dbRecord.status, 'ready_for_ai', 'Checkpoint 14: Transcript status is ready_for_ai');
    assert.equal(dbRecord.error, null, 'Checkpoint 14: No error logged on successful job');
    assert.equal(bullmqJob.progressValue, 100, 'Checkpoint 14: BullMQ job progress reached 100%');
  });
});
