import { Router } from 'express';
import { authenticateToken, requireAdmin, requireTechnician, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
    createTechnicianSchema,
    updateTechnicianSchema,
    updateUserStatusSchema,
    createUserSchema
} from '../utils/schemas.js';
import {
    getStats,
    getTechnicianStats,
    getTechnicians,
    getTechnician,
    createTechnician,
    updateTechnician,
    resetTechnicianPassword,
    deleteTechnician,
    getUsers,
    getUser,
    updateUserStatus,
    createUser,
    deleteUser,
    getAdminProfile,
    updateAdminProfile,
    updateAdminPassword,
} from '../controllers/admin.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Shared routes (Admin & Technician & Main Technician)
router.get('/profile', requireTechnician, getAdminProfile);
router.put('/profile', requireTechnician, updateAdminProfile);
router.put('/profile/password', requireTechnician, updateAdminPassword);

// Allow main_technician to get technicians for forward job and stats
router.get('/technicians', requireRole('admin', 'main_technician'), getTechnicians);
router.get('/stats', requireRole('admin', 'main_technician'), getStats);

// Admin Only Routes
router.use(requireAdmin);

// Dashboard
router.get('/technician-stats', getTechnicianStats);

// Technicians
router.get('/technicians/:id', getTechnician);
router.post('/technicians', validate(createTechnicianSchema), createTechnician);
router.put('/technicians/:id', validate(updateTechnicianSchema), updateTechnician);
router.post('/technicians/:id/reset-password', resetTechnicianPassword);
router.delete('/technicians/:id', deleteTechnician);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.post('/users', validate(createUserSchema), createUser);
router.put('/users/:id/status', validate(updateUserStatusSchema), updateUserStatus);
router.delete('/users/:id', deleteUser);

export default router;
