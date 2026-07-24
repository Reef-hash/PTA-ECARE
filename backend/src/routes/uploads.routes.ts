import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = Router();

const UPLOAD_ROOT = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');

router.use(authenticateToken);

router.get('/:type/:filename', (req, res) => {
    try {
        const { type, filename } = req.params;

        const allowedTypes = ['warranty-docs', 'receipt-docs', 'user-images'];
        if (!allowedTypes.includes(type)) {
            res.status(400).json({ error: 'Invalid file type' });
            return;
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(UPLOAD_ROOT, type, safeFilename);

        const resolvedPath = path.resolve(filePath);
        const allowedPath = path.resolve(UPLOAD_ROOT, type);
        if (!resolvedPath.startsWith(allowedPath)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (!fs.existsSync(resolvedPath)) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        res.sendFile(resolvedPath);
    } catch (error) {
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

export default router;
