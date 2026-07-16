import dotenv from 'dotenv';
import path from 'path';
import pool from './config/mysql.js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    try {
        console.log('1. Backing up table...');
        await pool.query('DROP TABLE IF EXISTS notifications_backup');
        await pool.query('CREATE TABLE notifications_backup AS SELECT * FROM notifications');
        console.log('Backup created successfully.');

        console.log('2. Adding notif_category column...');
        const [columns]: any = await pool.query(`SHOW COLUMNS FROM notifications LIKE 'notif_category'`);
        if (columns.length === 0) {
            await pool.query(`ALTER TABLE notifications ADD COLUMN notif_category ENUM('customer', 'technician', 'main_technician') DEFAULT 'customer'`);
            console.log('Column notif_category added.');
        } else {
            console.log('Column notif_category already exists.');
        }

        console.log('3. Running smart migration for existing Admin notifications...');
        
        const [techResult]: any = await pool.query(`
            UPDATE notifications 
            SET notif_category = 'technician' 
            WHERE recipient_role = 'admin' 
              AND (type = 'status_update' OR type = 'status_update_detailed') 
              AND title NOT LIKE '%batal%'
        `);
        console.log(`Migrated ${techResult.affectedRows} rows to 'technician'.`);

        const [mainTechResult]: any = await pool.query(`
            UPDATE notifications 
            SET notif_category = 'main_technician' 
            WHERE recipient_role = 'admin' 
              AND (type = 'assignment' OR message LIKE '%diagih%' OR message LIKE '%incomplete dihantar oleh juruteknik%')
        `);
        console.log(`Migrated ${mainTechResult.affectedRows} rows to 'main_technician'.`);

        console.log('\\n--- AUDIT REPORT ---');
        const [report]: any = await pool.query(`
            SELECT notif_category, COUNT(*) as count 
            FROM notifications 
            WHERE recipient_role = 'admin' 
            GROUP BY notif_category
        `);
        
        let total = 0;
        report.forEach((row: any) => {
            console.log(`- ${row.notif_category}: ${row.count}`);
            total += row.count;
        });
        console.log(`Total Admin Notifications: ${total}`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
