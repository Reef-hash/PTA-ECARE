import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes.js';
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
const PORT = Number(process.env.PORT) || 3000;

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
        'https://www.ptas.my'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files - guna UPLOAD_DIR env var supaya fail selamat dari deployment
const uploadsDir = process.env.UPLOAD_DIR 
    ? path.resolve(process.env.UPLOAD_DIR) 
    : path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint for notifications
app.get('/api/debug-notifs', async (req, res) => {
    try {
        const mysql = require('mysql2/promise');
        const fs = require('fs');
        let errorLog = 'No log found';
        try {
            if (fs.existsSync('error_log.txt')) {
                errorLog = fs.readFileSync('error_log.txt', 'utf8');
            }
        } catch(e) {}

        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ecare_db',
        });
        
        let insertResult = null;
        let insertError = null;
        try {
            const [result] = await pool.query(
                'INSERT INTO notifications (recipient_id, recipient_role, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, 0)',
                ['test-uuid-1234', 'user', 'TEST', 'TEST MSG', 'status_update']
            );
            insertResult = result;
        } catch(e: any) {
            insertError = e.message;
        }

        const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
        const [schema] = await pool.query('DESCRIBE notifications');
        res.json({ schema, rows, insertResult, insertError, errorLog });
    } catch (e: any) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// Download endpoint to bypass CORS/Nginx issues for static files
app.get('/api/download', (req, res) => {
    try {
        const fileUrl = req.query.url as string;
        const filename = req.query.filename as string;
        if (!fileUrl) {
            res.status(400).send('No URL provided');
            return;
        }
        
        const uploadIndex = fileUrl.indexOf('/uploads/');
        if (uploadIndex === -1) {
            res.status(400).send('Invalid file URL');
            return;
        }
        
        const relativePath = fileUrl.substring(uploadIndex + 9);
        const normalizedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.join(uploadsDir, normalizedPath);
        
        if (fs.existsSync(absolutePath)) {
            res.download(absolutePath, filename || path.basename(absolutePath));
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
