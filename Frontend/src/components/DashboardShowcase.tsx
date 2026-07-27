import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor } from 'lucide-react';

type TabName = 'Kanban Board' | 'Meeting Room' | 'Meeting Summary' | 'Sprint Analytics' | 'Calendar' | 'Team Chat';

const tabs: TabName[] = ['Kanban Board', 'Meeting Room', 'Meeting Summary', 'Sprint Analytics', 'Calendar', 'Team Chat'];

interface KanbanTask { t: string; p: 'High' | 'Med' | 'Low'; }
interface KanbanCol  { title: string; color: string; tasks: KanbanTask[]; }

function KanbanMockup() {
  const cols: KanbanCol[] = [
    { title: 'Backlog',     color: '#94A3B8', tasks: [{ t: 'User Auth', p: 'High' }, { t: 'API Design', p: 'Med' }, { t: 'DB Schema', p: 'Low' }] },
    { title: 'In Progress', color: '#3B82F6', tasks: [{ t: 'Dashboard UI', p: 'High' }, { t: 'Meeting API', p: 'High' }] },
    { title: 'Review',      color: '#F59E0B', tasks: [{ t: 'Login Flow', p: 'Med' }] },
    { title: 'Done',        color: '#10B981', tasks: [{ t: 'Setup CI/CD', p: 'Low' }, { t: 'DB Migrations', p: 'Med' }] },
  ];
  const pColor: Record<'High' | 'Med' | 'Low', string> = { High: '#EF4444', Med: '#F59E0B', Low: '#10B981' };
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {cols.map(col => (
        <div key={col.title} className="bg-[var(--color-bg3)] rounded-[10px] p-2.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: col.color }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.05em]" style={{ color: col.color }}>{col.title}</span>
            <span className="ml-auto text-[9px] text-[var(--color-text-muted)] bg-[var(--color-surface2)] rounded px-[5px] py-px">{col.tasks.length}</span>
          </div>
          {col.tasks.map(task => (
            <div key={task.t} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[7px] px-2.5 py-[9px] mb-1.5">
              <div className="text-[11px] text-[var(--color-text-h)] font-semibold mb-[5px]">{task.t}</div>
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: `${pColor[task.p]}18`, color: pColor[task.p] }}>{task.p}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MeetingMockup() {
  const names = ['Alex Chen', 'Sam Rivera', 'Jordan Lee', 'Taylor Kim', 'Morgan Wu', 'AI Assistant'];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 px-3.5 py-[9px] bg-[rgba(16,185,129,0.08)] rounded-[9px] border border-[rgba(16,185,129,0.2)]">
        <div className="w-[7px] h-[7px] rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
        <span className="text-xs font-semibold text-[var(--color-text-h)]">Daily Scrum — Sprint 12</span>
        <span className="ml-auto text-[10px] text-[#10B981] font-semibold">● Live</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {names.map((name, i) => (
          <div
            key={name}
            className={`bg-[var(--color-bg3)] rounded-[10px] p-3.5 flex flex-col items-center justify-center gap-[7px] border relative ${i === 0 ? 'border-[rgba(59,130,246,0.4)]' : 'border-[var(--color-border)]'}`}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, hsl(${i*45+200},65%,55%), hsl(${i*45+240},65%,65%))` }}
            >
              {name[0]}
            </div>
            <span className="text-[10px] text-[var(--color-text-h)] font-semibold text-center">{name}</span>
            {i === 0 && (
              <div className="absolute bottom-[7px] right-[7px] flex gap-[1.5px] items-end h-3">
                {[3,5,4,6,3].map((h,j) => (
                  <motion.div key={j} animate={{ height: [h*1.5, h*3, h*1.5] }} transition={{ duration: 0.5, repeat: Infinity, delay: j*0.1 }}
                    className="w-0.5 bg-[#3B82F6] rounded-sm" />
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

function TranscriptMockup() {
  const lines: TranscriptLine[] = [
    { speaker: 'Alex',    time: '09:01', text: "Yesterday I finished the authentication module. Today I'll work on the dashboard.", tag: null },
    { speaker: 'Summary', time: '09:01', text: 'Action item: Complete dashboard — Assigned to Alex',                              tag: '✅ Action' },
    { speaker: 'Sam',     time: '09:02', text: "I'm blocked on the payment flow. Need access from the DevOps team.",               tag: null },
    { speaker: 'Summary', time: '09:02', text: 'Blocker noted: Payment access — Owner: DevOps team',                              tag: '🚫 Blocker' },
    { speaker: 'Jordan',  time: '09:03', text: 'Sprint review is on Friday. Reporting module must be done by Thursday.',           tag: null },
    { speaker: 'Summary', time: '09:03', text: 'Deadline: Reporting module — Due: Thursday EOD',                                  tag: '📅 Deadline' },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex gap-2.5 px-3 py-[9px] rounded-lg border ${line.speaker === 'Summary' ? 'bg-[rgba(59,130,246,0.06)] border-[rgba(59,130,246,0.12)]' : 'bg-transparent border-transparent'}`}
        >
          <span className={`text-[10px] font-bold min-w-[48px] pt-px ${line.speaker === 'Summary' ? 'text-[#3B82F6]' : 'text-[var(--color-text-muted)]'}`}>{line.speaker}</span>
          <span className="flex-1 text-[11px] text-[var(--color-text-body)] leading-[1.55]">{line.text}</span>
          {line.tag && <span className="text-[9px] font-semibold bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.18)] rounded-[5px] px-[7px] py-0.5 text-[#3B82F6] whitespace-nowrap self-start">{line.tag}</span>}
          <span className="text-[9px] text-[var(--color-text-muted)] whitespace-nowrap self-start">{line.time}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [65, 80, 55, 90, 70, 85, 95];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const metrics: [string, string, string][] = [
    ['Sprint Velocity', '42 pts', '+12%'],
    ['Tasks Done', '28/35', '80%'],
    ['Meetings', '14', 'This Sprint'],
    ['AI Accuracy', '96%', 'Task Detection'],
  ];
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-4 gap-2.5">
        {metrics.map(([label, val, sub]) => (
          <div key={label} className="bg-[var(--color-bg3)] border border-[var(--color-border)] rounded-[10px] px-3.5 py-3">
            <div className="text-[9px] text-[var(--color-text-muted)] mb-[5px] font-semibold uppercase tracking-[0.05em]">{label}</div>
            <div className="text-lg font-extrabold text-[var(--color-text-h)] mb-[3px] tracking-[-0.02em]">{val}</div>
            <div className="text-[9px] text-[#3B82F6] font-semibold">{sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-[var(--color-bg3)] rounded-[10px] p-3.5 border border-[var(--color-border)]">
        <div className="text-[11px] font-semibold text-[var(--color-text-h)] mb-3.5">Weekly Task Completion</div>
        <div className="flex items-end gap-1.5 h-[72px]">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="w-full rounded-t-[3px] opacity-85"
                style={{ background: 'linear-gradient(to top, #3B82F6, #06B6D4)' }}
              />
              <span className="text-[8px] text-[var(--color-text-muted)]">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarMockup() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const meetings = [3, 8, 10, 15, 17, 22, 24, 29];
  return (
    <div>
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-[13px] font-bold text-[var(--color-text-h)] tracking-[-0.01em]">January 2026</span>
        <div className="flex gap-1.5">
          {['‹','›'].map(c => (
            <button key={c} className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-md px-[9px] py-[3px] text-[var(--color-text-body)] text-xs cursor-pointer">{c}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} className="text-center text-[9px] text-[var(--color-text-muted)] font-bold py-[3px]">{d}</div>
        ))}
        {days.map(d => (
          <div
            key={d}
            className={`text-center text-[10px] py-[5px] px-[3px] rounded-[5px] cursor-default ${
              d === 15 ? 'bg-[#3B82F6] text-white font-bold' :
              meetings.includes(d) ? 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6] font-bold' :
              'text-[var(--color-text-body)]'
            }`}
          >
            {d}
            {meetings.includes(d) && d !== 15 && (
              <div className="w-[3px] h-[3px] rounded-full bg-[#3B82F6] mx-auto mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChatMsg { user: string; msg: string; time: string; self: boolean; }

function ChatMockup() {
  const msgs: ChatMsg[] = [
    { user: 'Alex',   msg: 'Just pushed the auth fix 🚀',                     time: '09:15', self: false },
    { user: 'Sam',    msg: "Great! I'll start the review now",                 time: '09:16', self: false },
    { user: 'You',    msg: "AI created 3 tickets from today's standup",        time: '09:17', self: true  },
    { user: 'Bot',    msg: '✅ Sprint board updated. 3 new tasks assigned.',   time: '09:17', self: false },
    { user: 'Jordan', msg: 'Can we move the sprint review to 3pm?',            time: '09:20', self: false },
    { user: 'You',    msg: "Sure, I'll update the calendar",                   time: '09:21', self: true  },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-[7px]">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.self ? 'justify-end' : 'justify-start'} gap-[7px]`}>
            {!m.self && (
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: `hsl(${i*50+200},60%,55%)` }}
              >
                {m.user[0]}
              </div>
            )}
            <div className="max-w-[68%]">
              {!m.self && <div className="text-[9px] text-[var(--color-text-muted)] mb-0.5 font-semibold">{m.user}</div>}
              <div className={`px-2.5 py-[7px] text-[11px] ${m.self ? 'bg-[#3B82F6] text-white rounded-[10px_10px_3px_10px] font-medium' : 'bg-[var(--color-surface2)] text-[var(--color-text-body)] border border-[var(--color-border)] rounded-[10px_10px_10px_3px]'}`}>
                {m.msg}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-[7px] pt-1.5 border-t border-[var(--color-border)]">
        <div className="flex-1 bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-[7px] px-2.5 py-[7px] text-[11px] text-[var(--color-text-muted)]">Type a message…</div>
        <button className="bg-[#3B82F6] border-none rounded-[7px] px-3 py-[7px] text-[11px] font-semibold text-white cursor-pointer">Send</button>
      </div>
    </div>
  );
}

const mockups: Record<TabName, React.ReactElement> = {
  'Kanban Board':    <KanbanMockup />,
  'Meeting Room':    <MeetingMockup />,
  'Meeting Summary': <TranscriptMockup />,
  'Sprint Analytics':<AnalyticsMockup />,
  'Calendar':        <CalendarMockup />,
  'Team Chat':       <ChatMockup />,
};

export default function DashboardShowcase() {
  const [active, setActive] = useState<TabName>('Kanban Board');
  return (
    <section className="py-28 max-sm:py-18 bg-transparent">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(249,115,22,0.1)] border border-[rgba(249,115,22,0.25)] rounded-full text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.07em] mb-5">
            <Monitor size={11} /> Dashboard
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Everything in One<br />
            <span className="bg-gradient-to-r from-[#F97316] to-[#FDBA74] bg-clip-text text-transparent">
              Unified Workspace
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Switch between views to see how Sprintive keeps your entire team in sync.
          </p>
        </motion.div>

        <div className="flex gap-1.5 flex-wrap justify-center mb-5">
          {tabs.map(tab => (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActive(tab)}
              className={[
                'px-4 py-[7px] rounded-lg border text-[13px] cursor-pointer transition-all duration-200 tracking-[-0.01em]',
                active === tab
                  ? 'border-[#F97316] bg-[rgba(249,115,22,0.12)] text-[#F97316] font-semibold'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-body)] font-medium hover:border-[var(--color-border2)]',
              ].join(' ')}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)]"
        >
          <div className="px-[18px] py-3 border-b border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-bg3)]">
            <div className="flex gap-1.5">
              {['#EF4444','#F59E0B','#10B981'].map(c => (
                <div key={c} className="w-[11px] h-[11px] rounded-full opacity-80" style={{ background: c }} />
              ))}
            </div>
            <div className="flex-1 bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-md px-3 py-1 text-[11px] text-[var(--color-text-muted)] text-center max-w-[280px] mx-auto">
              app.scrummind.io — {active}
            </div>
          </div>
          <div className="p-5 min-h-[360px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
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
