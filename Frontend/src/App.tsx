import { Routes, Route } from 'react-router-dom';

import ProtectedRoute    from './components/ProtectedRoute';

import SignUp        from './pages/SignUp';
import Login         from './pages/Login';
import Contact       from './pages/Contact';
import About         from './pages/About';
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
import KanbanPage         from './pages/kanban/KanbanPage';
import LandingPage        from './pages/LandingPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"                      element={<LandingPage />} />
      <Route path="/contact"               element={<Contact />} />
      <Route path="/about"                 element={<About />} />
      <Route path="/signup"                element={<SignUp />} />
      <Route path="/login"                 element={<Login />} />
      <Route path="/auth/callback"         element={<AuthCallback />} />
      
      {/* Team creation and joining */}
      <Route path="/teams/create"          element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
      <Route path="/invitations/:token"    element={<JoinTeam />} />
      <Route path="/join/:token"           element={<JoinTeam />} />

      {/* Workspace pages (protected) */}
      <Route path="/dashboard"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/kanban"                element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
      <Route path="/profile"               element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Team workspace pages (protected) */}
      <Route path="/teams/:id"             element={<ProtectedRoute><TeamDetails /></ProtectedRoute>} />
      <Route path="/teams/:teamId/kanban"  element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
      <Route path="/teams/:id/members"     element={<ProtectedRoute><TeamMembers /></ProtectedRoute>} />
      <Route path="/teams/:id/settings"    element={<ProtectedRoute><TeamSettings /></ProtectedRoute>} />

      {/* Meetings (protected) */}
      <Route path="/meetings/create"                  element={<ProtectedRoute><CreateMeeting /></ProtectedRoute>} />
      <Route path="/teams/:teamId/meetings/create"    element={<ProtectedRoute><CreateMeeting /></ProtectedRoute>} />
      <Route path="/meetings/:meetingId"              element={<ProtectedRoute><MeetingDetailsPage /></ProtectedRoute>} />
      <Route path="/meetings/:id/lobby"               element={<ProtectedRoute><MeetingLobby /></ProtectedRoute>} />
      <Route path="/meetings/:id/room"                element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />

      {/* New Meeting Module Routes (protected) */}
      <Route path="/teams/:teamId/meetings"           element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
      <Route path="/teams/:teamId/meetings/:meetingId" element={<ProtectedRoute><MeetingDetailsPage /></ProtectedRoute>} />
      <Route path="/meetings/:meetingId/live"         element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />
      <Route path="/meetings/:meetingId/summary"      element={<ProtectedRoute><MeetingSummaryPage /></ProtectedRoute>} />
    </Routes>
  );
}
