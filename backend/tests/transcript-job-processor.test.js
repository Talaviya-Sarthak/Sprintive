import test from 'node:test';
import assert from 'node:assert/strict';
import { processTranscriptJob } from '../src/services/transcript/transcript-job.processor.js';
import { meetingRepository } from '../src/repositories/meeting.repository.js';
import { taskResolutionService } from '../src/services/task-resolution/task-resolution.service.js';
import { aiHandoffService } from '../src/services/ai/ai-handoff.service.js';

test('Transcript Job Processor Integration & AI Pipeline Trigger', async (t) => {
  const originalGetTranscript = meetingRepository.getTranscript;
  const originalUpdateTranscriptStatus = meetingRepository.updateTranscriptStatus;
  const originalResolveAndPersist = taskResolutionService.resolveAndPersist;
  const originalHandoffWithRetry = aiHandoffService.handoffWithRetry;
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    meetingRepository.getTranscript = originalGetTranscript;
    meetingRepository.updateTranscriptStatus = originalUpdateTranscriptStatus;
    taskResolutionService.resolveAndPersist = originalResolveAndPersist;
    aiHandoffService.handoffWithRetry = originalHandoffWithRetry;
    globalThis.fetch = originalFetch;
  });

  aiHandoffService.handoffWithRetry = async () => ({ accepted: true, status: 'RECEIVED' });

  await t.test('passes run_ai_pipeline: true and invokes taskResolutionService.resolveAndPersist on success', async () => {
    const meetingId = 'test-meeting-ai-123';
    let passedPayload = null;
    let resolveAndPersistCalledWith = null;
    const statusUpdates = [];

    meetingRepository.getTranscript = async (id) => ({
      meeting_id: id,
      content: 'Alice: Let us implement the auth API before Friday.',
      raw_transcript_path: 'raw/test-meeting.txt',
      status: 'raw_stored',
    });

    meetingRepository.updateTranscriptStatus = async (update) => {
      statusUpdates.push(update);
    };

    const mockScrumResult = {
      tasks: [
        {
          title: 'Implement auth API',
          description: 'Implement auth API before Friday',
          assignee: 'Alice',
          priority: 'high',
          due_date: 'Friday',
          type: 'task',
          acceptance_criteria: 'Auth endpoints work',
          source_action_item: 'implement the auth API',
        },
      ],
    };

    const mockMeetingAnalysis = {
      summary: 'Alice discussed implementing auth API.',
      topics: ['Auth'],
      decisions: [],
      action_items: ['Alice to implement auth API before Friday'],
      blockers: [],
    };

    globalThis.fetch = async (url, options) => {
      if (url.includes('/transcript/process')) {
        passedPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            accepted: true,
            meeting_id: meetingId,
            processing_status: 'READY_FOR_AI',
            cleaned_transcript_path: `cleaned/${meetingId}.txt`,
            duration_ms: 150,
            metrics: { stages: 14 },
            scrum_analysis: mockScrumResult,
            meeting_analysis: mockMeetingAnalysis,
          }),
        };
      }
      // AI handoff stub call
      return {
        ok: true,
        status: 200,
        json: async () => ({ accepted: true, status: 'RECEIVED' }),
      };
    };

    taskResolutionService.resolveAndPersist = async (params) => {
      resolveAndPersistCalledWith = params;
      return { resolved_tasks: params.scrumResult.tasks, summary: {} };
    };

    const mockJob = {
      id: 'job-ai-test',
      data: { meetingId, rawTranscriptPath: 'raw/test-meeting.txt' },
      attemptsMade: 0,
      updateProgress: async () => {},
    };

    const result = await processTranscriptJob(mockJob);

    // 1. Verify result
    assert.equal(result.success, true);
    assert.equal(result.meetingId, meetingId);
    assert.equal(result.tasksCount, 1);

    // 2. Verify payload sent to python service includes run_ai_pipeline: true
    assert.ok(passedPayload, 'Payload must be sent to transcript service');
    assert.equal(passedPayload.run_ai_pipeline, true, 'Worker must pass run_ai_pipeline: true');
    assert.equal(passedPayload.meeting_id, meetingId);

    // 3. Verify taskResolutionService.resolveAndPersist was called with expected contracts
    assert.ok(resolveAndPersistCalledWith, 'taskResolutionService.resolveAndPersist must be invoked');
    assert.equal(resolveAndPersistCalledWith.meetingId, meetingId);
    assert.deepEqual(resolveAndPersistCalledWith.scrumResult, mockScrumResult);
    assert.equal(resolveAndPersistCalledWith.aiSummary, mockMeetingAnalysis.summary);
    assert.deepEqual(resolveAndPersistCalledWith.actionItems, mockMeetingAnalysis.action_items);

    // 4. Verify DB status transitions
    assert.ok(statusUpdates.some((u) => u.status === 'processing'));
    assert.ok(statusUpdates.some((u) => u.status === 'ready_for_ai'));
  });

  await t.test('handles taskResolutionService failure by marking meeting failed and throwing error', async () => {
    const meetingId = 'test-meeting-failure-456';
    const statusUpdates = [];

    meetingRepository.getTranscript = async (id) => ({
      meeting_id: id,
      content: 'Bob: I will fix the bug.',
      status: 'raw_stored',
    });

    meetingRepository.updateTranscriptStatus = async (update) => {
      statusUpdates.push(update);
    };

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        processing_status: 'READY_FOR_AI',
        cleaned_transcript_path: `cleaned/${meetingId}.txt`,
        duration_ms: 100,
        scrum_analysis: { tasks: [{ title: 'Fix bug' }] },
      }),
    });

    taskResolutionService.resolveAndPersist = async () => {
      throw new Error('Database connection failed during task upsert');
    };

    const mockJob = {
      id: 'job-fail-test',
      data: { meetingId },
      attemptsMade: 0,
      updateProgress: async () => {},
    };

    await assert.rejects(
      () => processTranscriptJob(mockJob),
      /Database connection failed during task upsert/
    );

    assert.ok(statusUpdates.some((u) => u.status === 'failed' && u.error.includes('Task resolution failed')));
  });

  await t.test('skips duplicate execution if meeting is already in ready_for_ai status', async () => {
    const meetingId = 'test-meeting-idempotent-789';
    let fetchCalled = false;

    meetingRepository.getTranscript = async (id) => ({
      meeting_id: id,
      status: 'ready_for_ai',
      cleaned_transcript_path: `cleaned/${id}.txt`,
    });

    globalThis.fetch = async () => {
      fetchCalled = true;
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const mockJob = {
      id: 'job-idem-test',
      data: { meetingId },
      attemptsMade: 0,
      updateProgress: async () => {},
    };

    const outcome = await processTranscriptJob(mockJob);
    assert.equal(outcome.status, 'already_completed');
    assert.equal(fetchCalled, false, 'Service fetch should not be called for already completed meeting');
  });

  await t.test('normalizes LLM story and research types and critical priority without validation error', () => {
    const rawTasks = [
      {
        title: 'User Story for SSO',
        type: 'story',
        priority: 'critical',
      },
      {
        title: 'Investigate Redis Memory Usage',
        type: 'research',
        priority: 'high',
      },
    ];

    const result = taskResolutionService.resolveTasks({
      tasks: rawTasks,
      meetingId: 'meeting-normalize-1',
      teamId: 'team-1',
    });

    assert.equal(result.tasks.length, 2);
    assert.equal(result.tasks[0].type, 'feature', 'story is normalized to feature');
    assert.equal(result.tasks[0].priority, 'urgent', 'critical is normalized to urgent');
    assert.equal(result.tasks[1].type, 'task', 'research is normalized to task');
  });
});
