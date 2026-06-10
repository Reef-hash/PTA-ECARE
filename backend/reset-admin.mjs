
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
    console.log('Resetting admin password to "admin123"...');

    try {
        const hash = await bcrypt.hash('admin123', 10);

        const { data, error } = await supabase
            .from('admins')
            .update({ password_hash: hash })
            .eq('username', 'admin')
            .select();

        if (error) {
            console.error('Supabase update error:', error);
        } else if (data && data.length > 0) {
            console.log('Success! Admin password updated.');
        } else {
            console.log('No admin user found with username "admin". Creating one...');
            // Optional: Create if missing
            const { error: insertError } = await supabase
                .from('admins')
                .insert({
                    username: 'admin',
                    password_hash: hash,
                    admin_name: 'System Administrator',
                    email: 'ptaservicedept@gmail.com',
                    contact_number: 1234567890
                });

            if (insertError) console.error('Insert error:', insertError);
            else console.log('Admin user created with password "admin123".');
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}

resetAdminPassword();
