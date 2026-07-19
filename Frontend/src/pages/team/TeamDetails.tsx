import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamService } from '../../services/team.service';
import type { Team } from '../../types';

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    teamService.getTeam(id)
      .then(setTeam)
      .catch(() => setError('Team not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-white/20 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || 'Team not found'}</p>
        <button onClick={() => navigate('/teams/create')} className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-sm font-semibold">
          Create a Team
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
            style={{ background: team.avatar_url ? 'transparent' : team.color }}
          >
            {team.avatar_url
              ? <img src={team.avatar_url} className="w-full h-full object-cover" alt={team.name} />
              : team.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">{team.name}</h1>
            {team.description && <p className="text-[#94A3B8] text-sm mt-1">{team.description}</p>}
          </div>
        </div>

        <div className="bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#475569]">Members</span>
            <span className="text-[#F8FAFC] font-medium">{team.member_count ?? 1}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#475569]">Timezone</span>
            <span className="text-[#F8FAFC] font-medium">{team.timezone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#475569]">Daily Scrum</span>
            <span className="text-[#F8FAFC] font-medium">{team.daily_scrum_time}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#475569]">Created by</span>
            <span className="text-[#F8FAFC] font-medium">{team.creator_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
