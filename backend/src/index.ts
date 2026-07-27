import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import { generalLimiter } from './middleware/rateLimit.js';
// Forced restart check
import usersRoutes from './routes/users.routes.js';
// Forced restart check 2
import complaintsRoutes from './routes/complaints.routes.js';
import adminRoutes from './routes/admin.routes.js';
import masterRoutes from './routes/master.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

import pool from './config/mysql.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3005;

// Run auto-migration for ENUMs safely
(async () => {
    try {
        console.log('Running automatic database schema migrations...');
        // Alter complaints table
        await pool.query("ALTER TABLE complaints MODIFY COLUMN status ENUM('pending', 'in_process', 'incomplete', 'bawa_pulang', 'ready_pickup', 'closed', 'cancelled') DEFAULT 'pending'");
        // Alter complaint_remarks table
        await pool.query("ALTER TABLE complaint_remarks MODIFY COLUMN status ENUM('pending', 'in_process', 'incomplete', 'bawa_pulang', 'ready_pickup', 'closed', 'cancelled') NULL");
        // Alter technician_remarks table
        await pool.query("ALTER TABLE technician_remarks MODIFY COLUMN status ENUM('pending', 'in_process', 'incomplete', 'bawa_pulang', 'ready_pickup', 'closed', 'cancelled') NULL");
        console.log('Database schema migrations completed successfully.');

        // Ensure notifications.notif_category column exists (defensive - prevents createNotification INSERT failures)
        const [notifCols]: any = await pool.query("SHOW COLUMNS FROM notifications LIKE 'notif_category'");
        if (notifCols.length === 0) {
            await pool.query("ALTER TABLE notifications ADD COLUMN notif_category ENUM('customer','technician','main_technician') DEFAULT 'customer'");
            console.log('Added missing notif_category column to notifications table.');
        }

        // Fix corrupted auto_increment on tables with INT/BIGINT id (Out of range / Duplicate entry '0' for key 'PRIMARY')
        const tablesToFix = ['notifications', 'complaints', 'complaint_remarks', 'technician_remarks'];
        for (const tableName of tablesToFix) {
            try {
                await pool.query(`DELETE FROM ${tableName} WHERE id <= 0`);
                await pool.query(`ALTER TABLE ${tableName} MODIFY COLUMN id BIGINT AUTO_INCREMENT`);
                const [maxRow]: any = await pool.query(`SELECT COALESCE(MAX(id),0) as maxid FROM ${tableName}`);
                const nextId = Number(maxRow[0].maxid) + 1;
                await pool.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = ${nextId}`);
                console.log(`Fixed ${tableName} auto_increment to ${nextId} and upgraded id to BIGINT.`);
            } catch (tableErr: any) {
                console.error(`Error fixing auto_increment for ${tableName}:`, tableErr.message);
            }
        }
    } catch (err: any) {
        console.error('Migration error (this may be safe to ignore if enum already exists):', err.message);
    }
})();

// Middleware
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5174',
        'https://zszonetechnology.top',
        'https://api.zszonetechnology.top',
        'https://ptas.my',
        'https://www.ptas.my',
        'https://development.ptas.my',
        'https://www.development.ptas.my'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Serve uploaded files - guna UPLOAD_DIR env var supaya fail selamat dari deployment
const uploadsDir = process.env.UPLOAD_DIR 
    ? path.resolve(process.env.UPLOAD_DIR) 
    : path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.removeHeader('X-Frame-Options');
        res.removeHeader('x-frame-options');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://ptas.my https://www.ptas.my https://development.ptas.my http://localhost:* https://localhost:* *; upgrade-insecure-requests;");
    }
})); // Served directly to prevent 404 / NotSameOrigin / X-Frame-Options errors on legacy and direct file preview URLs

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Download endpoint to bypass CORS/Nginx issues for static files
app.get('/api/download', (req, res) => {
    try {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.removeHeader('X-Frame-Options');
        res.removeHeader('x-frame-options');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://ptas.my https://www.ptas.my https://development.ptas.my http://localhost:* https://localhost:* *; upgrade-insecure-requests;");

        const fileUrl = req.query.url as string;
        const filename = req.query.filename as string;
        if (!fileUrl) {
            res.status(400).send('No URL provided');
            return;
        }
        
        const cleanUrl = fileUrl.split('?')[0].split('#')[0];
        const uploadIndex = cleanUrl.indexOf('/uploads/');
        if (uploadIndex === -1) {
            res.status(400).send('Invalid file URL');
            return;
        }
        
        const relativePath = cleanUrl.substring(uploadIndex + 9);
        const normalizedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        
        const possibleRoots = [
            uploadsDir,
            process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null,
            path.resolve(process.cwd(), 'uploads'),
            path.resolve(process.cwd(), '../uploads'),
            path.resolve(process.cwd(), '../../uploads'),
            '/home/u134652667/uploads'
        ].filter(Boolean) as string[];
        
        let absolutePath = '';
        for (const root of possibleRoots) {
            const candidate = path.join(root, normalizedPath);
            if (fs.existsSync(candidate)) {
                absolutePath = candidate;
                break;
            }
        }
        
        if (absolutePath && fs.existsSync(absolutePath)) {
            if (req.query.inline === 'true') {
                res.sendFile(absolutePath);
            } else {
                res.download(absolutePath, filename || path.basename(absolutePath));
            }
        } else {
            res.status(404).send('File not found');
        }
    } catch (e) {
        res.status(500).send('Server error');
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', masterRoutes); // categories, subcategories, brands, states
app.use('/api/uploads', uploadsRoutes);
app.use(generalLimiter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
            return;
        }
        res.status(400).json({ error: err.message });
        return;
    }

    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 E-CARE API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📋 Health check: http://0.0.0.0:${PORT}/api/health`);
});

export default app;
