import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecare'
    });

    try {
        const [rows] = await pool.query('SHOW CREATE TABLE forward_history');
        console.log(rows[0]['Create Table']);
        
        console.log("--- SELECT FROM forward_history ---");
        const [fh] = await pool.query('SELECT * FROM forward_history ORDER BY id DESC LIMIT 10');
        console.log(fh);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
