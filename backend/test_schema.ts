import pool from './src/config/mysql';

async function run() {
    try {
        const [techs]: any = await pool.query("DESCRIBE technicians");
        console.log("Technicians schema:", techs);
        const [admins]: any = await pool.query("DESCRIBE admins");
        console.log("Admins schema:", admins);
        const [users]: any = await pool.query("DESCRIBE users");
        console.log("Users schema:", users);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
