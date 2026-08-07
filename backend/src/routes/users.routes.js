import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

// All user endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/users/search?query=...&teamId=...
 * WhatsApp-style member search for the invitation picker.
 */
router.get('/search', usersController.searchUsers);

export default router;