import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMainTechnician() {
    console.log('Creating main technician account...');

    try {
        const hash = await bcrypt.hash('Tech#2026', 10);
        const email = 'technicianasign@gmail.com';

        // Check if technician already exists
        const { data: existing } = await supabase
            .from('technicians')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            // Update password and username
            const { error } = await supabase
                .from('technicians')
                .update({ password_hash: hash, username: 'maintech' })
                .eq('email', email);

            if (error) console.error('Update error:', error);
            else console.log('Main Technician password updated to "Tech#2026".');
        } else {
            // Create new technician
            const { error } = await supabase
                .from('technicians')
                .insert({
                    name: 'Main Technician',
                    department: 'Main Tech Dept',
                    email: email,
                    contact_number: 123456789,
                    username: 'maintech',
                    password_hash: hash,
                    is_active: true
                });

            if (error) console.error('Insert error:', error);
            else console.log('Main Technician created successfully!');
        }

        console.log('\nMain Technician Credentials:');
        console.log(`  Email: ${email}`);
        console.log(`  Username: maintech`);
        console.log('  Password: Tech#2026');
    } catch (err) {
        console.error('Script error:', err);
    }
}

createMainTechnician();
