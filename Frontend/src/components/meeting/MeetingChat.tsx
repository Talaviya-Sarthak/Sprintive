import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../../types';

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (msg: string) => void;
  onOpen: () => void;
}

function groupMessages(messages: ChatMessage[]) {
  const groups: ChatMessage[][] = [];
  messages.forEach((msg) => {
    const last = groups[groups.length - 1];
    if (last && last[0].user_id === msg.user_id) {
      last.push(msg);
    } else {
      groups.push([msg]);
    }
  });
  return groups;
}

export default function MeetingChat({ messages, currentUserId, onSend, onOpen }: Props) {
  const [input, setInput]     = useState('');
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { onOpen(); }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const groups = groupMessages(messages);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <AnimatePresence initial={false}>
          {groups.map((group, gi) => {
            const isMe = group[0].user_id === currentUserId;
            const initials = group[0].full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <motion.div
                key={gi}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-1">
                    {group[0].avatar_url
                      ? <img src={group[0].avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                      : initials}
                  </div>
                )}
                <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                  {!isMe && <span className="text-[11px] text-[#94A3B8] font-medium px-1">{group[0].full_name}</span>}
                  {group.map((msg, mi) => (
                    <div
                      key={mi}
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#3B82F6] text-white rounded-tr-sm'
                          : 'bg-[#1a1f2e] text-[#CBD5E1] border border-white/6 rounded-tl-sm'
                      }`}
                    >
                      {msg.message}
                    </div>
                  ))}
                  <span className="text-[10px] text-[#475569] px-1">
                    {new Date(group[group.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/6">
        <div className="flex items-center gap-2 bg-[#1a1f2e] rounded-xl border border-white/8 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message..."
            className="flex-1 bg-transparent text-sm text-[#CBD5E1] placeholder-[#475569] outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-7 h-7 rounded-lg bg-[#3B82F6] disabled:opacity-30 flex items-center justify-center transition-opacity"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
