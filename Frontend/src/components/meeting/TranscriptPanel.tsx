import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMeetingStore, type TranscriptSegment } from '../../store/meetingStore';

interface TranscriptPanelProps {
  sttStatus?: 'not_started' | 'active' | 'finalizing' | 'completed' | 'failed';
}

export default function TranscriptPanel({ sttStatus }: TranscriptPanelProps) {
  const { transcriptSegments, liveCaption } = useMeetingStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptSegments, liveCaption]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-3 space-y-2">
      {transcriptSegments.length === 0 && !liveCaption && (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#f4f4f5]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-[#f4f4f5]">Live Transcript</p>
          <p className="text-[11px] text-[#71717a]">
            Speech will appear here in real-time as participants speak.
          </p>
        </div>
      )}

      {transcriptSegments.map((seg, i) => (
        <Segment key={i} segment={seg} />
      ))}

      {liveCaption && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-l-2 border-[#8B5CF6] pl-3 py-1"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono text-[#71717a] tabular-nums shrink-0">
              {formatTime(liveCaption.start)}
            </span>
            <span className="text-[10px] font-semibold text-[#8B5CF6] shrink-0">
              {liveCaption.speakerName}
            </span>
            <span className="text-[9px] text-[#8B5CF6]/60 uppercase tracking-wider">live</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed ml-[52px] italic">
            {liveCaption.text}
            <span className="inline-block w-0.5 h-3.5 bg-[#8B5CF6] ml-0.5 animate-pulse align-middle" />
          </p>
        </motion.div>
      )}

      {/* Finalization status indicator */}
      {sttStatus === 'finalizing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-amber-400">Finalizing transcript...</span>
        </motion.div>
      )}

      {sttStatus === 'completed' && transcriptSegments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20"
        >
          <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-[10px] font-semibold text-green-400">Transcript saved</span>
        </motion.div>
      )}

      {sttStatus === 'failed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[10px] font-semibold text-red-400">Transcript save failed</span>
        </motion.div>
      )}
    </div>
  );
}

function Segment({ segment }: { segment: TranscriptSegment }) {
  return (
    <div className="group">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-mono text-[#71717a] tabular-nums shrink-0">
          {formatTime(segment.start)}
        </span>
        <span className="text-[10px] font-semibold text-[#8B5CF6] shrink-0">
          {segment.speakerName}
        </span>
      </div>
      <p className="text-xs text-[#a1a1aa] leading-relaxed ml-[52px]">
        {segment.text}
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
