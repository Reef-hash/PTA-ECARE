const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.hostinger' });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    try {
        const [rows] = await pool.query('SELECT id, name, username, email, department FROM technicians');
        console.log(rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
