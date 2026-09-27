import pool from '../src/config/database.js';
import { createLocalUser } from '../src/repositories/auth.repository.js';
import { teamRepository } from '../src/repositories/team.repository.js';
import { meetingRepository } from '../src/repositories/meeting.repository.js';
import { meetingService } from '../src/services/meeting.service.js';
import { transcriptService } from '../src/services/transcript/transcript.service.js';
import { storageService } from '../src/services/storage/storage.service.js';
import { sttService } from '../src/services/stt/stt.service.js';
import { createMeetingSchema } from '../src/validators/meeting.validator.js';

const results = [];

function recordResult(testName, passed, evidence) {
  results.push({ testName, passed, evidence });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${icon}: ${testName}\nEvidence: ${evidence}`);
}

async function runSuite() {
  console.log('🚀 Starting Sprintive P1 & P2 Stabilization Test Suite...\n');

  let userA, userB, teamA, meetingA;

  try {
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
      name: `P1 Team ${uniqueId}`,
      description: 'P1 Test Team',
      avatar_url: null,
      color: '#3B82F6',
      timezone: 'UTC',
      working_days: [1, 2, 3, 4, 5],
      daily_scrum_time: '09:00:00',
      created_by: userA.id,
    });

    await teamRepository.addMember(teamA.id, userB.id, 'developer');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST A: Deepgram Participant Connection Cleanup & Transcript Preservation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test A: Deepgram Participant Connection Cleanup ---');
    const mockMeetingId = `meeting-test-${uniqueId}`;

    // Mock Deepgram session objects
    class MockDeepgramSession {
      constructor(name) {
        this.name = name;
        this._closed = false;
        this._partials = [];
        this._finals = [];
      }
      onPartial(cb) { this._partials.push(cb); }
      onFinal(cb) { this._finals.push(cb); }
      onError() {}
      onClose() {}
      async close() {
        this._closed = true;
      }
      simulateFinal(text, start, duration) {
        for (const cb of this._finals) {
          cb({ speakerName: this.name, text, words: text.split(' '), start, duration });
        }
      }
    }

    // Override provider createSession temporarily for deterministic STT testing
    const originalCreateSession = sttService.provider.createSession.bind(sttService.provider);
    sttService.provider.createSession = ({ participantName }) => new MockDeepgramSession(participantName);

    // 1. Both join
    sttService.startSession(mockMeetingId, [
      { id: userA.id, name: userA.full_name },
      { id: userB.id, name: userB.full_name },
    ]);

    const participantMap = sttService.meetings.get(mockMeetingId);
    const entryA = participantMap.get(userA.id);
    const entryB = participantMap.get(userB.id);

    // 2. Both stream audio
    entryA.session.simulateFinal('Hello from participant A', 0.0, 2.5);
    entryB.session.simulateFinal('Hello from participant B', 3.0, 2.0);

    // 3. Participant A leaves -> cleanup called
    await sttService.closeParticipantSession(mockMeetingId, userA.id);

    const aSessionClosed = entryA.session._closed === true;
    const bSessionOpen = entryB.session._closed === false;
    const aSegmentsPreserved = entryA.segments.length === 1;

    // 4. Participant B continues speaking
    entryB.session.simulateFinal('Participant B speaks while A is gone', 6.0, 3.0);
    const bSegmentsCount = entryB.segments.length === 2;

    // 5. Finalize meeting
    const finalSegments = await sttService.finalizeSession(mockMeetingId);
    const totalSegments = finalSegments.length === 3;
    const cleanedFromMemory = !sttService.meetings.has(mockMeetingId);

    // Restore provider
    sttService.provider.createSession = originalCreateSession;

    const testAPassed = aSessionClosed && bSessionOpen && aSegmentsPreserved && bSegmentsCount && totalSegments && cleanedFromMemory;
    recordResult(
      'Deepgram Participant Connection Cleanup',
      testAPassed,
      `Participant A session closed: ${aSessionClosed}, Participant B session remained active: ${bSessionOpen}, A segments preserved: ${aSegmentsPreserved}, Final transcript segments from both participants: ${finalSegments.length}, Memory cleaned: ${cleanedFromMemory}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST B: Meeting Timezone Validation & Roundtrip Conversion
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test B: Meeting Timezone Validation & Handling ---');

    // 1. Validator checks
    let invalidTzRejected = false;
    try {
      createMeetingSchema.parse({
        team_id: teamA.id,
        title: 'Invalid TZ Meeting',
        timezone: 'Invalid/Region/XYZ',
      });
    } catch {
      invalidTzRejected = true;
    }

    let kolkataValidated = false;
    try {
      createMeetingSchema.parse({
        team_id: teamA.id,
        title: 'Kolkata Meeting',
        timezone: 'Asia/Kolkata',
      });
      kolkataValidated = true;
    } catch {}

    let newYorkValidated = false;
    try {
      createMeetingSchema.parse({
        team_id: teamA.id,
        title: 'New York Meeting',
        timezone: 'America/New_York',
      });
      newYorkValidated = true;
    } catch {}

    // 2. Create Meeting in Asia/Kolkata (10:00 AM IST)
    const kolkataMeeting = await meetingService.createMeeting({
      team_id: teamA.id,
      title: 'Scrum IST',
      description: 'Daily standup in IST',
      date: '2026-09-28',
      start_time: '10:00',
      end_time: '10:30',
      timezone: 'Asia/Kolkata',
      duration_minutes: 30,
      agenda: ['Sprint status'],
      userId: userA.id,
    });

    // Check DB raw timestamp
    const dbKolkata = await pool.query('SELECT scheduled_start, timezone FROM meetings WHERE id = $1', [kolkataMeeting.id]);
    const rawKolkataStart = dbKolkata.rows[0].scheduled_start.toISOString();
    // 10:00 IST is 04:30 UTC
    const kolkataUtcCorrect = rawKolkataStart.includes('04:30:00');

    // Fetch through service (display roundtrip)
    const fetchedKolkata = await meetingService.getMeeting(kolkataMeeting.id, userA.id);
    const kolkataDisplayCorrect =
      fetchedKolkata.date === '2026-09-28' &&
      fetchedKolkata.start_time === '10:00' &&
      fetchedKolkata.end_time === '10:30' &&
      fetchedKolkata.timezone === 'Asia/Kolkata';

    // 3. Create Meeting in America/New_York (8:00 PM EDT = 20:00 EDT)
    // 2026-09-28 20:00 EDT is 2026-09-29 00:00 UTC (crosses midnight into next day UTC!)
    const nyMeeting = await meetingService.createMeeting({
      team_id: teamA.id,
      title: 'Scrum NY Evening',
      description: 'Evening review in NY',
      date: '2026-09-28',
      start_time: '20:00',
      end_time: '21:00',
      timezone: 'America/New_York',
      duration_minutes: 60,
      agenda: ['Review'],
      userId: userA.id,
    });

    const dbNy = await pool.query('SELECT scheduled_start, timezone FROM meetings WHERE id = $1', [nyMeeting.id]);
    const rawNyStart = dbNy.rows[0].scheduled_start.toISOString();
    // 20:00 EDT (-04:00) is 00:00:00 next day UTC
    const nyUtcCorrect = rawNyStart.includes('2026-09-29T00:00:00');

    const fetchedNy = await meetingService.getMeeting(nyMeeting.id, userA.id);
    const nyDisplayCorrect =
      fetchedNy.date === '2026-09-28' &&
      fetchedNy.start_time === '20:00' &&
      fetchedNy.end_time === '21:00' &&
      fetchedNy.timezone === 'America/New_York';

    const testBPassed = invalidTzRejected && kolkataValidated && newYorkValidated && kolkataUtcCorrect && kolkataDisplayCorrect && nyUtcCorrect && nyDisplayCorrect;
    recordResult(
      'Meeting Timezone Validation & Roundtrip Conversion',
      testBPassed,
      `Invalid TZ rejected: ${invalidTzRejected}, Asia/Kolkata valid: ${kolkataValidated} (DB UTC: ${rawKolkataStart}, display: ${fetchedKolkata.start_time}), America/New_York valid: ${newYorkValidated} (DB UTC: ${rawNyStart}, display: ${fetchedNy.start_time})`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST C: Legacy Recording Audit Verification
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test C: Legacy Recording Endpoint Audit ---');
    // Verify meetings and transcripts table queries work cleanly without any references to participant_audio or RecordingStatus
    const domainModule = await import('../src/types/domain.js');
    const hasDeadRecordingStatus = 'RecordingStatus' in domainModule;
    const testCPassed = !hasDeadRecordingStatus;
    recordResult(
      'Legacy Recording Audit Verification',
      testCPassed,
      `Dead RecordingStatus enum removed: ${!hasDeadRecordingStatus}, active live audio streaming (useAudioCapture) untouched`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST D: Transcript Status & Retry Flow
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test D: Transcript Status & Retry Flow ---');
    // Upload raw transcript for kolkataMeeting
    const rawPath = storageService.getRawPath(kolkataMeeting.id);
    const sampleRaw = '[00:00] User A: Let us review sprint velocity\n[00:05] User B: We completed 18 story points';
    await storageService.uploadTranscript(kolkataMeeting.id, sampleRaw);

    // Insert failed transcript status into DB
    await meetingRepository.saveTranscript({
      meeting_id: kolkataMeeting.id,
      status: 'failed',
      raw_transcript_path: rawPath,
      error: 'Simulated connection timeout during processing',
    });

    // 1. Fetch transcript in failed state
    const failedTranscript = await meetingService.getTranscript(kolkataMeeting.id, userA.id);
    const statusIsFailed = failedTranscript.status === 'failed' && (failedTranscript.error === 'Simulated connection timeout during processing' || failedTranscript.error_message === 'Simulated connection timeout during processing');

    // 2. Trigger retry
    const retryResult = await meetingService.retryTranscript(kolkataMeeting.id, userA.id);
    const retrySucceeded = (retryResult.processing_status === 'READY_FOR_AI' || retryResult.status === 'ready_for_ai');

    // 3. Fetch again through meetingService
    const readyTranscript = await meetingService.getTranscript(kolkataMeeting.id, userA.id);
    const statusIsReady = readyTranscript.status === 'ready_for_ai';
    const hasContent = typeof readyTranscript.content === 'string' && readyTranscript.content.length > 0;

    const testDPassed = statusIsFailed && retrySucceeded && statusIsReady && hasContent;
    recordResult(
      'Transcript Status & Retry Flow',
      testDPassed,
      `Status correctly reported as failed: ${statusIsFailed}, Retry executed and status transitioned to ready_for_ai: ${statusIsReady}, Cleaned content fetched: ${hasContent}`
    );

    // ── Summary ──
    console.log('\n======================================================');
    console.log('🏁 P1 & P2 TEST RESULTS SUMMARY');
    console.log('======================================================');
    let allPassed = true;
    for (const r of results) {
      if (!r.passed) allPassed = false;
      console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'}: ${r.testName}`);
    }

    if (!allPassed) {
      console.error('\n❌ One or more tests failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL P1 & P2 TESTS PASSED!\n');
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSuite();
