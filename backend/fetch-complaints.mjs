import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchComplaints() {
    const { data: complaints, error } = await supabase
        .from('complaints')
        .select(`
            id, 
            report_number, 
            complaint_type, 
            status, 
            created_at,
            users ( full_name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching complaints:', error.message);
        return;
    }

    fs.writeFileSync('complaints_dump.json', JSON.stringify(complaints, null, 2));
    console.log(`Saved ${complaints.length} complaints to complaints_dump.json`);
}

fetchComplaints();
