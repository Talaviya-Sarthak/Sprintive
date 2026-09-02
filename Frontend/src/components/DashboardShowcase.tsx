import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { useTheme } from '../context/ThemeContext';

type TabName = 'Kanban Board' | 'Meeting Room' | 'Meeting Summary' | 'Sprint Analytics' | 'Calendar' | 'Team Chat';

const tabs: TabName[] = ['Kanban Board', 'Meeting Room', 'Meeting Summary', 'Sprint Analytics', 'Calendar', 'Team Chat'];

interface KanbanTask { t: string; p: 'High' | 'Med' | 'Low'; }
interface KanbanCol { title: string; color: string; tasks: KanbanTask[]; }

function KanbanMockup({ isLight }: { isLight: boolean }) {
  const cols: KanbanCol[] = [
    { title: 'Backlog', color: '#A1A1AA', tasks: [{ t: 'User Auth', p: 'High' }, { t: 'API Design', p: 'Med' }, { t: 'DB Schema', p: 'Low' }] },
    { title: 'In Progress', color: '#F97316', tasks: [{ t: 'Dashboard UI', p: 'High' }, { t: 'Meeting API', p: 'High' }] },
    { title: 'Review', color: '#F59E0B', tasks: [{ t: 'Login Flow', p: 'Med' }] },
    { title: 'Done', color: '#10B981', tasks: [{ t: 'Setup CI/CD', p: 'Low' }, { t: 'DB Migrations', p: 'Med' }] },
  ];
  const pColor: Record<'High' | 'Med' | 'Low', string> = { High: '#EF4444', Med: '#F59E0B', Low: '#10B981' };
  const colBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const colBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const countBg = isLight ? 'bg-white' : 'bg-[#111111]';
  const taskBg = isLight ? 'bg-white' : 'bg-[#111111]';
  const taskBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const taskText = isLight ? 'text-[#0f172a]' : 'text-white';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {cols.map(col => (
        <div key={col.title} className={`${colBg} border ${colBorder} rounded-[4px] p-3 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center gap-1.5 mb-3 pb-2 border-b ${colBorder}`}>
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: col.color }}>{col.title}</span>
              <span className={`ml-auto text-[9px] font-mono font-bold text-[#A1A1AA] ${countBg} border ${colBorder} rounded-[2px] px-1.5 py-0.5`}>{col.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {col.tasks.map(task => (
                <div key={task.t} className={`${taskBg} border ${taskBorder} rounded-[3px] p-2.5 hover:border-[#F97316]/50 transition-colors`}>
                  <div className={`text-xs ${taskText} font-bold mb-2`}>{task.t}</div>
                  <span className="text-[9px] rounded-[2px] px-1.5 py-0.5 font-mono font-bold border" style={{ background: `${pColor[task.p]}15`, color: pColor[task.p], borderColor: `${pColor[task.p]}30` }}>
                    {task.p}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingMockup({ isLight }: { isLight: boolean }) {
  const names = ['Alex Chen', 'Sam Rivera', 'Jordan Lee', 'Taylor Kim', 'Morgan Wu', 'AI Assistant'];
  const cardBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const cardBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const textColor = isLight ? 'text-[#0f172a]' : 'text-white';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#10B981]/10 rounded-[4px] border border-[#10B981]/30">
        <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
        <span className={`text-xs font-bold ${textColor} uppercase tracking-tight`}>Daily Scrum — Sprint 12</span>
        <span className="ml-auto text-[10px] font-mono text-[#10B981] font-bold">● Live</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {names.map((name, i) => (
          <div
            key={name}
            className={`${cardBg} rounded-[4px] p-4 flex flex-col items-center justify-center gap-2 border relative ${i === 0 ? 'border-[#F97316]' : cardBorder}`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white bg-[#F97316] border border-black"
            >
              {name[0]}
            </div>
            <span className={`text-xs ${textColor} font-bold text-center`}>{name}</span>
            {i === 0 && (
              <div className="absolute bottom-2 right-2 flex gap-0.5 items-end h-3">
                {[4, 8, 12, 6, 9].map((h, j) => (
                  <motion.div key={j} animate={{ height: [h, 14, h] }} transition={{ duration: 0.5, repeat: Infinity, delay: j * 0.1 }}
                    className="w-0.5 bg-[#F97316] rounded-sm" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TranscriptLine { speaker: string; time: string; text: string; tag: string | null; }

function TranscriptMockup({ isLight }: { isLight: boolean }) {
  const lines: TranscriptLine[] = [
    { speaker: 'Alex', time: '09:01', text: "Yesterday I finished the authentication module. Today I'll work on the dashboard.", tag: null },
    { speaker: 'Summary', time: '09:01', text: 'Action item: Complete dashboard — Assigned to Alex', tag: '✅ Action' },
    { speaker: 'Sam', time: '09:02', text: "I'm blocked on the payment flow. Need access from the DevOps team.", tag: null },
    { speaker: 'Summary', time: '09:02', text: 'Blocker noted: Payment access — Owner: DevOps team', tag: '🚫 Blocker' },
    { speaker: 'Jordan', time: '09:03', text: 'Sprint review is on Friday. Reporting module must be done by Thursday.', tag: null },
    { speaker: 'Summary', time: '09:03', text: 'Deadline: Reporting module — Due: Thursday EOD', tag: '📅 Deadline' },
  ];
  const lineBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const lineBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const textColor = isLight ? 'text-[#475569]' : 'text-zinc-300';
  const tagBg = isLight ? 'bg-white' : 'bg-[#111111]';

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex gap-3 px-3 py-2.5 rounded-[4px] border ${line.speaker === 'Summary' ? 'bg-[#F97316]/10 border-[#F97316]/30' : `${lineBg} ${lineBorder}`}`}
        >
          <span className={`text-xs font-mono font-bold min-w-[54px] pt-px ${line.speaker === 'Summary' ? 'text-[#F97316]' : 'text-[#A1A1AA]'}`}>{line.speaker}</span>
          <span className={`flex-1 text-xs ${textColor} leading-relaxed font-mono`}>{line.text}</span>
          {line.tag && <span className={`text-[10px] font-mono font-bold ${tagBg} border border-[#F97316]/40 rounded-[2px] px-2 py-0.5 text-[#F97316] whitespace-nowrap self-start`}>{line.tag}</span>}
          <span className="text-[10px] font-mono text-[#A1A1AA] whitespace-nowrap self-start">{line.time}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsMockup({ isLight }: { isLight: boolean }) {
  const bars = [65, 80, 55, 90, 70, 85, 95];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const metrics: [string, string, string][] = [
    ['Sprint Velocity', '42 pts', '+12%'],
    ['Tasks Done', '28/35', '80%'],
    ['Meetings', '14', 'This Sprint'],
    ['AI Accuracy', '96%', 'Task Detection'],
  ];
  const cardBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const cardBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const headingColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const barBorder = isLight ? 'border-[#e2e8f0]' : 'border-black';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(([label, val, sub]) => (
          <div key={label} className={`${cardBg} border ${cardBorder} rounded-[4px] p-3`}>
            <div className="text-[9px] text-[#A1A1AA] mb-1 font-mono font-bold uppercase tracking-wider">{label}</div>
            <div className={`text-xl font-black ${headingColor} mb-1 tracking-tight`}>{val}</div>
            <div className="text-[10px] font-mono text-[#F97316] font-semibold">{sub}</div>
          </div>
        ))}
      </div>
      <div className={`${cardBg} rounded-[4px] p-4 border ${cardBorder}`}>
        <div className={`text-xs font-bold ${headingColor} uppercase tracking-tight mb-4`}>Weekly Task Completion</div>
        <div className="flex items-end gap-2 h-20">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={`w-full rounded-[2px] bg-[#F97316] border ${barBorder}`}
              />
              <span className="text-[9px] font-mono text-[#A1A1AA] font-bold">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarMockup({ isLight }: { isLight: boolean }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const meetings = [3, 8, 10, 15, 17, 22, 24, 29];
  const headingColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const btnBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const btnBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const defaultBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xs font-bold ${headingColor} uppercase tracking-wider`}>January 2026</span>
        <div className="flex gap-1.5">
          {['‹', '›'].map(c => (
            <button key={c} className={`${btnBg} border ${btnBorder} rounded-[3px] px-2 py-0.5 ${headingColor} text-xs cursor-pointer hover:border-[#F97316] transition-colors`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-mono text-[#A1A1AA] font-bold py-1">{d}</div>
        ))}
        {days.map(d => (
          <div
            key={d}
            className={`text-center text-xs py-1.5 px-1 rounded-[3px] font-mono cursor-default border ${d === 15 ? 'bg-[#F97316] text-white font-bold border-black' :
                meetings.includes(d) ? 'bg-[#F97316]/10 text-[#F97316] font-bold border-[#F97316]/30' :
                  `text-zinc-400 border-transparent ${defaultBg}`
              }`}
          >
            {d}
            {meetings.includes(d) && d !== 15 && (
              <div className="w-1 h-1 rounded-full bg-[#F97316] mx-auto mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChatMsg { user: string; msg: string; time: string; self: boolean; }

function ChatMockup({ isLight }: { isLight: boolean }) {
  const msgs: ChatMsg[] = [
    { user: 'Alex', msg: 'Just pushed the auth fix 🚀', time: '09:15', self: false },
    { user: 'Sam', msg: "Great! I'll start the review now", time: '09:16', self: false },
    { user: 'You', msg: "AI created 3 tickets from today's standup", time: '09:17', self: true },
    { user: 'Bot', msg: '✅ Sprint board updated. 3 new tasks assigned.', time: '09:17', self: false },
    { user: 'Jordan', msg: 'Can we move the sprint review to 3pm?', time: '09:20', self: false },
    { user: 'You', msg: "Sure, I'll update the calendar", time: '09:21', self: true },
  ];
  const msgBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const msgBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const textColor = isLight ? 'text-[#475569]' : 'text-zinc-300';
  const inputBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#141417]';
  const inputBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.self ? 'justify-end' : 'justify-start'} gap-2`}>
            {!m.self && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-[#F97316] shrink-0 border border-black"
              >
                {m.user[0]}
              </div>
            )}
            <div className="max-w-[70%]">
              {!m.self && <div className="text-[9px] font-mono text-[#A1A1AA] mb-0.5 font-bold">{m.user}</div>}
              <div className={`px-3 py-1.5 text-xs font-mono rounded-[3px] border ${m.self ? 'bg-[#F97316] text-white border-black font-semibold' : `${msgBg} ${textColor} ${msgBorder}`}`}>
                {m.msg}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={`flex gap-2 pt-2 border-t ${inputBorder}`}>
        <div className={`flex-1 ${inputBg} border ${inputBorder} rounded-[3px] px-3 py-2 text-xs font-mono text-[#A1A1AA]`}>Type a message…</div>
        <Button variant="orange" size="sm">Send</Button>
      </div>
    </div>
  );
}

export default function DashboardShowcase() {
  const [active, setActive] = useState<TabName>('Kanban Board');
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const headingColor = isLight ? 'text-[#0f172a]' : 'text-[#FFFFFF]';
  const inactiveTabBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#111111]';
  const inactiveTabBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const inactiveTabText = isLight ? 'text-[#475569]' : 'text-[#A1A1AA]';
  const activeTabShadow = isLight ? 'shadow-[2px_2px_0px_0px_#0f172a]' : 'shadow-[2px_2px_0px_0px_#000]';
  const frameBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#111111]';
  const frameBorder = isLight ? 'border-[#0f172a]' : 'border-black';
  const chromeBg = isLight ? 'bg-[#f1f5f9]' : 'bg-[#1A1A1E]';
  const viewportBg = isLight ? 'bg-white' : 'bg-[#0B0B0D]';
  const urlBarBg = isLight ? 'bg-white' : 'bg-[#0B0B0D]';
  const urlBarBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const frameShadow = isLight ? 'shadow-[6px_6px_0px_0px_#0f172a]' : 'shadow-[6px_6px_0px_0px_#262626]';

  const mockups: Record<TabName, React.ReactElement> = {
    'Kanban Board': <KanbanMockup isLight={isLight} />,
    'Meeting Room': <MeetingMockup isLight={isLight} />,
    'Meeting Summary': <TranscriptMockup isLight={isLight} />,
    'Sprint Analytics': <AnalyticsMockup isLight={isLight} />,
    'Calendar': <CalendarMockup isLight={isLight} />,
    'Team Chat': <ChatMockup isLight={isLight} />,
  };

  return (
    <section className="py-24 max-sm:py-16 bg-transparent relative overflow-hidden">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 select-none"
        >
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black ${headingColor} tracking-tight uppercase leading-tight`}>
            EVERYTHING IN ONE<br />
            <span className="text-[#F97316]">UNIFIED WORKSPACE</span>
          </h2>
        </motion.div>

        {/* Tab Buttons Bar */}
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`
                px-4 py-2 rounded-[4px] border-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-150 select-none
                ${active === tab
                  ? `bg-[#F97316] text-white border-black ${activeTabShadow}`
                  : `${inactiveTabBg} ${inactiveTabText} ${inactiveTabBorder} hover:border-[#0f172a] hover:text-[#0f172a]`
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Neo-Brutalist Frame Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={`${frameBg} border-2 ${frameBorder} rounded-[4px] overflow-hidden ${frameShadow}`}
        >
          {/* Top Frame Chrome */}
          <div className={`px-4 py-2.5 border-b-2 ${frameBorder} flex items-center justify-between gap-3 ${chromeBg}`}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] border border-black/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-black/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-black/40" />
            </div>
            <div className={`${urlBarBg} border ${urlBarBorder} rounded-[3px] px-3 py-1 text-[10px] font-mono text-[#A1A1AA] text-center max-w-[300px] mx-auto truncate`}>
              app.sprintive.com/workspace — <span className="text-[#F97316] font-bold">{active}</span>
            </div>
          </div>

          {/* Tab Mockup Viewport */}
          <div className={`p-6 ${viewportBg} min-h-[360px]`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {mockups[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

