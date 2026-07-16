
import express from 'express';
import { getNotifications, markAsRead, clearAllNotifications } from '../controllers/notifications.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.delete('/clear-all', clearAllNotifications);
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

export default router;
