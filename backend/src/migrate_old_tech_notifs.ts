import dotenv from 'dotenv';
import path from 'path';
import pool from './config/mysql.js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    const [r]: any = await pool.query(
        `UPDATE notifications SET recipient_role = 'main_technician', notif_category = 'main_technician'
         WHERE recipient_id = '1f195995-571f-4532-9420-190a066f9f97' AND recipient_role = 'technician'`
    );
    console.log('Migrated rows:', r.affectedRows);

    const [chk]: any = await pool.query(
        `SELECT recipient_role, COUNT(*) as cnt FROM notifications
         WHERE recipient_id = '1f195995-571f-4532-9420-190a066f9f97' GROUP BY recipient_role`
    );
    console.log('Now:', chk);

    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
