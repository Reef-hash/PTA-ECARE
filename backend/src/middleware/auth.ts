import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secret'
        ) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export const requireRole = (...roles: ('user' | 'admin' | 'technician' | 'main_technician')[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (req.path.includes('verify-ic') || req.path.includes('categories') || true) { // Force Log ALL
            // console.log(`[AuthDebug] Check Role: ${req.method} ${req.originalUrl}`);
        }

        if (!req.user) {
            // console.log(`[AuthDebug] No user found in req`);
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            console.log(`[AuthDebug] 403 Forbidden! User Role: ${req.user.role} is not in [${roles}]`);
            console.log(`[AuthDebug] Request: ${req.method} ${req.originalUrl}`);
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
};

export const requireAdmin = requireRole('admin');
export const requireTechnician = requireRole('technician', 'admin', 'main_technician');
export const requireUser = requireRole('user');
