import pool from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { createLocalUser } from '../src/repositories/auth.repository.js';
import { teamRepository } from '../src/repositories/team.repository.js';
import { meetingRepository } from '../src/repositories/meeting.repository.js';
import { meetingService } from '../src/services/meeting.service.js';
import { transcriptService } from '../src/services/transcript/transcript.service.js';
import { storageService } from '../src/services/storage/storage.service.js';

const results = [];

function recordResult(testName, passed, evidence) {
  results.push({ testName, passed, evidence });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${icon}: ${testName}\nEvidence: ${evidence}`);
}

async function runSuite() {
  console.log('🚀 Starting P0 Stabilization Test Suite...\n');

  let userA, userB, teamA, teamB, meetingA, meetingC;

  try {
    // ── Setup Users and Teams ──
    const uniqueId = Date.now().toString().slice(-6);
    userA = await createLocalUser({
      fullName: `User A ${uniqueId}`,
      email: `user.a.${uniqueId}@sprintive.test`,
      passwordHash: 'dummy_hash',
    });
    userB = await createLocalUser({
      fullName: `User B ${uniqueId}`,
      email: `user.b.${uniqueId}@sprintive.test`,
      passwordHash: 'dummy_hash',
    });

    teamA = await teamRepository.createWithOwner({
      name: `Team A ${uniqueId}`,
      description: 'Test Team A',
      avatar_url: null,
      color: '#3B82F6',
      timezone: 'UTC',
      working_days: [1, 2, 3, 4, 5],
      daily_scrum_time: '09:00:00',
      created_by: userA.id,
    });

    teamB = await teamRepository.createWithOwner({
      name: `Team B ${uniqueId}`,
      description: 'Test Team B',
      avatar_url: null,
      color: '#10B981',
      timezone: 'UTC',
      working_days: [1, 2, 3, 4, 5],
      daily_scrum_time: '10:00:00',
      created_by: userB.id,
    });

    console.log(`Setup complete: UserA=${userA.id}, TeamA=${teamA.id}, UserB=${userB.id}, TeamB=${teamB.id}`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1 — Normal meeting lifecycle & preprocessing
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 1: Normal Meeting & Preprocessing ---');
    meetingA = await meetingService.createMeeting({
      team_id: teamA.id,
      title: 'Daily Standup A',
      description: 'Testing P0 pipeline',
      sprint_name: 'Sprint 1',
      meeting_type: 'daily_scrum',
      date: '2026-09-27',
      start_time: '10:00',
      end_time: '10:30',
      timezone: 'UTC',
      duration_minutes: 30,
      agenda: ['Status updates'],
      userId: userA.id,
    });

    // Start meeting as host
    await meetingService.startMeeting(meetingA.id, userA.id);

    // Join meeting
    const joinResult = await meetingService.joinMeeting(meetingA.id, userA.id);
    if (!joinResult?.meeting) throw new Error('Failed to join meeting');

    // Dialogue content
    const dialogue = `[00:00:01] Sarthak Talaviya: Good morning team, let's start the daily scrum.
[00:00:05] Harshit Pambhar: Good morning. Yesterday I completed the authentication refactoring. Today I am working on the transcript pipeline.
[00:00:15] Sarthak Talaviya: Great. Any blockers?
[00:00:18] Harshit Pambhar: No blockers at the moment.
[00:00:22] Sarthak Talaviya: Excellent, let's proceed. Meeting adjourned.`;

    // End meeting
    const endResult = await meetingService.endMeeting(meetingA.id, userA.id);

    // Save and upload raw transcript
    const rawPath = storageService.getRawPath(meetingA.id);
    const expectedPath = `meetings/${meetingA.id}/raw/conversation.txt`;
    if (rawPath !== expectedPath) {
      throw new Error(`Storage path mismatch: expected ${expectedPath}, got ${rawPath}`);
    }

    const transcriptRecord = await meetingRepository.saveTranscript({
      meeting_id: meetingA.id,
      content: dialogue,
      transcript_path: rawPath,
      transcript_name: 'conversation.txt',
      transcript_size: Buffer.byteLength(dialogue, 'utf8'),
      status: 'raw_stored',
      storage_provider: 'local',
      storage_bucket: env.supabaseBucket,
      storage_path: rawPath,
      raw_transcript_path: rawPath,
      cleaned_transcript_path: null,
      error: null,
    });

    if (transcriptRecord.status !== 'raw_stored') {
      throw new Error(`Expected status raw_stored, got ${transcriptRecord.status}`);
    }

    // Trigger preprocessing synchronously
    const procResult = await transcriptService.triggerPreprocessing(
      meetingA.id,
      dialogue,
      rawPath
    );

    // Verify DB record after preprocessing
    const updatedDbTranscript = await meetingRepository.getTranscript(meetingA.id);
    const test1Passed =
      updatedDbTranscript.status === 'ready_for_ai' &&
      updatedDbTranscript.cleaned_transcript_path != null &&
      updatedDbTranscript.raw_transcript_path === expectedPath;

    recordResult(
      'Test 1 — Normal meeting',
      test1Passed,
      `meeting_id=${meetingA.id}, status=${updatedDbTranscript.status}, raw_path=${updatedDbTranscript.raw_transcript_path}, cleaned_path=${updatedDbTranscript.cleaned_transcript_path}`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2 — Duplicate finalization & idempotency
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 2: Duplicate finalization ---');

    // Simulate second finalization on Meeting A
    await meetingRepository.saveTranscript({
      meeting_id: meetingA.id,
      content: dialogue + '\n[00:00:25] Sarthak Talaviya: Post-meeting note.',
      transcript_path: rawPath,
      transcript_name: 'conversation.txt',
      transcript_size: Buffer.byteLength(dialogue, 'utf8'),
      status: 'ready_for_ai',
      storage_provider: 'local',
      storage_bucket: env.supabaseBucket,
      storage_path: rawPath,
      raw_transcript_path: rawPath,
      cleaned_transcript_path: updatedDbTranscript.cleaned_transcript_path,
    });

    // Check count of rows for meetingA.id in meeting_transcripts
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM meeting_transcripts WHERE meeting_id = $1',
      [meetingA.id]
    );

    const test2Passed = countRows[0].count === 1;
    recordResult(
      'Test 2 — Duplicate finalization',
      test2Passed,
      `Rows in meeting_transcripts for meeting ${meetingA.id}: ${countRows[0].count} (UNIQUE constraint verified)`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3 — Unauthorized user (IDOR protection)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 3: Unauthorized user access (IDOR) ---');

    const unauthorizedChecks = [];

    // User B attempting to access Meeting A (Team A)
    try {
      await meetingService.getMeeting(meetingA.id, userB.id);
      unauthorizedChecks.push({ operation: 'getMeeting', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'getMeeting', blocked: err.statusCode === 403 });
    }

    try {
      await meetingService.joinMeeting(meetingA.id, userB.id);
      unauthorizedChecks.push({ operation: 'joinMeeting', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'joinMeeting', blocked: err.statusCode === 403 });
    }

    try {
      await meetingService.getTranscript(meetingA.id, userB.id);
      unauthorizedChecks.push({ operation: 'getTranscript', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'getTranscript', blocked: err.statusCode === 403 });
    }

    try {
      await meetingService.getSummary(meetingA.id, userB.id);
      unauthorizedChecks.push({ operation: 'getSummary', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'getSummary', blocked: err.statusCode === 403 });
    }

    try {
      await meetingService.getChats(meetingA.id, userB.id);
      unauthorizedChecks.push({ operation: 'getChats', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'getChats', blocked: err.statusCode === 403 });
    }

    try {
      await meetingService.saveChat({ meeting_id: meetingA.id, user_id: userB.id, message: 'Malicious chat' });
      unauthorizedChecks.push({ operation: 'saveChat', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'saveChat', blocked: err.statusCode === 403 });
    }

    try {
      await meetingService.getParticipants(meetingA.id, userB.id);
      unauthorizedChecks.push({ operation: 'getParticipants', blocked: false });
    } catch (err) {
      unauthorizedChecks.push({ operation: 'getParticipants', blocked: err.statusCode === 403 });
    }

    const allBlocked = unauthorizedChecks.every(c => c.blocked === true);
    recordResult(
      'Test 3 — Unauthorized user',
      allBlocked,
      `All 7 endpoints blocked with 403: ${unauthorizedChecks.map(c => `${c.operation}: ${c.blocked ? '403' : 'ALLOWED'}`).join(', ')}`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4 — Processing service unavailable
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 4: Processing service unavailable ---');

    meetingC = await meetingService.createMeeting({
      team_id: teamA.id,
      title: 'Meeting C — Service Down Test',
      description: 'Testing failure handling',
      sprint_name: 'Sprint 1',
      meeting_type: 'daily_scrum',
      date: '2026-09-27',
      start_time: '11:00',
      end_time: '11:30',
      timezone: 'UTC',
      duration_minutes: 30,
      agenda: ['Failure handling'],
      userId: userA.id,
    });

    const rawPathC = storageService.getRawPath(meetingC.id);
    const contentC = `[00:00:01] Sarthak Talaviya: Testing failure handling when service is down.`;

    // Store raw transcript
    await meetingRepository.saveTranscript({
      meeting_id: meetingC.id,
      content: contentC,
      transcript_path: rawPathC,
      transcript_name: 'conversation.txt',
      transcript_size: Buffer.byteLength(contentC, 'utf8'),
      status: 'raw_stored',
      storage_provider: 'local',
      storage_bucket: env.supabaseBucket,
      storage_path: rawPathC,
      raw_transcript_path: rawPathC,
    });

    // Temporarily point to invalid URL
    const originalUrl = env.transcriptProcessingServiceUrl;
    env.transcriptProcessingServiceUrl = 'http://127.0.0.1:9998'; // Dead port

    let failedAsExpected = false;
    try {
      await transcriptService.triggerPreprocessing(meetingC.id, contentC, rawPathC);
    } catch (err) {
      failedAsExpected = true;
    }

    const failedDbRecord = await meetingRepository.getTranscript(meetingC.id);
    const test4Passed =
      failedAsExpected &&
      failedDbRecord.status === 'failed' &&
      failedDbRecord.error != null &&
      failedDbRecord.content === contentC &&
      failedDbRecord.raw_transcript_path === rawPathC;

    recordResult(
      'Test 4 — Processing service unavailable',
      test4Passed,
      `status=${failedDbRecord.status}, error="${failedDbRecord.error}", raw_content_preserved=${Boolean(failedDbRecord.content)}`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5 — Retry preprocessing
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 5: Retry preprocessing ---');

    // Restore valid URL
    env.transcriptProcessingServiceUrl = originalUrl;

    // Retry preprocessing
    const retryResult = await transcriptService.retryPreprocessing(meetingC.id);

    const retriedDbRecord = await meetingRepository.getTranscript(meetingC.id);
    const { rows: retryCountRows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM meeting_transcripts WHERE meeting_id = $1',
      [meetingC.id]
    );

    const test5Passed =
      retriedDbRecord.status === 'ready_for_ai' &&
      retriedDbRecord.cleaned_transcript_path != null &&
      retriedDbRecord.raw_transcript_path === rawPathC &&
      retryCountRows[0].count === 1;

    recordResult(
      'Test 5 — Retry',
      test5Passed,
      `status=${retriedDbRecord.status}, cleaned_path=${retriedDbRecord.cleaned_transcript_path}, rows_count=${retryCountRows[0].count}`
    );

  } catch (err) {
    console.error('Fatal error during test suite:', err);
  } finally {
    // ── Cleanup Test Data ──
    try {
      if (meetingA?.id) await pool.query('DELETE FROM meetings WHERE id = $1', [meetingA.id]);
      if (meetingC?.id) await pool.query('DELETE FROM meetings WHERE id = $1', [meetingC.id]);
      if (teamA?.id) await pool.query('DELETE FROM teams WHERE id = $1', [teamA.id]);
      if (teamB?.id) await pool.query('DELETE FROM teams WHERE id = $1', [teamB.id]);
      if (userA?.id) await pool.query('DELETE FROM users WHERE id = $1', [userA.id]);
      if (userB?.id) await pool.query('DELETE FROM users WHERE id = $1', [userB.id]);
      console.log('\n🧹 Test cleanup completed.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr.message);
    }
    await pool.end();
  }

  console.log('\n============================================================');
  console.log('📊 TEST SUITE SUMMARY:');
  results.forEach(r => {
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.testName}: ${r.passed ? 'PASS' : 'FAIL'}`);
  });
  console.log('============================================================\n');

  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

runSuite();
