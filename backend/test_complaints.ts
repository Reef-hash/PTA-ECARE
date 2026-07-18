import pool from './src/config/mysql';

async function run() {
    try {
        const [rows]: any = await pool.query(
            SELECT c.report_number, c.status, c.assigned_to,
                COALESCE(t.id, (
                    SELECT t2.id FROM forward_history fh 
                    JOIN technicians t2 ON fh.forward_to = t2.id 
                    WHERE fh.complaint_id = c.id 
                    ORDER BY fh.created_at DESC LIMIT 1
                )) as tech_id, 
                COALESCE(t.name, (
                    SELECT t2.name FROM forward_history fh 
                    JOIN technicians t2 ON fh.forward_to = t2.id 
                    WHERE fh.complaint_id = c.id 
                    ORDER BY fh.created_at DESC LIMIT 1
                )) as tech_name
            FROM complaints c
            LEFT JOIN technicians t ON c.assigned_to = t.id
            WHERE c.report_number = 'PTAS00001'
        );
        console.log('Result:', rows);

        const [fh]: any = await pool.query(SELECT * FROM forward_history WHERE complaint_id = (SELECT id FROM complaints WHERE report_number = 'PTAS00001'));
        console.log('Forward history:', fh);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
