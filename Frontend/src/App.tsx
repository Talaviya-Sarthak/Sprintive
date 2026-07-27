import { Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';

import Navbar            from './components/Navbar';
import Hero              from './components/Hero';
import TrustedBy         from './components/TrustedBy';
import Features          from './components/Features';
import HowItWorks        from './components/HowItWorks';
import DashboardShowcase from './components/DashboardShowcase';
import Benefits          from './components/Benefits';
import Pricing           from './components/Pricing';
import Testimonials      from './components/Testimonials';
import FAQ               from './components/FAQ';
import FinalCTA          from './components/FinalCTA';
import Footer            from './components/Footer';
import ProtectedRoute    from './components/ProtectedRoute';

import SignUp        from './pages/SignUp';
import Login         from './pages/Login';
import AuthCallback  from './pages/AuthCallback';
import Profile       from './pages/Profile';
import CreateTeam    from './pages/team/CreateTeam';
import TeamDetails   from './pages/team/TeamDetails';
import JoinTeam      from './pages/team/JoinTeam';
import Dashboard     from './pages/workspace/Dashboard';
import TeamMembers   from './pages/team/TeamMembers';
import TeamSettings  from './pages/team/TeamSettings';
import CreateMeeting     from './pages/meeting/CreateMeeting';
import MeetingLobby      from './pages/meeting/MeetingLobby';
import MeetingRoom       from './pages/meeting/MeetingRoom';
import MeetingsPage      from './pages/meeting/MeetingsPage';
import MeetingDetailsPage from './pages/meeting/MeetingDetailsPage';
import MeetingRoomPage   from './pages/meeting/MeetingRoomPage';
import MeetingSummaryPage from './pages/meeting/MeetingSummaryPage';

function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main>
        <Hero />
        <TrustedBy />
        <Features />
        <HowItWorks />
        <DashboardShowcase />
        <Benefits />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"                      element={<LandingPage />} />
      <Route path="/signup"                element={<SignUp />} />
      <Route path="/login"                 element={<Login />} />
      <Route path="/auth/callback"         element={<AuthCallback />} />
      
      {/* Team creation and joining (protected) */}
      <Route path="/teams/create"          element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
      <Route path="/join/:token"           element={<JoinTeam />} />

      {/* Workspace pages (protected) */}
      <Route path="/dashboard"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile"               element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Team workspace pages (protected) */}
      <Route path="/teams/:id"             element={<ProtectedRoute><TeamDetails /></ProtectedRoute>} />
      <Route path="/teams/:id/members"     element={<ProtectedRoute><TeamMembers /></ProtectedRoute>} />
      <Route path="/teams/:id/settings"    element={<ProtectedRoute><TeamSettings /></ProtectedRoute>} />

      {/* Meetings (protected) */}
      <Route path="/meetings/create"                  element={<ProtectedRoute><CreateMeeting /></ProtectedRoute>} />
      <Route path="/meetings/:id"                     element={<ProtectedRoute><MeetingLobby /></ProtectedRoute>} />
      <Route path="/meetings/:id/room"                element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />

      {/* New Meeting Module Routes (protected) */}
      <Route path="/teams/:teamId/meetings"           element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
      <Route path="/teams/:teamId/meetings/:meetingId" element={<ProtectedRoute><MeetingDetailsPage /></ProtectedRoute>} />
      <Route path="/meetings/:meetingId/live"         element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />
      <Route path="/meetings/:meetingId/summary"      element={<ProtectedRoute><MeetingSummaryPage /></ProtectedRoute>} />
    </Routes>
  );
}
