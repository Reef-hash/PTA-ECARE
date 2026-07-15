import pool from '../config/mysql.js';

export async function generateReportNumber(): Promise<string> {
    const [rows]: any = await pool.query(
        `SELECT report_number FROM complaints WHERE report_number LIKE 'PTAS%'`
    );

    const letterPrefix = 'PTAS';
    let nextNumber = 1;

    if (rows && rows.length > 0) {
        const numbers = rows
            .map((row: any) => {
                const match = row.report_number.match(/^PTAS(\d+)$/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter((num: any): num is number => num !== null)
            .sort((a: number, b: number) => a - b);

        for (let i = 0; i < numbers.length; i++) {
            if (numbers[i] > nextNumber) {
                break;
            } else if (numbers[i] === nextNumber) {
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
