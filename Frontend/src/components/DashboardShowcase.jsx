import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor } from 'lucide-react';

const tabs = ['Kanban Board', 'Meeting Room', 'Meeting Summary', 'Sprint Analytics', 'Calendar', 'Team Chat'];

function KanbanMockup() {
  const cols = [
    { title: 'Backlog',     color: '#94A3B8', tasks: [{ t: 'User Auth', p: 'High' }, { t: 'API Design', p: 'Med' }, { t: 'DB Schema', p: 'Low' }] },
    { title: 'In Progress', color: '#3B82F6', tasks: [{ t: 'Dashboard UI', p: 'High' }, { t: 'Meeting API', p: 'High' }] },
    { title: 'Review',      color: '#F59E0B', tasks: [{ t: 'Login Flow', p: 'Med' }] },
    { title: 'Done',        color: '#10B981', tasks: [{ t: 'Setup CI/CD', p: 'Low' }, { t: 'DB Migrations', p: 'Med' }] },
  ];
  const pColor = { High: '#EF4444', Med: '#F59E0B', Low: '#10B981' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
      {cols.map(col => (
        <div key={col.title} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.title}</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 4, padding: '1px 5px' }}>{col.tasks.length}</span>
          </div>
          {col.tasks.map(task => (
            <div key={task.t} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 10px', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-h)', fontWeight: 600, marginBottom: 5 }}>{task.t}</div>
              <span style={{ fontSize: 9, background: `${pColor[task.p]}18`, color: pColor[task.p], borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>{task.p}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MeetingMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 9, border: '1px solid rgba(16,185,129,0.2)' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h)' }}>Daily Scrum — Sprint 12</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10B981', fontWeight: 600 }}>● Live</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {['Alex Chen', 'Sam Rivera', 'Jordan Lee', 'Taylor Kim', 'Morgan Wu', 'AI Assistant'].map((name, i) => (
          <div key={name} style={{
            background: 'var(--bg3)', borderRadius: 10, padding: 14,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
            border: i === 0 ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
            position: 'relative',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, hsl(${i*45+200},65%,55%), hsl(${i*45+240},65%,65%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{name[0]}</div>
            <span style={{ fontSize: 10, color: 'var(--text-h)', fontWeight: 600, textAlign: 'center' }}>{name}</span>
            {i === 0 && (
              <div style={{ position: 'absolute', bottom: 7, right: 7, display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 12 }}>
                {[3,5,4,6,3].map((h,j) => (
                  <motion.div key={j} animate={{ height: [h*1.5, h*3, h*1.5] }} transition={{ duration: 0.5, repeat: Infinity, delay: j*0.1 }}
                    style={{ width: 2, background: 'var(--primary)', borderRadius: 1 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TranscriptMockup() {
  const lines = [
    { speaker: 'Alex',    time: '09:01', text: "Yesterday I finished the authentication module. Today I'll work on the dashboard.", tag: null },
    { speaker: 'Summary', time: '09:01', text: 'Action item: Complete dashboard — Assigned to Alex',                              tag: '✅ Action' },
    { speaker: 'Sam',     time: '09:02', text: "I'm blocked on the payment flow. Need access from the DevOps team.",               tag: null },
    { speaker: 'Summary', time: '09:02', text: 'Blocker noted: Payment access — Owner: DevOps team',                              tag: '🚫 Blocker' },
    { speaker: 'Jordan',  time: '09:03', text: 'Sprint review is on Friday. Reporting module must be done by Thursday.',           tag: null },
    { speaker: 'Summary', time: '09:03', text: 'Deadline: Reporting module — Due: Thursday EOD',                                  tag: '📅 Deadline' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, i) => (
        <div key={i} style={{
          display: 'flex', gap: 10, padding: '9px 12px',
          background: line.speaker === 'Summary' ? 'rgba(59,130,246,0.06)' : 'transparent',
          borderRadius: 8,
          border: line.speaker === 'Summary' ? '1px solid rgba(59,130,246,0.12)' : '1px solid transparent',
        }}>
          <span style={{ fontSize: 10, color: line.speaker === 'Summary' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, minWidth: 48, paddingTop: 1 }}>{line.speaker}</span>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text)', lineHeight: 1.55 }}>{line.text}</span>
          {line.tag && <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 5, padding: '2px 7px', color: 'var(--primary)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{line.tag}</span>}
          <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{line.time}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [65, 80, 55, 90, 70, 85, 95];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[['Sprint Velocity','42 pts','+12%'],['Tasks Done','28/35','80%'],['Meetings','14','This Sprint'],['AI Accuracy','96%','Task Detection']].map(([label,val,sub]) => (
          <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-h)', marginBottom: 3, letterSpacing: '-0.02em' }}>{val}</div>
            <div style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 600 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-h)', marginBottom: 14 }}>Weekly Task Completion</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <motion.div initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{ width: '100%', background: 'linear-gradient(to top, var(--primary), var(--accent))', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{days[i]}</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.01em' }}>January 2026</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['‹','›'].map(c => <button key={c} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>{c}</button>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, padding: '3px 0' }}>{d}</div>)}
        {days.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, padding: '5px 3px', borderRadius: 5,
            background: d === 15 ? 'var(--primary)' : meetings.includes(d) ? 'rgba(59,130,246,0.12)' : 'transparent',
            color: d === 15 ? '#fff' : meetings.includes(d) ? 'var(--primary)' : 'var(--text)',
            fontWeight: meetings.includes(d) || d === 15 ? 700 : 400,
            cursor: 'default',
          }}>
            {d}
            {meetings.includes(d) && d !== 15 && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--primary)', margin: '2px auto 0' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMockup() {
  const msgs = [
    { user: 'Alex',   msg: 'Just pushed the auth fix 🚀',                      time: '09:15', self: false },
    { user: 'Sam',    msg: "Great! I'll start the review now",                  time: '09:16', self: false },
    { user: 'You',    msg: "AI created 3 tickets from today's standup",         time: '09:17', self: true  },
    { user: 'Bot',    msg: '✅ Sprint board updated. 3 new tasks assigned.',    time: '09:17', self: false },
    { user: 'Jordan', msg: 'Can we move the sprint review to 3pm?',             time: '09:20', self: false },
    { user: 'You',    msg: "Sure, I'll update the calendar",                    time: '09:21', self: true  },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.self ? 'flex-end' : 'flex-start', gap: 7 }}>
            {!m.self && <div style={{ width: 26, height: 26, borderRadius: '50%', background: `hsl(${i*50+200},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.user[0]}</div>}
            <div style={{ maxWidth: '68%' }}>
              {!m.self && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 600 }}>{m.user}</div>}
              <div style={{
                background: m.self ? 'var(--primary)' : 'var(--surface2)',
                border: m.self ? 'none' : '1px solid var(--border)',
                borderRadius: m.self ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                padding: '7px 10px', fontSize: 11,
                color: m.self ? '#fff' : 'var(--text)',
                fontWeight: m.self ? 500 : 400,
              }}>{m.msg}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 7, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Type a message…</div>
        <button style={{ background: 'var(--primary)', border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  );
}

const mockups = {
  'Kanban Board':    <KanbanMockup />,
  'Meeting Room':    <MeetingMockup />,
  'Meeting Summary': <TranscriptMockup />,
  'Sprint Analytics':<AnalyticsMockup />,
  'Calendar':        <CalendarMockup />,
  'Team Chat':       <ChatMockup />,
};

export default function DashboardShowcase() {
  const [active, setActive] = useState('Kanban Board');
  return (
    <section className="section-alt">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="section-tag"><Monitor size={11} /> Dashboard</div>
          <h2 className="section-title">Everything in One<br /><span className="glow-text">Unified Workspace</span></h2>
          <p className="section-sub">Switch between views to see how ScrumMind keeps your entire team in sync.</p>
        </motion.div>

        {/* Tab pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          {tabs.map(tab => (
            <motion.button key={tab} whileTap={{ scale: 0.97 }} onClick={() => setActive(tab)} style={{
              padding: '7px 16px', borderRadius: 8,
              border: `1px solid ${active === tab ? 'var(--primary)' : 'var(--border)'}`,
              background: active === tab ? 'var(--primary-glow)' : 'var(--surface)',
              color: active === tab ? 'var(--primary)' : 'var(--text)',
              fontSize: 13, fontWeight: active === tab ? 600 : 500,
              cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'var(--font)',
              letterSpacing: '-0.01em',
            }}>{tab}</motion.button>
          ))}
        </div>

        {/* Browser window */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          {/* Chrome bar */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
            </div>
            <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280, margin: '0 auto' }}>
              app.scrummind.io — {active}
            </div>
          </div>
          <div style={{ padding: 20, minHeight: 360 }}>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                {mockups[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
