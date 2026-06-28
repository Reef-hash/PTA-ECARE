-- ============================================
-- PTA SERVICES - E-CARE Database Schema
-- Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_status AS ENUM ('Active', 'Inactive', 'Suspended');
CREATE TYPE complaint_status AS ENUM ('pending', 'in_process', 'closed');
CREATE TYPE warranty_type AS ENUM ('Under Warranty', 'Over Warranty');

-- ============================================
-- TABLES
-- ============================================

-- 1. Users (Pelanggan)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    status user_status DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Admins
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    admin_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Technicians (Juruteknik)
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_number BIGINT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Categories (Kategori Aduan)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subcategories
CREATE TABLE subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Brands (Jenama)
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. States (Lokasi Pembelian)
CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Complaints (Aduan)
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    subcategory VARCHAR(255) NOT NULL,
    complaint_type warranty_type NOT NULL,
    state VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    model_no VARCHAR(255),
    details TEXT NOT NULL,
    warranty_file TEXT,
    receipt_file TEXT,
    status complaint_status DEFAULT 'pending',
    report_number VARCHAR(10) UNIQUE NOT NULL,
    assigned_to UUID REFERENCES technicians(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Complaint Remarks (Catatan Admin)
CREATE TABLE complaint_remarks (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    status complaint_status,
    note_transport TEXT,
    checking TEXT,
    remark TEXT,
    remark_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Technician Remarks (Catatan Juruteknik)
CREATE TABLE technician_remarks (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    remark TEXT,
    status complaint_status,
    note_transport TEXT,
    checking TEXT,
    remark_by UUID REFERENCES technicians(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Forward History (Sejarah Agihan)
CREATE TABLE forward_history (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    forward_from UUID,
    forward_to UUID REFERENCES technicians(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. User Logs (Log Aktiviti)
CREATE TABLE user_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    user_ip VARCHAR(45) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Password Resets
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REPORT NUMBER SEQUENCE & FUNCTION
-- ============================================

CREATE SEQUENCE report_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
    seq_val INTEGER;
    letter_prefix TEXT;
    num_part INTEGER;
BEGIN
    seq_val := nextval('report_number_seq');
    
    IF seq_val <= 99999 THEN
        -- A00001 to A99999
        letter_prefix := 'A';
        num_part := seq_val;
    ELSIF seq_val <= 99999 * 26 THEN
        -- B00001 to Z99999
        letter_prefix := CHR(65 + ((seq_val - 1) / 99999));
        num_part := ((seq_val - 1) % 99999) + 1;
    ELSE
        -- AA00001 onwards
        seq_val := seq_val - (99999 * 26);
        letter_prefix := CHR(65 + ((seq_val - 1) / 99999 / 26)) || CHR(65 + (((seq_val - 1) / 99999) % 26));
        num_part := ((seq_val - 1) % 99999) + 1;
    END IF;
    
    RETURN letter_prefix || LPAD(num_part::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

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
(1, 'TV (50" ke atas)'),
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
-- ============================================

INSERT INTO admins (username, password_hash, admin_name, email, contact_number) VALUES
('admin', '$2b$10$YourHashedPasswordHere', 'System Administrator', 'adminecare.ptasssb@gmail.com', 0123456789);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_remarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own complaints
CREATE POLICY "Users can view own complaints" ON complaints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create complaints" ON complaints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- 1. Create bucket: warranty-docs
-- 2. Create bucket: receipt-docs  
-- 3. Create bucket: user-images
-- Set all buckets to public for reading
