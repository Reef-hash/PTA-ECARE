import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createComplaintSchema, addRemarkSchema, forwardComplaintSchema } from '../utils/schemas.js';
import { uploadComplaintFiles } from '../middleware/upload.js';
import {
    getComplaints,
    getComplaint,
    createComplaint,
    updateComplaint,
    addRemark,
    updateRemark,
    deleteRemark,
    forwardComplaint,
    getTechnicianDashboardStats,
    cancelComplaint,
    deleteComplaint,
    bulkDeleteComplaints,
    resolveNumericId,
} from '../controllers/complaints.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`[COMPLAINTS ROUTE] ${req.method} ${req.path} - Params:`, req.params);
    next();
});

// Technician stats endpoint (must come before /:id)
router.get('/my-stats', requireRole('technician'), getTechnicianDashboardStats);

// List complaints (filtered by role)
router.get('/', getComplaints);

// Create complaint (users only)
router.post('/', requireRole('user'), uploadComplaintFiles, createComplaint);

// IMPORTANT: Specific routes MUST come before parameterized routes
// Resolve numeric ID to report_number (for notification navigation)
router.get('/resolve-id/:id', resolveNumericId);

// Update/Delete remark (technician only)
router.put('/remarks/:remarkId', requireRole('technician'), validate(addRemarkSchema), updateRemark);
router.delete('/remarks/:remarkId', requireRole('technician'), deleteRemark);

// Get single complaint (parameterized route - must come after specific routes)
router.get('/:id', getComplaint);

// Update complaint status (admin/technician)
router.put('/:id', requireRole('admin', 'technician'), updateComplaint);

// Add remark (admin/technician)
router.post('/:id/remark', requireRole('admin', 'technician'), validate(addRemarkSchema), addRemark);

// Forward to technician (admin, main_technician)
router.post('/:id/forward', requireRole('admin', 'main_technician'), validate(forwardComplaintSchema), forwardComplaint);

// Cancel complaint (user only, pending status only)
router.delete('/:id/cancel', requireRole('user'), cancelComplaint);

// Delete complaint entirely (admin only)
router.post('/bulk-delete', requireRole('admin'), bulkDeleteComplaints);
router.delete('/:id', requireRole('admin'), deleteComplaint);

export default router;

