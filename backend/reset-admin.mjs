
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAdminPassword() {
    const NEW_ADMIN_EMAIL = 'adminecare.ptasssb@gmail.com';
    const NEW_ADMIN_PASSWORD = 'Admin#2026';

    console.log(`Resetting admin email to "${NEW_ADMIN_EMAIL}" and password to "${NEW_ADMIN_PASSWORD}"...`);

    try {
        const hash = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);

        const { data, error } = await supabase
            .from('admins')
            .update({ password_hash: hash, email: NEW_ADMIN_EMAIL })
            .eq('username', 'admin')
            .select();

        if (error) {
            console.error('Supabase update error:', error);
        } else if (data && data.length > 0) {
            console.log('Success! Admin email and password updated.');
            console.log('\nAdmin Credentials:');
            console.log(`  Username: admin`);
            console.log(`  Email:    ${NEW_ADMIN_EMAIL}`);
            console.log(`  Password: ${NEW_ADMIN_PASSWORD}`);
        } else {
            console.log('No admin user found with username "admin". Creating one...');
            // Optional: Create if missing
            const { error: insertError } = await supabase
                .from('admins')
                .insert({
                    username: 'admin',
                    password_hash: hash,
                    admin_name: 'System Administrator',
                    email: NEW_ADMIN_EMAIL,
                    contact_number: 1234567890
                });

            if (insertError) console.error('Insert error:', insertError);
            else {
                console.log('Admin user created.');
                console.log('\nAdmin Credentials:');
                console.log(`  Username: admin`);
                console.log(`  Email:    ${NEW_ADMIN_EMAIL}`);
                console.log(`  Password: ${NEW_ADMIN_PASSWORD}`);
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}

resetAdminPassword();
