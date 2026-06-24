import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAll() {
    console.log('⚠️ DELETING ALL COMPLAINTS AND RELATED DATA...');

    // 1. Delete technician remarks
    console.log('Deleting technician remarks...');
    await supabase.from('technician_remarks').delete().neq('id', 0);

    // 2. Delete complaint remarks
    console.log('Deleting complaint remarks...');
    await supabase.from('complaint_remarks').delete().neq('id', 0);

    // 3. Delete notifications
    console.log('Deleting notifications...');
    await supabase.from('notifications').delete().neq('id', 0);

    // 4. Delete complaints
    console.log('Deleting complaints...');
    const { error, count } = await supabase.from('complaints').delete().neq('id', 0);

    if (error) {
        console.error('❌ Error deleting complaints:', error.message);
    } else {
        console.log(`✅ All complaints deleted successfully!`);
        console.log(`\nNext complaint report number will be: PTAS00001`);
        console.log(`\nIMPORTANT: To reset the internal database ID back to 1, run this command in your Supabase SQL Editor:`);
        console.log(`ALTER SEQUENCE complaints_id_seq RESTART WITH 1;`);
    }
}

resetAll();
