import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { meetingService } from '../../services/meeting.service';

export default function CreateMeeting() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const defaultTeamId = params.get('team_id') ?? '';

  const [form, setForm] = useState({ team_id: defaultTeamId, title: '', sprint_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team_id || !form.title.trim()) { setError('Team and title are required'); return; }
    setLoading(true);
    try {
      const meeting = await meetingService.createMeeting({
        team_id: form.team_id,
        title: form.title,
        sprint_name: form.sprint_name || undefined,
      });
      navigate(`/meetings/${meeting.id}`);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-xs font-semibold mb-4">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z"/></svg>
            New Meeting
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Schedule a Meeting</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Team ID</label>
            <input
              value={form.team_id}
              onChange={(e) => set('team_id', e.target.value)}
              placeholder="Team UUID"
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Meeting Title *</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Daily Scrum — Sprint 12"
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Sprint Name</label>
            <input
              value={form.sprint_name}
              onChange={(e) => set('sprint_name', e.target.value)}
              placeholder="e.g. Sprint 12"
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Meeting'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
