const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'C:/Users/Afiah/OneDrive - Institut Kemahiran MARA Besut/PROJECT ECARE/E-care/backend/.env' });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecare_db',
    });

    try {
        const [rows] = await pool.query("ALTER TABLE complaints MODIFY COLUMN status ENUM('pending', 'in_process', 'incomplete', 'bawa_pulang', 'ready_pickup', 'closed', 'cancelled') DEFAULT 'pending'");
        console.log('Successfully updated complaints enum', rows);
        
        const [remarkRows] = await pool.query("ALTER TABLE complaint_remarks MODIFY COLUMN status ENUM('pending', 'in_process', 'incomplete', 'bawa_pulang', 'ready_pickup', 'closed', 'cancelled') NULL");
        console.log('Successfully updated complaint_remarks enum', remarkRows);

        const [techRemarkRows] = await pool.query("ALTER TABLE technician_remarks MODIFY COLUMN status ENUM('pending', 'in_process', 'incomplete', 'bawa_pulang', 'ready_pickup', 'closed', 'cancelled') NULL");
        console.log('Successfully updated technician_remarks enum', techRemarkRows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
