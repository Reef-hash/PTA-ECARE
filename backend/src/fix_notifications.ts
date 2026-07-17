import dotenv from 'dotenv';
import path from 'path';
import pool from './config/mysql.js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('=== E-CARE NOTIFICATION FIX ===\n');

    // 1. Ensure notif_category column exists
    console.log('1. Ensuring notif_category column exists...');
    const [cols]: any = await pool.query(`SHOW COLUMNS FROM notifications LIKE 'notif_category'`);
    if (cols.length === 0) {
        console.log('   notif_category MISSING. Adding it...');
        await pool.query(
            `ALTER TABLE notifications ADD COLUMN notif_category ENUM('customer','technician','main_technician') DEFAULT 'customer'`
        );
        console.log('   >>> notif_category column ADDED.');
    } else {
        console.log('   notif_category already exists. OK.');
    }

    // 2. Fix auto_increment if it's corrupt (>= INT max or otherwise broken)
    console.log('\n2. Checking/fixing auto_increment...');
    const [ts]: any = await pool.query(`SHOW TABLE STATUS WHERE Name = 'notifications'`);
    const ai = Number(ts[0]?.Auto_increment || 0);
    console.log(`   Current Auto_increment = ${ai}`);
    if (ai === 0 || ai > 2147483647 || isNaN(ai)) {
        // Reset to max(id)+1
        const [maxRow]: any = await pool.query(`SELECT COALESCE(MAX(id),0) as maxid FROM notifications`);
        const nextId = Number(maxRow[0].maxid) + 1;
        console.log(`   Auto_increment is broken. Resetting to ${nextId} (MAX(id)+1)...`);
        await pool.query(`ALTER TABLE notifications AUTO_INCREMENT = ${nextId}`);
        console.log('   >>> Auto_increment FIXED.');
    } else {
        console.log('   Auto_increment looks valid.');
    }

    // 3. Backfill notif_category for existing main_technician notifications
    console.log('\n3. Backfilling notif_category for existing rows...');
    const [r1]: any = await pool.query(
        `UPDATE notifications SET notif_category = 'main_technician'
         WHERE recipient_role = 'main_technician' AND notif_category = 'customer'`
    );
    console.log(`   Updated ${r1.affectedRows} rows to main_technician.`);
    const [r2]: any = await pool.query(
        `UPDATE notifications SET notif_category = 'technician'
         WHERE recipient_role = 'technician' AND notif_category = 'customer'`
    );
    console.log(`   Updated ${r2.affectedRows} rows to technician.`);
    const [r3]: any = await pool.query(
        `UPDATE notifications SET notif_category = 'customer'
         WHERE recipient_role = 'user' AND notif_category = 'customer'`
    );
    console.log(`   Customer rows: ${r3.affectedRows} (already customer).`);

    // 4. Test INSERT
    console.log('\n4. Test INSERT...');
    try {
        const [r]: any = await pool.query(
            `INSERT INTO notifications (recipient_id, recipient_role, title, message, type, reference_id, is_read, notif_category)
             VALUES ('FIX_TEST', 'main_technician', 'Fix Test', 'Safe to delete', 'system', NULL, 0, 'main_technician')`
        );
        console.log(`   >>> INSERT SUCCESS! New id=${r.insertId}`);
        await pool.query(`DELETE FROM notifications WHERE id = ?`, [r.insertId]);
        console.log('   (test row deleted)');
    } catch (e: any) {
        console.log(`   !!! INSERT STILL FAILS: ${e.message}`);
        console.log('       Manual DBA intervention required.');
    }

    // 5. Final state report
    console.log('\n5. FINAL STATE:');
    const [byRole]: any = await pool.query(
        `SELECT recipient_role, notif_category, COUNT(*) as cnt FROM notifications GROUP BY recipient_role, notif_category ORDER BY recipient_role`
    );
    if (byRole.length === 0) {
        console.log('   (table is empty - new notifications will populate it as activity occurs)');
    } else {
        byRole.forEach((r: any) => console.log(`   - role=${r.recipient_role} cat=${r.notif_category}: ${r.cnt}`));
    }

    const [mt]: any = await pool.query(`SELECT id, name, email FROM technicians WHERE email = 'technicianasign@gmail.com'`);
    if (mt.length > 0) {
        console.log(`\n   Main Tech id=${mt[0].id} (${mt[0].name}). Future incomplete-status updates will insert rows for this id.`);
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('Next steps:');
    console.log('  1. Rebuild backend:  npx tsc -p backend/tsconfig.json');
    console.log('  2. Restart:          pm2 restart all');
    console.log('  3. Trigger a test incomplete-status update from a Technician and watch the Main Tech bell.');
    await pool.end();
}

run().catch(e => { console.error('Fix fatal error:', e); process.exit(1); });
