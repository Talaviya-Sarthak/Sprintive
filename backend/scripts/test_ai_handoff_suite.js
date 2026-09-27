import pool from '../src/config/database.js';
import { createLocalUser } from '../src/repositories/auth.repository.js';
import { teamRepository } from '../src/repositories/team.repository.js';
import { meetingRepository } from '../src/repositories/meeting.repository.js';
import { meetingService } from '../src/services/meeting.service.js';
import { storageService } from '../src/services/storage/storage.service.js';
import { aiHandoffService } from '../src/services/ai/ai-handoff.service.js';

const results = [];

function recordResult(testNumber, testName, passed, evidence) {
  results.push({ testNumber, testName, passed, evidence });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${icon} [Test ${testNumber}]: ${testName}\nEvidence: ${evidence}`);
}

async function runHandoffSuite() {
  console.log('🚀 Starting AI Handoff (READY_FOR_AI → Clean Transcript → AI Service) Test Suite...\n');

  let userA, userUnauthorized, teamA, meetingA;

  try {
    const uniqueId = Date.now().toString().slice(-6);
    userA = await createLocalUser({
      fullName: `AI Test User A ${uniqueId}`,
      email: `ai.user.a.${uniqueId}@sprintive.test`,
      passwordHash: 'dummy_hash',
    });
    userUnauthorized = await createLocalUser({
      fullName: `AI Test User B ${uniqueId}`,
      email: `ai.user.b.${uniqueId}@sprintive.test`,
      passwordHash: 'dummy_hash',
    });

    teamA = await teamRepository.createWithOwner({
      name: `AI Handoff Team ${uniqueId}`,
      description: 'Team for AI handoff verification',
      avatar_url: null,
      color: '#10B981',
      timezone: 'UTC',
      working_days: [1, 2, 3, 4, 5],
      daily_scrum_time: '10:00:00',
      created_by: userA.id,
    });

    meetingA = await meetingRepository.create({
      team_id: teamA.id,
      title: `Sprint Planning Meeting ${uniqueId}`,
      description: 'AI handoff verification meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });

    const cleanedPath = storageService.getCleanedPath(meetingA.id);
    const rawPath = storageService.getRawPath(meetingA.id);

    const rawContent = '[00:00] Alice: Um, so, like, we need to deploy v1.2 today.\n[00:05] Bob: Yeah, uh, Bob here, I will fix the bug.';
    const cleanContent = '[00:00] Alice: We need to deploy version 1.2 today.\n[00:05] Bob: I will fix the bug.';

    // Upload both raw and cleaned transcripts to Supabase Storage
    await storageService.provider.upload(rawPath, rawContent, 'text/plain; charset=utf-8');
    await storageService.provider.upload(cleanedPath, cleanContent, 'text/plain; charset=utf-8');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1: READY_FOR_AI requirement check
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 1: Status must be READY_FOR_AI ---');
    // Save transcript as 'processing' initially
    await meetingRepository.saveTranscript({
      meeting_id: meetingA.id,
      status: 'processing',
      raw_transcript_path: rawPath,
      cleaned_transcript_path: cleanedPath,
    });

    let notReadyError = null;
    try {
      await aiHandoffService.handoffCleanTranscript(meetingA.id);
    } catch (err) {
      notReadyError = err;
    }

    const test1Passed = notReadyError && notReadyError.code === 'TRANSCRIPT_NOT_READY';
    recordResult(
      1,
      'Transcript status requirement (READY_FOR_AI)',
      test1Passed,
      `Rejected non-ready transcript with code: ${notReadyError?.code}, message: "${notReadyError?.message}"`
    );

    // Now update DB to 'ready_for_ai'
    await meetingRepository.saveTranscript({
      meeting_id: meetingA.id,
      status: 'ready_for_ai',
      raw_transcript_path: rawPath,
      cleaned_transcript_path: cleanedPath,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2: Successful retrieval from Supabase storage
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 2: Clean transcript retrieval from storage ---');
    const downloadedText = await storageService.getTranscript(cleanedPath);
    const test2Passed = typeof downloadedText === 'string' && downloadedText.includes('We need to deploy version 1.2 today.');
    recordResult(
      2,
      'Successful retrieval of clean transcript from Supabase',
      test2Passed,
      `Retrieved ${downloadedText.length} bytes from canonical path: ${cleanedPath}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3: Correct transcript sent (Cleaned vs Raw)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 3: Verify clean transcript, NOT raw, is sent ---');
    // Track what is sent by temporarily intercepting fetch or verifying payload contents
    const originalFetch = globalThis.fetch;
    let sentPayload = null;
    globalThis.fetch = async (url, options) => {
      if (url.includes('/api/v1/meetings/analyze')) {
        sentPayload = JSON.parse(options.body);
      }
      return originalFetch(url, options);
    };

    await aiHandoffService.handoffCleanTranscript(meetingA.id);
    globalThis.fetch = originalFetch;

    const containsClean = sentPayload && sentPayload.transcript.includes('version 1.2');
    const doesNotContainRaw = sentPayload && !sentPayload.transcript.includes('Um, so, like');
    const test3Passed = containsClean && doesNotContainRaw;
    recordResult(
      3,
      'Cleaned transcript sent (No raw transcript or audio)',
      test3Passed,
      `Payload contained cleaned normalized text: ${containsClean}, contained raw filler words: ${!doesNotContainRaw}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: Empty transcript validation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 4: Empty transcript validation ---');
    const emptyMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'Empty Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    const emptyCleanedPath = storageService.getCleanedPath(emptyMeeting.id);
    await storageService.provider.upload(emptyCleanedPath, '   \n\t  ', 'text/plain; charset=utf-8');
    await meetingRepository.saveTranscript({
      meeting_id: emptyMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: emptyCleanedPath,
    });

    let emptyError = null;
    try {
      await aiHandoffService.handoffCleanTranscript(emptyMeeting.id);
    } catch (err) {
      emptyError = err;
    }

    const test4Passed = emptyError && emptyError.code === 'CLEAN_TRANSCRIPT_EMPTY';
    recordResult(
      4,
      'Empty transcript validation (CLEAN_TRANSCRIPT_EMPTY)',
      test4Passed,
      `Blocked empty transcript with code: ${emptyError?.code}, message: "${emptyError?.message}"`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: Missing cleaned path validation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 5: Missing cleaned path validation ---');
    const noPathMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'No Path Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    await meetingRepository.saveTranscript({
      meeting_id: noPathMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: null,
      storage_path: null,
    });

    let missingPathError = null;
    try {
      await aiHandoffService.handoffCleanTranscript(noPathMeeting.id);
    } catch (err) {
      missingPathError = err;
    }

    const test5Passed = missingPathError && missingPathError.code === 'CLEAN_TRANSCRIPT_PATH_MISSING';
    recordResult(
      5,
      'Missing storage path validation (CLEAN_TRANSCRIPT_PATH_MISSING)',
      test5Passed,
      `Blocked missing path with code: ${missingPathError?.code}, message: "${missingPathError?.message}"`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6: Storage failure handling
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 6: Storage failure handling ---');
    const corruptMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'Corrupt Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    await meetingRepository.saveTranscript({
      meeting_id: corruptMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: `meetings/${corruptMeeting.id}/processed/non_existent_file.txt`,
    });

    let storageError = null;
    try {
      await aiHandoffService.handoffCleanTranscript(corruptMeeting.id);
    } catch (err) {
      storageError = err;
    }

    const test6Passed = storageError && storageError.code === 'TRANSCRIPT_RETRIEVAL_FAILED';
    recordResult(
      6,
      'Storage retrieval failure handling (TRANSCRIPT_RETRIEVAL_FAILED)',
      test6Passed,
      `Handled missing/corrupt storage object with code: ${storageError?.code}, message: "${storageError?.message}"`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7: AI service success & acknowledgement
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 7: AI service success and acknowledgement ---');
    const successMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'Success Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    const successCleanedPath = storageService.getCleanedPath(successMeeting.id);
    await storageService.provider.upload(successCleanedPath, '[00:00] Team: All features tested and confirmed.', 'text/plain; charset=utf-8');
    await meetingRepository.saveTranscript({
      meeting_id: successMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: successCleanedPath,
    });

    const aiResponse = await aiHandoffService.handoffCleanTranscript(successMeeting.id);
    const test7Passed = aiResponse && aiResponse.accepted === true && aiResponse.status === 'RECEIVED' && aiResponse.meeting_id === successMeeting.id;
    recordResult(
      7,
      'AI service communication success',
      test7Passed,
      `AI service response: accepted=${aiResponse?.accepted}, status=${aiResponse?.status}, meeting_id=${aiResponse?.meeting_id}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8: AI service unavailable (503 / connection failure)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 8: AI service unavailable handling ---');
    const unavailMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'Unavailable AI Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    const unavailCleanPath = storageService.getCleanedPath(unavailMeeting.id);
    await storageService.provider.upload(unavailCleanPath, '[00:00] Testing unavail.', 'text/plain; charset=utf-8');
    await meetingRepository.saveTranscript({
      meeting_id: unavailMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: unavailCleanPath,
    });

    const oldUrl = aiHandoffService.aiServiceUrl;
    aiHandoffService.aiServiceUrl = 'http://127.0.0.1:59999'; // Non-existent port

    let unavailableError = null;
    try {
      await aiHandoffService.handoffCleanTranscript(unavailMeeting.id);
    } catch (err) {
      unavailableError = err;
    } finally {
      aiHandoffService.aiServiceUrl = oldUrl;
    }

    const test8Passed = unavailableError && unavailableError.code === 'AI_SERVICE_UNAVAILABLE';
    recordResult(
      8,
      'AI service unavailable handling (AI_SERVICE_UNAVAILABLE)',
      test8Passed,
      `Handled unavailable service with code: ${unavailableError?.code}, message: "${unavailableError?.message}"`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 9: AI service timeout handling
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 9: AI service timeout handling ---');
    const timeoutMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'Timeout AI Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    const timeoutCleanPath = storageService.getCleanedPath(timeoutMeeting.id);
    await storageService.provider.upload(timeoutCleanPath, '[00:00] Testing timeout.', 'text/plain; charset=utf-8');
    await meetingRepository.saveTranscript({
      meeting_id: timeoutMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: timeoutCleanPath,
    });

    const oldTimeout = aiHandoffService.timeoutMs;
    aiHandoffService.timeoutMs = 1; // 1 millisecond timeout to guarantee AbortController timeout

    let timeoutError = null;
    try {
      await aiHandoffService.handoffCleanTranscript(timeoutMeeting.id);
    } catch (err) {
      timeoutError = err;
    } finally {
      aiHandoffService.timeoutMs = oldTimeout;
    }

    const test9Passed = timeoutError && timeoutError.code === 'AI_SERVICE_TIMEOUT';
    recordResult(
      9,
      'AI service request timeout handling (AI_SERVICE_TIMEOUT)',
      test9Passed,
      `Timed out after 1ms with code: ${timeoutError?.code}, message: "${timeoutError?.message}"`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 10: Idempotency (Duplicate trigger)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 10: Duplicate trigger idempotency ---');
    const duplicateMeeting = await meetingRepository.create({
      team_id: teamA.id,
      title: 'Duplicate Test Meeting',
      host_id: userA.id,
      duration_minutes: 45,
    });
    const dupCleanPath = storageService.getCleanedPath(duplicateMeeting.id);
    await storageService.provider.upload(dupCleanPath, '[00:00] Testing idempotency.', 'text/plain; charset=utf-8');
    await meetingRepository.saveTranscript({
      meeting_id: duplicateMeeting.id,
      status: 'ready_for_ai',
      cleaned_transcript_path: dupCleanPath,
    });

    const firstCall = await aiHandoffService.handoffCleanTranscript(duplicateMeeting.id);
    const secondCall = await aiHandoffService.handoffCleanTranscript(duplicateMeeting.id);

    const test10Passed = firstCall.accepted === true && secondCall.accepted === true && secondCall.idempotent === true;
    recordResult(
      10,
      'Duplicate trigger idempotency',
      test10Passed,
      `First call accepted: ${firstCall.accepted}, Second call idempotent: ${secondCall.idempotent}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 11: Authorization (IDOR protection)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 11: Authorization & IDOR protection ---');
    let unauthorizedError = null;
    try {
      await meetingService.triggerAiHandoff(meetingA.id, userUnauthorized.id);
    } catch (err) {
      unauthorizedError = err;
    }

    const test11Passed = unauthorizedError && unauthorizedError.statusCode === 403;
    recordResult(
      11,
      'Authorization IDOR security guard',
      test11Passed,
      `Blocked unauthorized user with status: ${unauthorizedError?.statusCode}, message: "${unauthorizedError?.message}"`
    );

    // ── Summary ──
    console.log('\n======================================================');
    console.log('🏁 AI HANDOFF TEST RESULTS SUMMARY');
    console.log('======================================================');
    let allPassed = true;
    for (const r of results) {
      if (!r.passed) allPassed = false;
      console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'} [Test ${r.testNumber}]: ${r.testName}`);
    }

    if (!allPassed) {
      console.error('\n❌ One or more AI handoff tests failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL 11 AI HANDOFF TESTS PASSED!\n');
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runHandoffSuite();
