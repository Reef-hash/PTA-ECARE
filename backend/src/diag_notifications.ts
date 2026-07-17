import dotenv from 'dotenv';
import path from 'path';
import pool from './config/mysql.js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('=== E-CARE NOTIFICATION DIAGNOSTIC ===\n');

    // 1. Check schema of notifications table
    console.log('1. NOTIFICATIONS TABLE SCHEMA:');
    const [cols]: any = await pool.query(`SHOW COLUMNS FROM notifications`);
    cols.forEach((c: any) => {
        console.log(`   - ${c.Field} | ${c.Type} | Null=${c.Null} | Default=${c.Default} | Extra=${c.Extra}`);
    });
    const hasNotifCategory = cols.some((c: any) => c.Field === 'notif_category');
    console.log(`\n   >>> notif_category column EXISTS: ${hasNotifCategory}`);
    if (!hasNotifCategory) {
        console.log('   !!! CRITICAL: notif_category column is MISSING.');
        console.log('       createNotification INSERT will FAIL with "Unknown column notif_category".');
    }

    // 2. Check table status / auto_increment
    console.log('\n2. TABLE STATUS (auto_increment):');
    const [ts]: any = await pool.query(`SHOW TABLE STATUS WHERE Name = 'notifications'`);
    if (ts.length > 0) {
        console.log(`   Auto_increment: ${ts[0].Auto_increment}`);
        console.log(`   Rows: ${ts[0].Rows}`);
        console.log(`   Engine: ${ts[0].Engine}`);
        const ai = Number(ts[0].Auto_increment);
        if (ai > 2147483647) {
            console.log(`   !!! CRITICAL: Auto_increment (${ai}) exceeds INT(11) max (2147483647).`);
            console.log('       INSERT will FAIL with "Out of range value for column id".');
        }
    }

    // 3. Count notifications by recipient_role
    console.log('\n3. NOTIFICATIONS BY recipient_role:');
    const [byRole]: any = await pool.query(
        `SELECT recipient_role, COUNT(*) as cnt, MAX(created_at) as latest FROM notifications GROUP BY recipient_role`
    );
    if (byRole.length === 0) {
        console.log('   (table is EMPTY - no notifications have ever been inserted successfully)');
    } else {
        byRole.forEach((r: any) => console.log(`   - ${r.recipient_role}: ${r.cnt} rows, latest=${r.latest}`));
    }

    // 4. Specifically check main_technician notifications
    console.log('\n4. main_technician NOTIFICATIONS:');
    const [mtNotifs]: any = await pool.query(
        `SELECT id, recipient_id, recipient_role, title, LEFT(message,80) as msg, type, is_read, created_at
         FROM notifications WHERE recipient_role = 'main_technician' ORDER BY created_at DESC LIMIT 10`
    );
    if (mtNotifs.length === 0) {
        console.log('   (NONE - this is why Main Tech bell shows "No notifications")');
    } else {
        mtNotifs.forEach((n: any) => console.log(`   - [${n.id}] rid=${n.recipient_id} | ${n.title} | read=${n.is_read} | ${n.created_at}`));
    }

    // 5. Find the Main Technician record (email = technicianasign@gmail.com)
    console.log('\n5. MAIN TECHNICIAN RECORD (technicianasign@gmail.com):');
    const [mt]: any = await pool.query(
        `SELECT id, name, username, email FROM technicians WHERE email = 'technicianasign@gmail.com'`
    );
    if (mt.length === 0) {
        console.log('   !!! NO technician found with email technicianasign@gmail.com');
        console.log('       Main Tech login will fail. Listing all technicians:');
        const [allT]: any = await pool.query(`SELECT id, name, username, email FROM technicians`);
        allT.forEach((t: any) => console.log(`   - id=${t.id} | name=${t.name} | username=${t.username} | email=${t.email}`));
    } else {
        mt.forEach((t: any) => console.log(`   - id=${t.id} | name=${t.name} | username=${t.username} | email=${t.email}`));
    }

    // 6. Check for any notifications addressed to the main tech's id
    if (mt.length > 0) {
        const mtId = mt[0].id;
        console.log(`\n6. NOTIFICATIONS for main tech id=${mtId}:`);
        const [forMt]: any = await pool.query(
            `SELECT id, recipient_id, recipient_role, title, is_read, created_at FROM notifications WHERE recipient_id = ?`,
            [mtId]
        );
        if (forMt.length === 0) {
            console.log(`   (NONE addressed to id=${mtId})`);
        } else {
            forMt.forEach((n: any) => console.log(`   - [${n.id}] role=${n.recipient_role} | ${n.title} | read=${n.is_read} | ${n.created_at}`));
        }
    }

    // 7. TEST INSERT (safe - will be rolled back if column missing)
    console.log('\n7. TEST INSERT into notifications:');
    try {
        const [r]: any = await pool.query(
            `INSERT INTO notifications (recipient_id, recipient_role, title, message, type, reference_id, is_read, notif_category)
             VALUES ('DIAG_TEST', 'main_technician', 'Diagnostic Test', 'Safe to delete', 'system', NULL, 0, 'main_technician')`
        );
        console.log(`   >>> INSERT SUCCESS! New id=${r.insertId}`);
        // Clean up
        await pool.query(`DELETE FROM notifications WHERE id = ?`, [r.insertId]);
        console.log('   (test row deleted)');
    } catch (e: any) {
        console.log(`   !!! INSERT FAILED: ${e.message}`);
        console.log('       This confirms why Main Tech bell is empty.');
    }

    // 8. Check error_log.txt for notification insert errors
    console.log('\n8. RECENT createNotification ERRORS (from DB ERROR log entries):');
    try {
        const fs = await import('fs');
        const logPath = path.resolve(process.cwd(), 'error_log.txt');
        if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf8');
            const lines = content.split('\n').filter((l: string) => l.includes('DB ERROR') || l.includes('notif_category') || l.includes('Out of range'));
            const recent = lines.slice(-15);
            if (recent.length === 0) console.log('   (no DB ERROR entries found in error_log.txt)');
            else recent.forEach((l: string) => console.log('   ' + l));
        } else {
            console.log(`   (no error_log.txt at ${logPath})`);
        }
    } catch (e: any) {
        console.log(`   (could not read error_log: ${e.message})`);
    }

    console.log('\n=== DIAGNOSTIC COMPLETE ===');
    await pool.end();
}

run().catch(e => { console.error('Diagnostic fatal error:', e); process.exit(1); });
