import { Router }         from 'express';
import multer             from 'multer';
import { teamController } from '../controllers/team.controller.js';
import { requireAuth }    from '../middleware/auth.middleware.js';

const router  = Router();
const upload  = multer({ dest: 'uploads/', limits: { fileSize: 2 * 1024 * 1024 } });

router.use(requireAuth);

router.post('/',                    upload.single('avatar'), teamController.createTeam);
router.post('/invite',              teamController.inviteMembers);
router.post('/invite-link',         teamController.generateInviteLink);
router.get('/invite/:token',        teamController.getInvitePreview);
router.post('/join',                teamController.acceptInvitation);
router.post('/reject',              teamController.rejectInvitation);
router.get('/:id',                  teamController.getTeam);

export default router;
