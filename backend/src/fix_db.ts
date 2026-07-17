import pool from './config/mysql.js';

async function fix() {
    try {
        console.log("Checking notifications table...");
        const [schema] = await pool.query("DESCRIBE notifications");
        console.log("Schema:", schema);

        console.log("Altering recipient_id to VARCHAR(255)...");
        await pool.query('ALTER TABLE notifications MODIFY COLUMN recipient_id VARCHAR(255)');
        
        console.log("Altering type to allow 'system' and 'status_update'...");
        await pool.query("ALTER TABLE notifications MODIFY COLUMN type ENUM('assignment', 'status_update', 'status_update_detailed', 'transport_update', 'checking_update', 'remark_update', 'system') DEFAULT 'status_update'");
        
        console.log("SUCCESS! Database fixed.");
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
}
fix();
