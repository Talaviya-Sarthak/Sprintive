/**
 * Transcript Formatter — converts raw STT segments into a dialogue-based transcript.
 *
 * Input:  [{ speakerName, text, start, end }, ...]  (sorted by start time)
 * Output: "SpeakerName: spoken text\n\nSpeakerName2: spoken text\n\n..."
 *
 * Rules:
 * - Each segment becomes a separate dialogue line.
 * - Adjacent segments from the same speaker are merged when the gap < threshold.
 * - Speaker names only (no UUIDs, no timestamps in output).
 * - Raw text preserved exactly (no summarization, correction, or translation).
 */

const MERGE_GAP_THRESHOLD = 2.0; // seconds — merge adjacent segments from same speaker if gap < this

/**
 * Format an array of STT segments into a dialogue transcript string.
 *
 * @param {Array<{speakerName: string, text: string, start: number, end: number}>} segments
 * @returns {string} Formatted dialogue transcript
 */
export function formatDialogue(segments) {
  if (!segments || segments.length === 0) {
    return '';
  }

  // Merge adjacent segments from the same speaker
  const merged = mergeSegments(segments);

  // Build dialogue lines
  const lines = merged.map(seg => `${seg.speakerName}: ${seg.text}`);

  return lines.join('\n\n');
}

/**
 * Merge adjacent segments from the same speaker when the time gap is small.
 *
 * @param {Array} segments - Sorted by start time
 * @returns {Array} Merged segments
 */
function mergeSegments(segments) {
  if (segments.length === 0) return [];

  const result = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const gap = next.start - current.end;
    const sameSpeaker = next.speakerName === current.speakerName;

    if (sameSpeaker && gap < MERGE_GAP_THRESHOLD && gap >= 0) {
      // Merge: combine text, extend end time
      current = {
        ...current,
        text: `${current.text} ${next.text}`,
        end: next.end,
      };
    } else {
      // Different speaker or too large a gap — push current and start new
      result.push(current);
      current = { ...next };
    }
  }
  result.push(current);

  return result;
}

/**
 * Generate the final conversation.txt content.
 * @param {Array} segments - Merged/sorted segments
 * @returns {string} The full file content
 */
export function generateConversationFile(segments) {
  const dialogue = formatDialogue(segments);
  return dialogue || 'No dialogue was captured for this meeting.';
}
