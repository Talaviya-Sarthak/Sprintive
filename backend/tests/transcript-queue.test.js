import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRedisUrl, getRedisConfig } from '../src/config/redis.js';
import { GroqRateLimitError, processTranscriptJob } from '../src/services/transcript/transcript-job.processor.js';
import { UnrecoverableError } from 'bullmq';

test('Redis Configuration & Security', async (t) => {
  await t.test('sanitizeRedisUrl masks passwords in connection strings', () => {
    const raw = 'rediss://default:supersecretpassword123@sprintive-queue.upstash.io:6379';
    const sanitized = sanitizeRedisUrl(raw);
    assert.equal(sanitized, 'rediss://default:****@sprintive-queue.upstash.io:6379');
    assert.ok(!sanitized.includes('supersecretpassword123'));
  });

  await t.test('sanitizeRedisUrl handles missing or invalid URLs safely', () => {
    assert.equal(sanitizeRedisUrl(''), '<not configured>');
    assert.equal(sanitizeRedisUrl(null), '<not configured>');
    assert.equal(sanitizeRedisUrl('not-a-valid-url'), '<invalid url>');
  });

  await t.test('getRedisConfig enables TLS for rediss:// URLs', () => {
    const config = getRedisConfig('rediss://default:pass@host:6379');
    assert.equal(config.isTls, true);
    assert.equal(config.options.maxRetriesPerRequest, null);
    assert.equal(config.options.enableReadyCheck, false);
    assert.ok(config.options.tls);
  });

  await t.test('getRedisConfig throws error if connection URL is empty', () => {
    assert.throws(
      () => getRedisConfig(''),
      /REDIS_URL is required/
    );
  });
});

test('Groq Rate Limit Detection & Error Handling', async (t) => {
  await t.test('GroqRateLimitError holds custom message and retry duration', () => {
    const err = new GroqRateLimitError('Rate limit exceeded', 25);
    assert.equal(err.name, 'GroqRateLimitError');
    assert.equal(err.retryAfterSeconds, 25);
    assert.ok(err.message.includes('Rate limit exceeded'));
  });
});

test('Transcript Job Processor Payload Validation', async (t) => {
  await t.test('throws UnrecoverableError if meetingId is missing', async () => {
    const mockJob = {
      id: 'job-1',
      data: { meetingId: null },
      attemptsMade: 0,
      updateProgress: async () => {},
    };

    await assert.rejects(
      () => processTranscriptJob(mockJob),
      (err) => {
        assert.ok(err instanceof UnrecoverableError);
        assert.match(err.message, /missing meetingId/);
        return true;
      }
    );
  });
});
