import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
// Forced restart check
import usersRoutes from './routes/users.routes.js';
// Forced restart check 2
import complaintsRoutes from './routes/complaints.routes.js';
import adminRoutes from './routes/admin.routes.js';
import masterRoutes from './routes/master.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Only start server if not running in Vercel (Vercel exports the app)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 E-CARE API Server running on http://localhost:${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    });
}

export default app;
