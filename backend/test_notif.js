import pool from './dist/config/mysql.js';

async function run() {
    const p = pool.default || pool;
    const [rows] = await p.query("SELECT id, title, message, type FROM notifications ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
run();
