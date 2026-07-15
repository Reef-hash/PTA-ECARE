import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
    console.warn(`[Warning] Missing MySQL environment variables: ${missingEnv.join(', ')}`);
}

const pool = mysql.createPool({
    host: (process.env.DB_HOST === 'localhost') ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1'),
    user: process.env.DB_USER || 'u134652667_ecare',
    password: process.env.DB_PASSWORD || 'k5;FY3WxT',
    database: process.env.DB_NAME || 'u134652667_ecare_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true
});

export default pool;
