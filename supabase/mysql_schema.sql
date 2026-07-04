-- ============================================
-- PTA SERVICES - E-CARE Database Schema
-- MySQL (phpMyAdmin)
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- 1. Users (Pelanggan)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
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
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    phone_number VARCHAR(50),
    password_plain TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Admins
CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    admin_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_number BIGINT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Technicians (Juruteknik)
CREATE TABLE IF NOT EXISTS technicians (
    id VARCHAR(36) PRIMARY KEY,
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
    user_id VARCHAR(36),
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
    assigned_to VARCHAR(36),
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
    remark_by VARCHAR(36),
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
    remark_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (remark_by) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. Forward History (Sejarah Agihan)
CREATE TABLE IF NOT EXISTS forward_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT,
    forward_from VARCHAR(36),
    forward_to VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (forward_to) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. User Logs (Log Aktiviti)
CREATE TABLE IF NOT EXISTS user_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36),
    username VARCHAR(100) NOT NULL,
    user_ip VARCHAR(45) NOT NULL,
    success TINYINT(1) DEFAULT 0,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 13. Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36),
    otp VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
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


