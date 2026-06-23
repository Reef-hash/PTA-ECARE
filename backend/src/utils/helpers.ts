import { supabaseAdmin } from '../config/supabase.js';

export async function generateReportNumber(): Promise<string> {
    // Get the highest report number that matches the Axxxxx pattern
    // We need to find the max report_number that starts with a letter
    const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('report_number')
        .like('report_number', 'PTAS%')  // Only get reports starting with PTAS
        .order('report_number', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching last report number:', error);
        throw new Error('Failed to generate report number');
    }

    let nextNumber = 1;
    let letterPrefix = 'PTAS';

    if (data && data.length > 0) {
        const lastReport = data[0].report_number;
        const match = lastReport.match(/^([A-Z]+)(\d+)$/);

        if (match) {
            const letters = match[1];
            const num = parseInt(match[2], 10);

            if (num < 99999) {
                letterPrefix = letters;
                nextNumber = num + 1;
            } else {
                // Increment letter prefix
                if (letters.length === 1) {
                    if (letters === 'Z') {
                        letterPrefix = 'AA';
                    } else {
                        letterPrefix = String.fromCharCode(letters.charCodeAt(0) + 1);
                    }
                } else {
                    const lastChar = letters.charAt(letters.length - 1);
                    if (lastChar === 'Z') {
                        letterPrefix = String.fromCharCode(letters.charCodeAt(0) + 1) + 'A';
                    } else {
                        letterPrefix = letters.charAt(0) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
                    }
                }
                nextNumber = 1;
            }
        }
    }

    return `${letterPrefix}${nextNumber.toString().padStart(5, '0')}`;
}

export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ms-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('ms-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatNotificationDate(date: Date | string): string {
    const d = new Date(date);
    // Format: 03 Feb 2026 at 04:30 PM
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `${day} ${month} ${year} at ${time}`;
}
