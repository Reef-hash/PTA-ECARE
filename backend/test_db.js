const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function run() {
    let host = process.env.DB_HOST;
    if (!host || host === 'localhost') host = '127.0.0.1';

    const pool = mysql.createPool({
        host: host,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecare_db',
    });

    try {
        console.log(`Connecting to ${host}...`);
        
        // Check notifications table schema
        const [schema] = await pool.query("DESCRIBE notifications");
        console.log("=== SCHEMA ===");
        console.log(schema.map(s => `${s.Field}: ${s.Type}`).join('\n'));

        // Check recent notifications
        const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
        console.log("\n=== RECENT NOTIFICATIONS ===");
        console.log(rows);
        
    } catch(e) {
        console.error("ERROR:", e.message);
    }
    process.exit(0);
}
run();
