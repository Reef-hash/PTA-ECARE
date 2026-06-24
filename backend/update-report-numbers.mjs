import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateReportNumbers() {
    console.log('Fetching complaints starting with A...');
    const { data: complaints, error } = await supabase
        .from('complaints')
        .select('id, report_number')
        .like('report_number', 'A%')
        .not('report_number', 'like', 'PTAS%');

    if (error) {
        console.error('Error fetching complaints:', error.message);
        return;
    }

    if (!complaints || complaints.length === 0) {
        console.log('No complaints found that need updating.');
        return;
    }

    console.log(`Found ${complaints.length} complaints to update.`);

    let successCount = 0;
    for (const c of complaints) {
        // e.g. A00012
        if (c.report_number.startsWith('A') && c.report_number.length === 6) {
            const newReportNumber = c.report_number.replace('A', 'PTAS');
            console.log(`Updating ${c.report_number} -> ${newReportNumber}`);
            
            const { error: updateError } = await supabase
                .from('complaints')
                .update({ report_number: newReportNumber })
                .eq('id', c.id);
            
            if (updateError) {
                console.error(`Failed to update ${c.report_number}:`, updateError.message);
            } else {
                successCount++;
            }
        }
    }

    console.log(`Update complete! Successfully updated ${successCount} complaints.`);
}

updateReportNumbers();
