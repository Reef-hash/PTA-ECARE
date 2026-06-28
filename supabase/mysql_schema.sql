-- ============================================
-- PTA SERVICES - E-CARE Database Schema
-- MySQL (phpMyAdmin)
-- ============================================

CREATE DATABASE IF NOT EXISTS ecare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecare_db;

-- ============================================
-- TABLES
-- ============================================

-- 1. Users (Pelanggan)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    ic_number VARCHAR(12) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    google_sub VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(20) DEFAULT 'password',
    email_verified BOOLEAN DEFAULT FALSE,
    google_picture TEXT,
    contact_no VARCHAR(15) NOT NULL,
    contact_no_2 VARCHAR(15),
    address TEXT NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Malaysia',
    pincode VARCHAR(20),
    user_image TEXT,
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Admins
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    admin_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_number BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Technicians (Juruteknik)
CREATE TABLE IF NOT EXISTS technicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_number BIGINT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Categories (Kategori Aduan)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Brands (Jenama)
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. States (Lokasi Pembelian)
CREATE TABLE IF NOT EXISTS states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. Complaints (Aduan)
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    category_id INT,
    subcategory VARCHAR(255) NOT NULL,
    complaint_type ENUM('Under Warranty', 'Over Warranty') NOT NULL,
    state VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    model_no VARCHAR(255),
    details TEXT NOT NULL,
    warranty_file TEXT,
    receipt_file TEXT,
    status ENUM('pending', 'in_process', 'closed', 'cancelled') DEFAULT 'pending',
    report_number VARCHAR(10) UNIQUE NOT NULL,
    assigned_to INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 9. Complaint Remarks (Catatan Admin)
CREATE TABLE IF NOT EXISTS complaint_remarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT,
    status ENUM('pending', 'in_process', 'closed', 'cancelled'),
    note_transport TEXT,
    checking TEXT,
    remark TEXT,
    remark_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Technician Remarks (Catatan Juruteknik)
CREATE TABLE IF NOT EXISTS technician_remarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT,
    remark TEXT,
    status ENUM('pending', 'in_process', 'closed', 'cancelled'),
    note_transport TEXT,
    checking TEXT,
    remark_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (remark_by) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. Forward History (Sejarah Agihan)
CREATE TABLE IF NOT EXISTS forward_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT,
    forward_from INT,
    forward_to INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (forward_to) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. User Logs (Log Aktiviti)
CREATE TABLE IF NOT EXISTS user_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(100) NOT NULL,
    user_ip VARCHAR(45) NOT NULL,
    success TINYINT(1) DEFAULT 0,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 13. Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    otp VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    recipient_role VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    reference_id INT,
    type VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_ic_number ON users(ic_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_sub ON users(google_sub);
CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX idx_complaints_report_number ON complaints(report_number);
CREATE INDEX idx_complaint_remarks_complaint_id ON complaint_remarks(complaint_id);
CREATE INDEX idx_technician_remarks_complaint_id ON technician_remarks(complaint_id);
CREATE INDEX idx_forward_history_complaint_id ON forward_history(complaint_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- DEFAULT DATA - CATEGORIES
-- ============================================

INSERT INTO categories (name, description) VALUES
('LAPORAN KEROSAKAN PELANGGAN', 'Laporan kerosakan barangan elektrik daripada pelanggan'),
('SERVIS AIRCOND', 'Servis dan penyelenggaraan aircond'),
('SERVIS CUCIAN', 'Servis cucian barangan elektrik'),
('Other', 'Kategori lain');

-- ============================================
-- DEFAULT DATA - SUBCATEGORIES (51 items)
-- ============================================

INSERT INTO subcategories (category_id, name) VALUES
(1, 'Mesin Basuh'),
(1, 'PETI'),
(1, 'DRYER'),
(1, 'FREEZER'),
(1, 'JAM AZAN MASJID'),
(1, 'WATER HEATER'),
(1, 'TV (50\" ke atas)'),
(1, 'AIRCOND'),
(1, 'KIPAS SILING/DINDING'),
(1, 'VACUUM'),
(1, 'AIR COOLER'),
(1, 'SERVICE'),
(1, 'WIRING'),
(1, 'JUICER'),
(1, 'WATER JET'),
(1, 'AIR FRYER'),
(1, 'HAIR DRYER'),
(1, 'BREADMAKER'),
(1, 'THERMOPOT'),
(1, 'WATER DISPENSER'),
(1, 'WATER PUMP'),
(1, 'KETTLE JUG'),
(1, 'STEAMER'),
(1, 'ANDROID BOX'),
(1, 'HAND MIXER'),
(1, 'AIR PURIFIER'),
(1, 'SEALER'),
(1, 'SPEAKER'),
(1, 'JAM'),
(1, 'HOOD'),
(1, 'HOME THEATER'),
(1, 'INSECT KILLER'),
(1, 'GRILL PAN'),
(1, 'CCTV'),
(1, 'LAMPU'),
(1, 'AUTOGATE'),
(1, 'CHILLER'),
(1, 'EKZOS FAN'),
(1, 'NETWORK'),
(1, 'TRANSPORT'),
(2, 'AIRCOND SILING CASSETE'),
(2, 'AIRCOND WALL MOUNTED'),
(3, 'MESIN PENGERING'),
(4, 'LAIN-LAIN');

-- ============================================
-- DEFAULT DATA - BRANDS (66 items)
-- ============================================

INSERT INTO brands (category_id, name) VALUES
(1, 'ACSON'),
(1, 'AUX'),
(1, 'BLACK SPIDER'),
(1, 'CORNELL'),
(1, 'DAIKIN'),
(1, 'DAEWOOD'),
(1, 'DEKA'),
(1, 'DAHUA'),
(1, 'ELECTROLUX'),
(1, 'ELBA'),
(1, 'EPAY'),
(1, 'FABER'),
(1, 'HITEC'),
(1, 'HAIER'),
(1, 'HISENSE'),
(1, 'HITACHI'),
(1, 'HIKVISION'),
(1, 'HESSTAR'),
(1, 'ISONIC'),
(1, 'I SLIDE'),
(1, 'JOVEN'),
(1, 'JASMA'),
(1, 'KHIND'),
(1, 'KDK'),
(1, 'KARCHER'),
(1, 'LG'),
(1, 'MIDEA'),
(1, 'MORGAN'),
(1, 'MECK'),
(1, 'MILUX'),
(1, 'MITSUBISHI'),
(1, 'MAHITA'),
(1, 'MAYER'),
(1, 'MI'),
(1, 'NOXXA'),
(1, 'NATIONAL'),
(1, 'NEW BUTTERFLY'),
(1, 'PHILIPS'),
(1, 'PENSONIC'),
(1, 'PTIME'),
(1, 'PROMAS'),
(1, 'TOPAIRE'),
(1, 'PRIMADA'),
(1, 'PHISON'),
(1, 'PANASONIC'),
(1, 'RUIJIE'),
(1, 'REGAIR'),
(1, 'SHARP'),
(1, 'TELEFUNKEN'),
(1, 'SONY'),
(1, 'AIWA'),
(1, 'SINGER'),
(1, 'SAMSUNG'),
(1, 'SKYWORTH'),
(1, 'STANLEY'),
(1, 'SNOW'),
(1, 'SANKYO'),
(1, 'SANDEN'),
(1, 'TOSHIBA'),
(1, 'TRIO'),
(1, 'THE BAKER'),
(1, 'TOKAI'),
(1, 'TCL'),
(1, 'UNIVERSAL'),
(1, 'ZANUSSI'),
(1, 'ASTRO');

-- ============================================
-- DEFAULT DATA - STATES (Lokasi Pembelian)
-- ============================================

INSERT INTO states (name, description) VALUES
('KAMPUNG RAJA (BESUT)', 'Cawangan Kampung Raja, Besut'),
('SETIU (TERENGGANU)', 'Cawangan Setiu, Terengganu'),
('JERTEH (TERENGGANU)', 'Cawangan Jerteh, Terengganu');

-- ============================================
-- DEFAULT ADMIN (password: admin123)
-- Password hash generated with bcrypt for 'admin123'
-- ============================================

INSERT INTO admins (username, password_hash, admin_name, email, contact_number) VALUES
('admin', '$2b$10$8K1MqJ6qGq1JW5lW5Kz5XuYz3UxWJHK8v0RAEMYwjvL1G.6xkWyai', 'System Administrator', 'adminecare.ptasssb@gmail.com', 0123456789);
