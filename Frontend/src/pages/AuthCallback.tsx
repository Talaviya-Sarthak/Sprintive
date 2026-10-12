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
      // Priority 1: Check query redirect param passed from OAuth state
      const urlRedirect = params.get('redirect');
      // Priority 2: Check stored redirects in localStorage / sessionStorage
      const storedRedirect = localStorage.getItem('auth_redirect') || sessionStorage.getItem('auth_redirect');
      const pendingInvite = sessionStorage.getItem('pending_invite');

      // Clean up storage
      localStorage.removeItem('auth_redirect');
      sessionStorage.removeItem('auth_redirect');
      sessionStorage.removeItem('pending_invite');

      let targetDestination: string | null = null;
      if (urlRedirect && urlRedirect.startsWith('/') && !urlRedirect.startsWith('//')) {
        targetDestination = urlRedirect;
      } else if (storedRedirect && storedRedirect.startsWith('/') && !storedRedirect.startsWith('//')) {
        targetDestination = storedRedirect;
      } else if (pendingInvite) {
        targetDestination = `/invitations/${pendingInvite}`;
      }

      if (targetDestination) {
        navigate(targetDestination, { replace: true });
        return;
      }

      if (teams.length === 1) {
        navigate(`/teams/${teams[0].id}`, { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
    </div>
  );
}
