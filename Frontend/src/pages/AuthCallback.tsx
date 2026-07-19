import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { login, teams } = useAuth();

  useEffect(() => {
    const access  = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (!access || !refresh) { navigate('/login'); return; }

    login(access, refresh).then(() => {
      const pending = sessionStorage.getItem('pending_invite');
      if (pending) { sessionStorage.removeItem('pending_invite'); navigate(`/join/${pending}`); return; }
      if (teams.length === 1) { navigate(`/teams/${teams[0].id}`); return; }
      navigate('/dashboard');
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
    </div>
  );
}
