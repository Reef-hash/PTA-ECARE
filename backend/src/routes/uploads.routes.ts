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
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const { type, filename } = req.params;

        const allowedTypes = ['warranty-docs', 'receipt-docs', 'user-images'];
        if (!allowedTypes.includes(type)) {
            res.status(400).json({ error: 'Invalid file type' });
            return;
        }

        const safeFilename = path.basename(filename);
        const possibleRoots = [
            UPLOAD_ROOT,
            process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null,
            path.resolve(process.cwd(), 'uploads'),
            path.resolve(process.cwd(), '../uploads'),
            path.resolve(process.cwd(), '../../uploads'),
            '/home/u134652667/uploads'
        ].filter(Boolean) as string[];

        let resolvedPath = '';
        for (const root of possibleRoots) {
            const candidatePath = path.resolve(root, type, safeFilename);
            const allowedPath = path.resolve(root, type);
            if (candidatePath.startsWith(allowedPath) && fs.existsSync(candidatePath)) {
                resolvedPath = candidatePath;
                break;
            }
        }

        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        res.sendFile(resolvedPath);
    } catch (error) {
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

export default router;
