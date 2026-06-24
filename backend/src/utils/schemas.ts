import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    ic_number: z.string().length(12, 'IC number must be 12 digits').regex(/^\d+$/, 'IC number must contain only digits'),
    email: z.string().email('Email is required'),
    contact_no: z.string().min(10, 'Invalid phone number'),
    contact_no_2: z.string().optional(),
    address: z.string().min(5, 'Address is required'),
    state: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
    ic_number: z.string().optional(),
    username: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    role: z.enum(['user', 'admin', 'technician']),
}).refine(data => data.ic_number || data.username, {
    message: 'IC number or username is required',
});

export const googleAuthSchema = z.object({
    credential: z.string().min(1, 'Google credential is required').optional(),
    supabase_access_token: z.string().min(1, 'Supabase access token is required').optional(),
    full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    ic_number: z.string().length(12, 'IC number must be 12 digits').regex(/^\d+$/, 'IC number must contain only digits').optional(),
    contact_no: z.string().min(10, 'Invalid phone number').optional(),
    contact_no_2: z.string().optional(),
    address: z.string().min(5, 'Address is required').optional(),
    state: z.string().optional(),
    intent: z.enum(['login', 'register']).optional(),
}).refine(data => data.credential || data.supabase_access_token, {
    message: 'Google credential or Supabase access token is required',
});

export const forgotPasswordSchema = z.object({
    ic_number: z.string().optional(),
    email: z.string().email().optional(),
}).refine(data => data.ic_number || data.email, {
    message: 'IC number or email is required',
});

export const verifyOtpSchema = z.object({
    ic_number: z.string().optional(),
    email: z.string().email().optional(),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resetPasswordSchema = z.object({
    ic_number: z.string().optional(),
    email: z.string().email().optional(),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Complaint schemas
export const createComplaintSchema = z.object({
    category_id: z.number().int().positive(),
    subcategory: z.string().min(1, 'Subcategory is required'),
    complaint_type: z.enum(['Under Warranty', 'Over Warranty']),
    state: z.string().min(1, 'State is required'),
    brand_name: z.string().min(1, 'Brand is required'),
    model_no: z.string().optional(),
    details: z.string().min(10, 'Details must be at least 10 characters').max(2000, 'Details cannot exceed 2000 characters'),
});

export const addRemarkSchema = z.object({
    note_transport: z.string().optional(),
    checking: z.string().optional(),
    remark: z.string().optional(),
    status: z.union([
        z.enum(['pending', 'in_process', 'closed', 'cancelled', 'incomplete', 'ready_pickup']),
        z.literal('')
    ]).optional(),
});

export const forwardComplaintSchema = z.object({
    technician_id: z.string().uuid('Invalid technician ID'),
    status: z.enum(['pending', 'in_process', 'closed', 'cancelled', 'incomplete', 'ready_pickup']).optional(),
});

// User schemas
export const updateProfileSchema = z.object({
    full_name: z.string().min(2).optional(),
    email: z.string().email().optional().or(z.literal('')),
    contact_no: z.string().min(10).optional(),
    contact_no_2: z.string().optional(),
    address: z.string().min(5).optional(),
    state: z.string().optional(),
    ic_number: z.string().length(12, 'IC number must be 12 digits').optional(),
});

export const changePasswordSchema = z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(6, 'New password must be at least 6 characters'),
});

// Admin schemas
export const createTechnicianSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    department: z.string().min(2, 'Department is required'),
    email: z.string().email('Invalid email'),
    contact_number: z.number().int().positive(),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateTechnicianSchema = z.object({
    name: z.string().min(2).optional(),
    department: z.string().min(2).optional(),
    email: z.string().email().optional(),
    contact_number: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
});

export const updateUserStatusSchema = z.object({
    status: z.enum(['Active', 'Inactive', 'Suspended']),
});

export const createUserSchema = z.object({
    full_name: z.string().min(2, 'Nama mestilah sekurang-kurangnya 2 aksara'),
    ic_number: z.string().length(12, 'No IC mestilah 12 digit').regex(/^\d+$/, 'No IC hanya mengandungi digit'),
    email: z.string().email('E-mel tidak sah').optional().or(z.literal('')),
    contact_no: z.string().min(10, 'No telefon tidak sah'),
    contact_no_2: z.string().min(10, 'No telefon 2 tidak sah'),
    address: z.string().min(5, 'Alamat diperlukan'),
    state: z.string().optional(),
    password: z.string().min(6, 'Kata laluan mestilah sekurang-kurangnya 6 aksara'),
});

// Master data schemas
export const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

export const subcategorySchema = z.object({
    category_id: z.number().int().positive(),
    name: z.string().min(1, 'Name is required'),
});

export const brandSchema = z.object({
    category_id: z.number().int().positive().optional(),
    name: z.string().min(1, 'Name is required'),
});

export const stateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

// New OTP / Activation schemas
export const verifySignupOtpSchema = z.object({
    email: z.string().email('Invalid email'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const verifyActivationOtpSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    role: z.enum(['admin', 'technician']),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resendActivationOtpSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    role: z.enum(['admin', 'technician']),
});
