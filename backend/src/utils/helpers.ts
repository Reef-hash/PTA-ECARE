import { supabaseAdmin } from '../config/supabase.js';

export async function generateReportNumber(): Promise<string> {
    const { data, error } = await supabaseAdmin
        .from('complaints')
        .select('report_number')
        .like('report_number', 'PTAS%');

    if (error) {
        console.error('Error fetching report numbers:', error);
        throw new Error('Failed to generate report number');
    }

    const letterPrefix = 'PTAS';
    let nextNumber = 1;

    if (data && data.length > 0) {
        // Extract the numerical parts and sort them
        const numbers = data
            .map(row => {
                const match = row.report_number.match(/^PTAS(\d+)$/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter((num): num is number => num !== null)
            .sort((a, b) => a - b);

        // Find the first missing number (gap) in the sequence starting from 1
        for (let i = 0; i < numbers.length; i++) {
            if (numbers[i] > nextNumber) {
                // Gap found! nextNumber is the missing number
                break;
            } else if (numbers[i] === nextNumber) {
                // Number exists, increment our expected nextNumber
                nextNumber++;
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
