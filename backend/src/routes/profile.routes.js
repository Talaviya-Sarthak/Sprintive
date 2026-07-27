import { Router }              from 'express';
import multer                  from 'multer';
import { profileController }   from '../controllers/profile.controller.js';
import { requireAuth }         from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 2 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/',    profileController.getProfile);
router.patch('/',  upload.single('avatar'), profileController.updateProfile);

export default router;
