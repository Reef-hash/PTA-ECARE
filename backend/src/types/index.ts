// TypeScript type definitions for E-CARE system

export interface User {
    id: string;
    full_name: string;
    email: string | null;
    ic_number: string;
    google_sub?: string | null;
    auth_provider?: 'password' | 'google';
    email_verified?: boolean;
    google_picture?: string | null;
    contact_no: string;
    contact_no_2: string | null;
    address: string;
    state: string | null;
    country: string;
    pincode: string | null;
    user_image: string | null;
    status: 'Active' | 'Inactive' | 'Suspended';
    created_at: string;
    updated_at: string;
}

export interface Admin {
    id: string;
    username: string;
    admin_name: string;
    email: string;
    contact_number: number;
    created_at: string;
    updated_at: string;
}

export interface Technician {
    id: string;
    name: string;
    department: string;
    email: string;
    contact_number: number;
    username: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Subcategory {
    id: number;
    category_id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Brand {
    id: number;
    category_id: number | null;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface State {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Complaint {
    id: number;
    user_id: string;
    category_id: number | null;
    subcategory: string;
    complaint_type: 'Under Warranty' | 'Over Warranty';
    state: string;
    brand_name: string;
    model_no: string | null;
    details: string;
    warranty_file: string | null;
    receipt_file: string | null;
    status: 'pending' | 'in_process' | 'closed';
    report_number: string;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    user?: User;
    category?: Category;
    technician?: Technician;
}

export interface ComplaintRemark {
    id: number;
    complaint_id: number;
    status: 'pending' | 'in_process' | 'closed' | null;
    note_transport: string | null;
    checking: string | null;
    remark: string | null;
    remark_by: string | null;
    created_at: string;
}

export interface TechnicianRemark {
    id: number;
    complaint_id: number;
    remark: string | null;
    status: 'pending' | 'in_process' | 'closed' | null;
    note_transport: string | null;
    checking: string | null;
    remark_by: string | null;
    created_at: string;
}

export interface ForwardHistory {
    id: number;
    complaint_id: number;
    forward_from: string | null;
    forward_to: string | null;
    created_at: string;
    technician?: Technician;
}

export interface UserLog {
    id: number;
    user_id: string | null;
    username: string;
    user_ip: string;
    success: boolean;
    login_time: string;
}

export interface PasswordReset {
    id: number;
    user_id: string;
    otp: string;
    expires_at: string;
    created_at: string;
}

// API Request/Response types
export interface LoginRequest {
    ic_number?: string;
    username?: string;
    password: string;
    role: 'user' | 'admin' | 'technician' | 'main_technician';
}

export interface RegisterRequest {
    full_name: string;
    ic_number: string;
    email?: string;
    contact_no: string;
    contact_no_2?: string;
    address: string;
    state?: string;
    password: string;
}

export interface GoogleAuthRequest {
    credential: string;
    full_name?: string;
    ic_number?: string;
    contact_no?: string;
    contact_no_2?: string;
    address?: string;
    state?: string;
}

export interface CreateComplaintRequest {
    category_id: number;
    subcategory: string;
    complaint_type: 'Under Warranty' | 'Over Warranty';
    state: string;
    brand_name: string;
    model_no?: string;
    details: string;
}

export interface AddRemarkRequest {
    note_transport?: string;
    checking?: string;
    remark?: string;
    status?: 'pending' | 'in_process' | 'closed';
}

export interface ForwardComplaintRequest {
    technician_id: string;
}
export interface JwtPayload {
    id: string;
    role: 'user' | 'admin' | 'technician';
    username?: string;
    ic_number?: string;
}

export interface DashboardStats {
    total: number;
    pending: number;
    in_process: number;
    closed: number;
    not_forwarded: number;
    assigned: number;
    cancelled: number;
}

export interface TechnicianStats {
    technician_id: string;
    technician_name: string;
    department: string;
    total: number;
    pending: number;
    in_process: number;
    closed: number;
}
