import pool from './src/config/mysql';

async function run() {
    try {
        const [complaint]: any = await pool.query("SELECT id, status, assigned_to FROM complaints WHERE report_number = 'PTAS00012'");
        console.log("Complaint:", complaint);
        
        if (complaint && complaint.length > 0) {
            const [techRemarks]: any = await pool.query("SELECT * FROM technician_remarks WHERE complaint_id = ?", [complaint[0].id]);
            console.log("Tech Remarks:", techRemarks);
            
            const [compRemarks]: any = await pool.query("SELECT * FROM complaint_remarks WHERE complaint_id = ?", [complaint[0].id]);
            console.log("Admin/Complaint Remarks:", compRemarks);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
