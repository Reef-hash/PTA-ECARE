import pool from './src/config/mysql.js';

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE users');
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkSchema();
