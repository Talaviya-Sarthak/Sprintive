import { Router }         from 'express';
import multer             from 'multer';
import { teamController } from '../controllers/team.controller.js';
import { meetingController } from '../controllers/meeting.controller.js';
import { kanbanController } from '../controllers/kanban.controller.js';
import { requireAuth }    from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 2 * 1024 * 1024 } });

// Invitation preview — public (no auth required)
router.get('/invite/:token',              teamController.getInvitePreview);

router.use(requireAuth);

// Dashboard
router.get('/dashboard',                  teamController.getDashboard);

// My teams list
router.get('/',                           teamController.getMyTeams);

// Create team
router.post('/',                          upload.single('avatar'), teamController.createTeam);

// Accept / reject invitation (auth required)
router.post('/join',                      teamController.acceptInvitation);
router.post('/reject',                    teamController.rejectInvitation);

// Team CRUD
router.get('/:id',                        teamController.getTeam);
router.patch('/:id',                      upload.single('avatar'), teamController.updateTeam);
router.delete('/:id',                     teamController.deleteTeam);

// Members
router.get('/:id/members',               teamController.getMembers);
router.delete('/:id/members/:memberId',  teamController.removeMember);

// Invitations
router.post('/:id/invite',               teamController.inviteMembers);
router.post('/:id/invitations',          teamController.inviteUsers);
router.get('/:id/invitations',           teamController.getInvitations);

// Team meetings
router.get('/:teamId/meetings',          meetingController.getTeamMeetings);

// Team Kanban board & task status updates
router.get('/:teamId/kanban',            kanbanController.getKanban);
router.patch('/:teamId/kanban/tickets/:ticketId/status', kanbanController.updateTicketStatus);

export default router;
