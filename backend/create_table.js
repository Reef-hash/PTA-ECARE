const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTable() {
    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected! Creating activation_otps table...');
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activation_otps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin', 'technician') NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        console.log('Table created successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

createTable();
