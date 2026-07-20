import { Request, Response } from 'express';
import pool from '../config/mysql.js';
import { saveFile } from '../utils/storage.js';
import { generateReportNumber, formatNotificationDate } from '../utils/helpers.js';
import { createNotification, buildNotificationEmailHtml } from './notifications.controller.js';
import { sendEmail } from '../utils/email.js';

/** Resolve complaint by report_number (e.g. PTAS00001) */
async function resolveComplaint(reportNumber: string) {
    const [rows]: any = await pool.query('SELECT id FROM complaints WHERE report_number = ?', [reportNumber]);
    if (!rows || rows.length === 0) return null;
    return rows[0].id as number;
}

// Get technician dashboard stats (for logged-in technician)
export const getTechnicianDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const technicianId = req.user?.id;

        // Get all complaints assigned to this technician
        const [complaints]: any = await pool.query(
            'SELECT id, status FROM complaints WHERE assigned_to = ?', 
            [technicianId]
        );

        const stats = {
            total: complaints?.length || 0,
            pending: 0,
            in_process: 0,
            closed: 0,
            incomplete_in: 0,
            incomplete_out: 0,
        };

        complaints?.forEach((c: any) => {
            if (c.status === 'pending') stats.pending++;
            if (c.status === 'in_process') stats.in_process++;
            if (c.status === 'closed') stats.closed++;
            if (c.status === 'incomplete' || c.status === 'bawa_pulang') stats.incomplete_in++;
        });

        // Get count of incomplete cases that Ali surrendered in the past
        const [historyIncomplete]: any = await pool.query(
            'SELECT COUNT(DISTINCT complaint_id) as count FROM technician_remarks WHERE remark_by = ? AND status IN ("incomplete", "bawa_pulang")',
            [technicianId]
        );
        stats.incomplete_out = historyIncomplete[0]?.count || 0;

        res.json({ stats });
    } catch (error) {
        console.error('Get technician dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all complaints (filtered by role)
export const getComplaints = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        const { status, page = 1, limit = 10, search, from_date, to_date, assigned_to, user_id } = req.query;

        let queryParams: any[] = [];
        let whereClauses: string[] = ['1=1'];

        // Role-based filtering
        const view = req.query.view as string;

        if (role === 'user') {
            whereClauses.push('c.user_id = ?');
            queryParams.push(userId);
        } else if (role === 'technician') {
            if (view === 'history') {
                whereClauses.push('(c.assigned_to = ? OR c.id IN (SELECT complaint_id FROM technician_remarks WHERE remark_by = ? AND status IN ("incomplete", "bawa_pulang")))');
                queryParams.push(userId, userId);
            } else {
                whereClauses.push('c.assigned_to = ?');
                queryParams.push(userId);
            }
        } else if (role === 'admin') {
            if (assigned_to) {
                whereClauses.push('c.assigned_to = ?');
                queryParams.push(assigned_to);
            }
            if (user_id) {
                whereClauses.push('c.user_id = ?');
                queryParams.push(user_id);
            }
        }

        // Status filter
        if (status && status !== 'all') {
            if (status === 'not_forwarded') {
                whereClauses.push('c.status = "pending" AND c.assigned_to IS NULL');
            } else if (status === 'job_assigned') {
                whereClauses.push('c.status = "pending" AND c.assigned_to IS NOT NULL');
            } else if (status === 'incomplete') {
                whereClauses.push('c.status = "incomplete"');
            } else if (status === 'incomplete_not_assigned') {
                whereClauses.push('c.status = "incomplete" AND c.assigned_to IS NULL');
            } else if (status === 'incomplete_assigned') {
                whereClauses.push('c.status = "incomplete" AND c.assigned_to IS NOT NULL');
            } else if (status === 'incomplete_completed') {
                whereClauses.push('c.status = "closed" AND c.id IN (SELECT complaint_id FROM technician_remarks WHERE status IN ("incomplete", "bawa_pulang") UNION SELECT complaint_id FROM complaint_remarks WHERE status IN ("incomplete", "bawa_pulang"))');
            } else if (status === 'incomplete_in') {
                whereClauses.push('(c.status = "incomplete" OR c.status = "bawa_pulang")');
            } else if (status === 'incomplete_out') {
                whereClauses.push('c.id IN (SELECT complaint_id FROM technician_remarks WHERE remark_by = ? AND status IN ("incomplete", "bawa_pulang"))');
                queryParams.push(userId);
            } else {
                whereClauses.push('c.status = ?');
                queryParams.push(status);
            }
        }

        // Date range filter
        if (from_date) {
            whereClauses.push('c.created_at >= ?');
            queryParams.push(from_date);
        }
        if (to_date) {
            whereClauses.push('c.created_at <= ?');
            queryParams.push(to_date);
        }

        // Search by report number, IC number, customer name, or date
        if (search) {
            const searchTerm = String(search).trim();
            const searchConditions: string[] = [];
            
            searchConditions.push(`c.report_number LIKE ?`);
            const likeTerm = `%${searchTerm}%`;
            
            // Search users table
            const [matchedUsers]: any = await pool.query(
                'SELECT id FROM users WHERE ic_number LIKE ? OR full_name LIKE ?',
                [likeTerm, likeTerm]
            );
            
            if (matchedUsers.length > 0) {
                const matchedUserIds = matchedUsers.map((u: any) => `'${u.id}'`).join(',');
                searchConditions.push(`c.user_id IN (${matchedUserIds})`);
            }

            const datePatterns = [
                /^\d{4}-\d{2}-\d{2}$/,  
                /^\d{2}-\d{2}-\d{4}$/,  
                /^\d{2}\/\d{2}\/\d{4}$/, 
                /^\d{4}\/\d{2}\/\d{2}$/  
            ];

            const isDateLike = datePatterns.some(pattern => pattern.test(searchTerm));
            if (isDateLike) {
                let isoDate = searchTerm;
                if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(searchTerm)) {
                    const parts = searchTerm.split(/[-/]/);
                    isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(searchTerm)) {
                    isoDate = searchTerm.replace(/\//g, '-');
                }
                searchConditions.push(`c.created_at >= '${isoDate} 00:00:00'`);
            }

            whereClauses.push(`(${searchConditions.join(' OR ')})`);
            queryParams.push(likeTerm); // For c.report_number LIKE ?
        }

        const whereString = whereClauses.join(' AND ');

        // Pagination
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        // Fetch counts
        const [countResult]: any = await pool.query(
            `SELECT COUNT(*) as total FROM complaints c WHERE ${whereString}`,
            queryParams
        );
        const total = countResult[0].total;

        // Fetch paginated data
        const queryParamsWithPagination = [...queryParams, limitNum, offset];
        const [complaintsData]: any = await pool.query(
            `SELECT c.*, 
                u.id as user_id_join, u.full_name as user_full_name, u.ic_number as user_ic_number, u.contact_no as user_contact_no, u.address as user_address,
                cat.id as cat_id, cat.name as cat_name,
                COALESCE(t.id, (
                    SELECT tr.remark_by FROM technician_remarks tr 
                    WHERE tr.complaint_id = c.id AND tr.status IN ('incomplete', 'bawa_pulang')
                    ORDER BY tr.created_at DESC LIMIT 1
                ), (
                    SELECT fh.forward_to FROM forward_history fh 
                    WHERE fh.complaint_id = c.id 
                    ORDER BY fh.created_at DESC LIMIT 1
                )) as tech_id, 
                COALESCE(t.name, (
                    SELECT t3.name FROM technician_remarks tr 
                    JOIN technicians t3 ON tr.remark_by = t3.id 
                    WHERE tr.complaint_id = c.id AND tr.status IN ('incomplete', 'bawa_pulang')
                    ORDER BY tr.created_at DESC LIMIT 1
                ), (
                    SELECT t2.name FROM forward_history fh 
                    JOIN technicians t2 ON fh.forward_to = t2.id 
                    WHERE fh.complaint_id = c.id 
                    ORDER BY fh.created_at DESC LIMIT 1
                )) as tech_name, 
                t.department as tech_department, 
                t.username as tech_username
             FROM complaints c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN categories cat ON c.category_id = cat.id
             LEFT JOIN technicians t ON c.assigned_to = t.id
             WHERE ${whereString}
             ORDER BY c.updated_at DESC
             LIMIT ? OFFSET ?`,
            queryParamsWithPagination
        );

        // Fetch remarks and restructure response
        const mappedComplaints = await Promise.all(complaintsData.map(async (c: any) => {
            const [remarksData]: any = await pool.query(
                `SELECT id, status, note_transport, checking, remark, remark_by, created_at, 'admin' as source 
                 FROM complaint_remarks WHERE complaint_id = ?
                 UNION ALL
                 SELECT id, status, note_transport, checking, remark, remark_by, created_at, 'tech' as source 
                 FROM technician_remarks WHERE complaint_id = ?
                 ORDER BY created_at DESC`,
                [c.id, c.id]
            );

            return {
                id: c.id,
                user_id: c.user_id,
                category_id: c.category_id,
                subcategory: c.subcategory,
                complaint_type: c.complaint_type,
                state: c.state,
                brand_name: c.brand_name,
                model_no: c.model_no,
                details: c.details,
                warranty_file: c.warranty_file,
                receipt_file: c.receipt_file,
                status: c.status,
                assigned_to: c.assigned_to,
                report_number: c.report_number,
                created_at: c.created_at,
                updated_at: c.updated_at,
                users: c.user_id_join ? {
                    id: c.user_id_join,
                    full_name: c.user_full_name,
                    ic_number: c.user_ic_number,
                    contact_no: c.user_contact_no,
                    address: c.user_address
                } : null,
                categories: c.cat_id ? {
                    id: c.cat_id,
                    name: c.cat_name
                } : null,
                technicians: c.tech_id ? {
                    id: c.tech_id,
                    name: c.tech_name,
                    department: c.tech_department,
                    username: c.tech_username
                } : null,
                remarks: remarksData || []
            };
        }));

        res.json({
            complaints: mappedComplaints,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single complaint
export const getComplaint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;

        const complaintId = await resolveComplaint(id);
        if (!complaintId) {
            res.status(404).json({ error: 'Complaint not found' });
            return;
        }

        const [complaintRows]: any = await pool.query(
            `SELECT c.*, 
                u.id as user_id_join, u.full_name as user_full_name, u.ic_number as user_ic_number, u.contact_no as user_contact_no, u.contact_no_2 as user_contact_no_2, u.email as user_email, u.address as user_address, u.state as user_state,
                cat.id as cat_id, cat.name as cat_name,
                t.id as tech_id, t.name as tech_name, t.department as tech_department
             FROM complaints c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN categories cat ON c.category_id = cat.id
             LEFT JOIN technicians t ON c.assigned_to = t.id
             WHERE c.id = ?`,
            [complaintId]
        );

        const c = complaintRows[0];
        if (!c) {
            res.status(404).json({ error: 'Complaint not found' });
            return;
        }

        const complaint = {
            id: c.id,
            user_id: c.user_id,
            category_id: c.category_id,
            subcategory: c.subcategory,
            complaint_type: c.complaint_type,
            state: c.state,
            brand_name: c.brand_name,
            model_no: c.model_no,
            details: c.details,
            warranty_file: c.warranty_file,
            receipt_file: c.receipt_file,
            status: c.status,
            assigned_to: c.assigned_to,
            report_number: c.report_number,
            created_at: c.created_at,
            updated_at: c.updated_at,
            users: c.user_id_join ? {
                id: c.user_id_join,
                full_name: c.user_full_name,
                ic_number: c.user_ic_number,
                contact_no: c.user_contact_no,
                contact_no_2: c.user_contact_no_2,
                email: c.user_email,
                address: c.user_address,
                state: c.user_state
            } : null,
            categories: c.cat_id ? { id: c.cat_id, name: c.cat_name } : null,
            technicians: c.tech_id ? { id: c.tech_id, name: c.tech_name, department: c.tech_department } : null
        };

        // Check permission
        if (role === 'user' && complaint.user_id !== userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        if (role === 'technician' && complaint.assigned_to !== userId) {
            // Check if they are in the history
            const [historyCheck]: any = await pool.query(
                'SELECT 1 FROM technician_remarks WHERE complaint_id = ? AND remark_by = ? LIMIT 1',
                [complaintId, userId]
            );
            if (historyCheck.length === 0) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
        }

        // Get remarks
        const [adminRemarksData]: any = await pool.query(
            'SELECT * FROM complaint_remarks WHERE complaint_id = ? ORDER BY created_at ASC',
            [complaintId]
        );

        let adminRemarks = adminRemarksData || [];

        if (adminRemarks.length > 0) {
            const remarkByUuids = [...new Set(adminRemarks.map((r: any) => r.remark_by).filter(Boolean))];
            
            if (remarkByUuids.length > 0) {
                const uuidsStr = remarkByUuids.map(id => `'${id}'`).join(',');
                const [admins]: any = await pool.query(`SELECT id, admin_name FROM admins WHERE id IN (${uuidsStr})`);
                const [techs]: any = await pool.query(`SELECT id, name FROM technicians WHERE id IN (${uuidsStr})`);
                    
                const userMap = new Map();
                admins?.forEach((a: any) => userMap.set(a.id, { name: a.admin_name, role: 'admin' }));
                techs?.forEach((t: any) => userMap.set(t.id, { name: t.name, role: 'main_technician' }));
                
                adminRemarks = adminRemarks.map((remark: any) => ({
                    ...remark,
                    resolved_user: remark.remark_by ? userMap.get(remark.remark_by) || { name: 'Admin', role: 'admin' } : { name: 'Admin', role: 'admin' }
                }));
            }
        }

        const [techRemarksData]: any = await pool.query(
            `SELECT tr.*, t.id as tech_id, t.name as tech_name 
             FROM technician_remarks tr
             LEFT JOIN technicians t ON tr.remark_by = t.id
             WHERE tr.complaint_id = ? ORDER BY tr.created_at ASC`,
            [complaintId]
        );
        
        const techRemarks = techRemarksData.map((tr: any) => {
            const { tech_id, tech_name, ...rest } = tr;
            return {
                ...rest,
                technicians: tech_id ? { id: tech_id, name: tech_name } : null
            };
        });

        // Get forward history
        const [forwardHistoryData]: any = await pool.query(
            `SELECT fh.*, t.id as tech_id, t.name as tech_name, t.department as tech_department
             FROM forward_history fh
             LEFT JOIN technicians t ON fh.forward_to = t.id
             WHERE fh.complaint_id = ? ORDER BY fh.created_at ASC`,
            [complaintId]
        );

        const forwardHistory = forwardHistoryData.map((fh: any) => {
            const { tech_id, tech_name, tech_department, ...rest } = fh;
            return {
                ...rest,
                technicians: tech_id ? { id: tech_id, name: tech_name, department: tech_department } : null
            };
        });

        res.json({
            complaint,
            adminRemarks: adminRemarks || [],
            techRemarks: techRemarks || [],
            forwardHistory: forwardHistory || [],
        });
    } catch (error) {
        console.error('Get complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new complaint
export const createComplaint = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { category_id, subcategory, complaint_type, state, brand_name, model_no, details } = req.body;

        if (!category_id || !brand_name || !details) {
            res.status(400).json({ error: 'Kategori, Jenama, dan Butiran Kerosakan adalah wajib diisi.' });
            return;
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        console.log('[DEBUG UPLOAD] req.body:', req.body);
        console.log('[DEBUG UPLOAD] req.files:', files ? Object.keys(files) : 'No files parsed');
        if (files) {
            if (files.warranty_file) console.log('warranty_file:', files.warranty_file[0].originalname, files.warranty_file[0].size);
            if (files.receipt_file) console.log('receipt_file:', files.receipt_file[0].originalname, files.receipt_file[0].size);
        }

        let warranty_file: string | null = null;
        let receipt_file: string | null = null;

        if (files?.warranty_file?.[0]) {
            const file = files.warranty_file[0];
            const fileName = `${Date.now()}_${file.originalname}`;
            try {
                const { publicUrl } = saveFile('warranty-docs', fileName, file.buffer);
                warranty_file = publicUrl;
            } catch (e) {
                console.error('Warranty file upload error:', e);
            }
        }

        if (files?.receipt_file?.[0]) {
            const file = files.receipt_file[0];
            const fileName = `${Date.now()}_${file.originalname}`;
            try {
                const { publicUrl } = saveFile('receipt-docs', fileName, file.buffer);
                receipt_file = publicUrl;
            } catch (e) {
                console.error('Receipt file upload error:', e);
            }
        }

        if (complaint_type === 'Under Warranty' && (!warranty_file || !receipt_file) && !files?.warranty_file && !files?.receipt_file) {
            res.status(400).json({ error: 'Under Warranty complaints require warranty and receipt files' });
            return;
        }

        const report_number = await generateReportNumber();

        const [result]: any = await pool.query(
            `INSERT INTO complaints (user_id, category_id, subcategory, complaint_type, state, brand_name, model_no, details, warranty_file, receipt_file, report_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, category_id, subcategory, complaint_type, state, brand_name, model_no || null, details, warranty_file, receipt_file, report_number]
        );
        const insertId = result.insertId;

        const [complaintRows]: any = await pool.query('SELECT * FROM complaints WHERE id = ?', [insertId]);
        const complaint = complaintRows[0];

        const [userRows]: any = await pool.query('SELECT full_name, email, contact_no FROM users WHERE id = ?', [userId]);
        const userName = userRows[0]?.full_name || 'Pengguna';
        const userEmail = userRows[0]?.email || '-';
        const userPhone = userRows[0]?.contact_no || '-';

        const [catRows]: any = await pool.query('SELECT name FROM categories WHERE id = ?', [category_id]);
        const categoryName = catRows[0]?.name || 'Fasilitas / Teknis';

        const formattedDate = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        const attachCount = (warranty_file && receipt_file) ? 2 : (warranty_file || receipt_file ? 1 : 0);
        const attachText = attachCount > 0 ? `${attachCount} file(s)` : 'Tiada lampiran';

        const adminEmailBody = `Yth. Admin,

${userName} telah mengirimkan complaint baru melalui sistem.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DETAIL COMPLAINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nomor Tiket   : ${report_number}
Dari          : ${userName}
Email         : ${userEmail}
No. HP        : ${userPhone}

Judul         : ${subcategory || brand_name || 'Aduan Kerosakan'}
Kategori      : ${categoryName}
Prioritas     : 🔴 HIGH
Status        : Menunggu Respon

Deskripsi     :
${details}

Lampiran      : ${attachText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 TINDAKAN YANG DAPAT DILAKUKAN:
1. Klik link berikut untuk melihat detail:
   https://ptas.my/admin/complaint/${report_number}

2. Respon / proses complaint:
   https://ptas.my/admin/complaint/${report_number}

3. Tugaskan ke teknisi:
   https://ptas.my/admin/complaint/${report_number}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Terima kasih.

*This is an automated notification. Please do not reply to this email.*`;

        const adminNotifTitle = `${userName} telah membuat aduan ${report_number}`;

        const [admins]: any = await pool.query('SELECT id, email FROM admins');
        if (admins) {
            const adminMsg = `Category: ${categoryName}\nBrand: ${brand_name}\nDamage Details: ${details}\n\n> Klik untuk agihkan kepada juruteknik`;
            for (const admin of admins) {
                // Case 3: Admin Bell
                await createNotification(admin.id, 'admin', adminNotifTitle, adminMsg, 'new_complaint', complaint.id, false, 'customer');
                // Case 3: Admin Email
                if (admin.email) {
                    try {
                        const emailHtml = buildNotificationEmailHtml(admin.full_name || 'Admin', adminNotifTitle, adminEmailBody, report_number, 'admin');
                        await sendEmail(admin.email, `Aduan Baharu Memerlukan Tugasan - ${report_number}`, emailHtml);
                    } catch (e) {
                        console.error('Failed to send admin email:', e);
                    }
                }
            }
        }

        // Case 6: User Bell
        const userNotifTitle = `Complaint Successfully Registered!`;
        const userMsg = `You have successfully submitted a complaint with Complaint No: ${report_number}.\n\n• Category: ${categoryName}\n• Brand: ${brand_name}\n• Damage Details: ${details}\n\nClick here to check the current status of your complaint.`;
        await createNotification(
            userId!, 
            'user', 
            userNotifTitle, 
            userMsg, 
            'new_complaint', 
            complaint.id
        );

        res.status(201).json({ message: 'Complaint submitted successfully', complaint, report_number });
    } catch (error: any) {
        console.error('Create complaint error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error?.message || String(error),
            stack: error?.stack 
        });
    }
};

// Update complaint status
export const updateComplaint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const role = req.user?.role;

        const complaintId = await resolveComplaint(id);
        if (!complaintId) {
            res.status(404).json({ error: 'Complaint not found' });
            return;
        }

        if (role !== 'admin' && role !== 'technician') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (status === 'incomplete' || status === 'bawa_pulang') {
            await pool.query(
                'UPDATE complaints SET status = ?, assigned_to = NULL, updated_at = NOW() WHERE id = ?',
                [status, complaintId]
            );
        } else {
            await pool.query(
                'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, complaintId]
            );
        }

        const [complaintRows]: any = await pool.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
        const data = complaintRows[0];

        res.json({ message: 'Complaint updated', complaint: data });

        if (role === 'technician' && status) {
            try {
                const [techRows]: any = await pool.query('SELECT name FROM technicians WHERE id = ?', [req.user!.id]);
                const techName = techRows[0]?.name || 'Technician';

                const reportNumber = data.report_number;
                const userId = data.user_id;

                if (reportNumber && userId) {
                    const formattedDate = formatNotificationDate(new Date());

                    if (status === 'in_process' || status === 'closed') {
                        const [admins]: any = await pool.query('SELECT id FROM admins');
                        if (admins) {
                            for (const admin of admins) {
                                await createNotification(
                                    admin.id, 'admin', `Status Update: ${reportNumber}`,
                                    status === 'in_process'
                                        ? `Status Update: Complaint ${reportNumber} is being processed by technician ${techName} at ${formattedDate}.`
                                        : `Status Update: Complaint ${reportNumber} is now completed by technician ${techName} at ${formattedDate}.`,
                                    'status_update_detailed', complaintId
                                );
                            }
                        }
                    }

                    if (status === 'in_process') {
                        await createNotification(
                            userId, 'user', `Status Update: ${reportNumber}`,
                            `Status Update: Complaint ${reportNumber} is being processed by technician ${techName} at ${formattedDate}.`,
                            'status_update_detailed', complaintId
                        );
                    } else if (status === 'closed') {
                        await createNotification(
                            userId, 'user', `Status Update: ${reportNumber}`,
                            `Status Update: Complaint ${reportNumber} is now completed by technician ${techName} at ${formattedDate}. Ready for pickup.`,
                            'status_update_detailed', complaintId
                        );
                    }
                }
            } catch (notifError) {
                console.error('Notification error in updateComplaint:', notifError);
            }
        }
    } catch (error) {
        console.error('Update complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Utility: semak kuota remark sebelum insert (diguna shared oleh addRemark dan forwardComplaint)
async function checkRemarkQuota(complaintId: number, checkStatus?: string): Promise<{ allowed: boolean; maxRemarks: number }> {
    const [adminIncomplete]: any = await pool.query(
        `SELECT COUNT(*) as count FROM complaint_remarks WHERE complaint_id = ? AND status IN ('incomplete', 'bawa_pulang')`,
        [complaintId]
    );
    const [techIncomplete]: any = await pool.query(
        `SELECT COUNT(*) as count FROM technician_remarks WHERE complaint_id = ? AND status IN ('incomplete', 'bawa_pulang')`,
        [complaintId]
    );
    const isIncompleteHistory = adminIncomplete[0].count > 0 || techIncomplete[0].count > 0;
    const isCriticalWorkflow = isIncompleteHistory || checkStatus === 'incomplete' || checkStatus === 'bawa_pulang';
    const MAX_REMARKS = isCriticalWorkflow ? 6 : 3;

    const [adminCountRow]: any = await pool.query('SELECT COUNT(*) as count FROM complaint_remarks WHERE complaint_id = ?', [complaintId]);
    const [techCountRow]: any = await pool.query('SELECT COUNT(*) as count FROM technician_remarks WHERE complaint_id = ?', [complaintId]);
    const totalRemarks = adminCountRow[0].count + techCountRow[0].count;

    if (totalRemarks >= MAX_REMARKS) {
        return { allowed: false, maxRemarks: MAX_REMARKS };
    }
    return { allowed: true, maxRemarks: MAX_REMARKS };
}

// Add remark to complaint (Admin)
export const addRemark = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: paramId } = req.params;
        const { note_transport, checking, remark, status } = req.body;
        const userId = req.user?.id;
        const role = req.user?.role;

        const id = await resolveComplaint(paramId);
        if (!id) { res.status(404).json({ error: 'Complaint not found' }); return; }

        if (role === 'admin' || role === 'technician') {
            const quota = await checkRemarkQuota(id, status);
            if (!quota.allowed) {
                res.status(400).json({ error: `Limit reached: Maximum ${quota.maxRemarks} remarks allowed per complaint.` });
                return;
            }
        }

        let previousStatus: string | null = null;
        if (status) {
            try {
                const [complaintRows]: any = await pool.query('SELECT status FROM complaints WHERE id = ?', [id]);
                previousStatus = complaintRows[0]?.status || null;
                if (status === 'incomplete' || status === 'bawa_pulang') {
                    await pool.query('UPDATE complaints SET status = ?, assigned_to = NULL, updated_at = NOW() WHERE id = ?', [status, id]);
                } else {
                    await pool.query('UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
                }
            } catch (err) {
                console.warn('[addRemark] Failed to update complaints table status (possible ENUM error), ignoring:', err);
            }
        }

        try {
            if (role === 'admin') {
                await pool.query(
                    'INSERT INTO complaint_remarks (complaint_id, note_transport, checking, remark, status, remark_by) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, note_transport || null, checking || null, remark || null, status || null, userId]
                );
            } else if (role === 'technician') {
                await pool.query(
                    'INSERT INTO technician_remarks (complaint_id, note_transport, checking, remark, status, remark_by) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, note_transport || null, checking || null, remark || null, status || null, userId]
                );
            } else {
                res.status(403).json({ error: 'Access denied' }); return;
            }
        } catch (insertError) {
            console.warn('[addRemark] DB insertion error (possible missing ENUM), falling back to NULL status for remark:', insertError);
            if (role === 'admin') {
                await pool.query(
                    'INSERT INTO complaint_remarks (complaint_id, note_transport, checking, remark, status, remark_by) VALUES (?, ?, ?, ?, NULL, ?)',
                    [id, note_transport || null, checking || null, remark || null, userId]
                );
            } else if (role === 'technician') {
                await pool.query(
                    'INSERT INTO technician_remarks (complaint_id, note_transport, checking, remark, status, remark_by) VALUES (?, ?, ?, ?, NULL, ?)',
                    [id, note_transport || null, checking || null, remark || null, userId]
                );
            }
        }
        // === NOTIFICATION BLOCK (non-fatal — DB status already updated above) ===
        try {
        if (role === 'technician') {
            const [techRows]: any = await pool.query('SELECT name FROM technicians WHERE id = ?', [userId]);
            const techName = techRows[0]?.name || 'Technician';

            const [cRows]: any = await pool.query('SELECT user_id, report_number, subcategory FROM complaints WHERE id = ?', [id]);
            if (cRows.length > 0) {
                const complaintData = cRows[0];
                const reportNumber = complaintData.report_number;
                const formattedDate = formatNotificationDate(new Date());
                const isTransitionFromInProcessToComplete = previousStatus === 'in_process' && status === 'closed';
                const isTransitionToIncomplete = previousStatus !== 'incomplete' && previousStatus !== 'bawa_pulang' && (status === 'incomplete' || status === 'bawa_pulang');
                const isTransitionFromIncompleteToComplete = (previousStatus === 'incomplete' || previousStatus === 'bawa_pulang') && status === 'closed';

                const [customerRows]: any = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [complaintData.user_id]);
                const customerData = customerRows[0] || {};
                const customerName = customerData.full_name || 'Pengguna';

                if (status === 'in_process' || status === 'closed') {
                    const adminStatusPayload = JSON.stringify({
                        key: status === 'in_process' ? 'notif_processing_body' : 'notif_completed_body',
                        params: { id: reportNumber, name: techName, date: new Date().toLocaleDateString('ms-MY'), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
                    });
                    const [admins]: any = await pool.query('SELECT id FROM admins');
                    if (admins) {
                        for (const admin of admins) {
                            await createNotification(admin.id, 'admin', `Status Update: ${reportNumber}`, adminStatusPayload, 'status_update_detailed', id, true, 'technician');
                        }
                    }
                }

                if (isTransitionFromInProcessToComplete || isTransitionFromIncompleteToComplete) {
                    try {
                        const adminEmail = 'adminecare.ptasssb@gmail.com';
                        const subject = `Aduan Selesai: ${reportNumber}`;
                        const adminSubject = `Juruteknik ${techName} update status : closed`;
                        const emailHtml = buildNotificationEmailHtml('Administrator', adminSubject, `Juruteknik ${techName} telah mengemaskini status aduan ${reportNumber} daripada '${previousStatus}' kepada 'Selesai' pada ${new Date().toLocaleDateString('ms-MY')} jam ${new Date().toLocaleTimeString('ms-MY')}.`, reportNumber, 'admin');
                        await sendEmail(adminEmail, adminSubject, emailHtml);
                        
                        if (customerData.email) {
                            // Fetch latest remark data from DB if current payload fields are empty
                            let finalRemark = remark;
                            let finalChecking = checking;
                            let finalTransport = note_transport;

                            if (!finalRemark || !finalChecking || !finalTransport) {
                                const [latestRemarks]: any = await pool.query('SELECT remark, checking, note_transport FROM technician_remarks WHERE complaint_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
                                if (latestRemarks && latestRemarks.length > 0) {
                                    if (!finalRemark) finalRemark = latestRemarks[0].remark;
                                    if (!finalChecking) finalChecking = latestRemarks[0].checking;
                                    if (!finalTransport) finalTransport = latestRemarks[0].note_transport;
                                }
                            }

                            let summaryHtml = `Aduan anda (${reportNumber}) telah selesai dibaiki oleh juruteknik ${techName}.<br><br><b>Ringkasan Kerja:</b><br>`;
                            if (finalRemark) summaryHtml += `- <b>Catatan (Remark):</b> ${finalRemark}<br>`;
                            if (finalChecking) summaryHtml += `- <b>Penemuan Teknikal:</b> ${finalChecking}<br>`;
                            if (finalTransport) summaryHtml += `- <b>Logistik/Pengangkutan:</b> ${finalTransport}<br>`;
                            summaryHtml += `<br>Sila klik butang di bawah untuk menyemak status pengambilan barangan anda.`;
                            
                            const custHtml = buildNotificationEmailHtml(customerName, subject, summaryHtml, reportNumber, 'user');
                            await sendEmail(customerData.email, subject, custHtml);
                        }
                    } catch (emailErr) {}
                    
                    if (isTransitionFromIncompleteToComplete) {
                        const [allTechs]: any = await pool.query('SELECT id FROM technicians');
                        if (allTechs) {
                            for (const tech of allTechs) {
                                await createNotification(tech.id, 'main_technician', `Status Update: ${reportNumber}`, `Juruteknik ${techName} telah menyiapkan aduan ${reportNumber} (sebelum ini bawa pulang / incomplete).`, 'status_update_detailed', id, true);
                            }
                        }
                    }
                }

                if (isTransitionToIncomplete) {
                    try {
                        const adminEmail = 'adminecare.ptasssb@gmail.com';
                        const mainTechEmail = 'technicianasign@gmail.com';
                        const subject = `Aduan Bawa Pulang (Incomplete): ${reportNumber}`;
                        const adminSubject = `Juruteknik ${techName} update status : incomplete`;
                        
                        try {
                            const adminHtml = buildNotificationEmailHtml('Administrator', adminSubject, `Juruteknik telah update status progress repair kerosakan untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'admin');
                            await sendEmail(adminEmail, adminSubject, adminHtml);

                            const mainTechHtml = buildNotificationEmailHtml('Main Technician', adminSubject, `Terdapat satu aduan incomplete dihantar oleh juruteknik (${techName}) untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'main_technician');
                            await sendEmail(mainTechEmail, adminSubject, mainTechHtml);

                            if (customerData.email) {
                                const subcategoryName = complaintData.subcategory || 'kerosakan';
                                const custHtml = buildNotificationEmailHtml(customerName, subject, `${reportNumber} aduan anda telah update status progress repair kerosakan ${subcategoryName} oleh juruteknik kami (${techName}). Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'user');
                                await sendEmail(customerData.email, subject, custHtml);
                            }
                        } catch (emailErr) {
                            console.error('[addRemark] Incomplete email notification error:', emailErr);
                        }

                        const [allTechs]: any = await pool.query('SELECT id FROM technicians');
                        if (allTechs) {
                            const notifPayload = JSON.stringify({
                                key: 'notif_incomplete_maintech_body',
                                params: { techName, reportNumber }
                            });
                            for (const tech of allTechs) {
                                await createNotification(tech.id, 'main_technician', `Status Update: ${reportNumber}`, notifPayload, 'status_update_detailed', id, true);
                            }
                        }
                    } catch (incompleteNotifErr) {
                        console.error('[addRemark] Incomplete notification error (non-fatal):', incompleteNotifErr);
                    }
                }

                // --- BATCH NOTIFICATION UNTUK LOCENG IN-APP ---
                let updatesCount = 0;
                let payloadParts = [];
                payloadParts.push('Maklumat berikut:');
                
                if (status && status !== previousStatus) {
                    updatesCount++;
                    let statusText = status;
                    if (status === 'in_process') statusText = 'inproces';
                    else if (status === 'closed') statusText = 'Selesai';
                    else if (status === 'incomplete') statusText = 'Incomplete';
                    else if (status === 'bawa_pulang') statusText = 'Bawa Pulang';
                    payloadParts.push(`~ Status : ${statusText}`);
                }
                if (note_transport) {
                    updatesCount++;
                    payloadParts.push(`~ Transport Note : ${note_transport}`);
                }
                if (checking) {
                    updatesCount++;
                    payloadParts.push(`~ Checking : ${checking}`);
                }
                if (remark) {
                    updatesCount++;
                    payloadParts.push(`~ Remark : ${remark}`);
                }

                if (updatesCount > 0) {
                    const summaryTitle = `Juruteknik ${techName} Telah mengemaskini Aduan ${reportNumber}`;
                    const summaryPayload = payloadParts.join('\n');
                    
                    const [admins]: any = await pool.query('SELECT id FROM admins');
                    if (admins) {
                        for (const admin of admins) {
                            // Gunakan skipEmail: true untuk elakkan spam e-mel
                            await createNotification(admin.id, 'admin', summaryTitle, summaryPayload, 'status_update_detailed', id, true, 'technician');
                        }
                    }
                    await createNotification(complaintData.user_id, 'user', summaryTitle, summaryPayload, 'status_update_detailed', id, true);
                }
                // --- END BATCH NOTIFICATION ---
            }

            const [c]: any = await pool.query('SELECT assigned_to, report_number FROM complaints WHERE id = ?', [id]);
            if (c.length > 0 && c[0].assigned_to) {
                await createNotification(c[0].assigned_to, 'technician', `Job Update: ${c[0].report_number}`, `Technician updated complaint ${c[0].report_number} to '${status}'.`, 'status_update', id, true);
            }
        }
        } catch (notifError) {
            console.error('[addRemark] Non-fatal notification error:', notifError);
        }

        res.status(201).json({ message: 'Remark added successfully' });
    } catch (error) {
        console.error('Add remark error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update remark
export const updateRemark = async (req: Request, res: Response): Promise<void> => {
    try {
        const { remarkId } = req.params;
        const { note_transport, checking, remark, status } = req.body;
        const userId = req.user?.id;
        const role = req.user?.role;

        // Technician tidak dibenarkan mengedit remark yang telah dihantar (business rule)
        if (role === 'technician') {
            res.status(403).json({ error: 'Technician tidak dibenarkan mengedit remark yang telah dihantar' });
            return;
        }

        // Cari remark dalam kedua-dua table (admin/main_tech → complaint_remarks, technician → technician_remarks)
        let existingRemark: any = null;
        let sourceTable = '';

        const [adminRows]: any = await pool.query('SELECT id, remark_by, complaint_id, note_transport, checking, remark, status FROM complaint_remarks WHERE id = ?', [remarkId]);
        if (adminRows.length > 0) {
            existingRemark = adminRows[0];
            sourceTable = 'complaint_remarks';
        } else {
            const [techRows]: any = await pool.query('SELECT id, remark_by, complaint_id, note_transport, checking, remark, status FROM technician_remarks WHERE id = ?', [remarkId]);
            if (techRows.length > 0) {
                existingRemark = techRows[0];
                sourceTable = 'technician_remarks';
            }
        }

        if (!existingRemark) { res.status(404).json({ error: 'Remark not found' }); return; }
        if (existingRemark.remark_by !== userId) { res.status(403).json({ error: 'You can only edit your own remarks' }); return; }

        // Update remark dalam table yang betul
        if (sourceTable === 'complaint_remarks') {
            await pool.query(
                'UPDATE complaint_remarks SET note_transport = ?, checking = ?, remark = ?, status = ? WHERE id = ?',
                [note_transport || null, checking || null, remark || null, status || null, remarkId]
            );
        } else {
            await pool.query(
                'UPDATE technician_remarks SET note_transport = ?, checking = ?, remark = ?, status = ? WHERE id = ?',
                [note_transport || null, checking || null, remark || null, status || null, remarkId]
            );
        }

        if (status) {
            const complaintId = existingRemark.complaint_id;

            // Fetch previous status BEFORE updating
            let previousStatus = null;
            const [oldStatusRows]: any = await pool.query('SELECT status FROM complaints WHERE id = ?', [complaintId]);
            previousStatus = oldStatusRows[0]?.status;

            if (status === 'incomplete' || status === 'bawa_pulang') {
                await pool.query('UPDATE complaints SET status = ?, assigned_to = NULL, updated_at = NOW() WHERE id = ?', [status, complaintId]);
            } else {
                await pool.query('UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?', [status, complaintId]);
            }

            const [techRows]: any = await pool.query('SELECT name FROM technicians WHERE id = ?', [userId]);
            const techName = techRows[0]?.name || 'Technician';

            const [cRows]: any = await pool.query('SELECT user_id, report_number, subcategory FROM complaints WHERE id = ?', [complaintId]);
            if (cRows.length > 0) {
                const complaintData = cRows[0];
                const reportNumber = complaintData.report_number;
                const formattedDate = formatNotificationDate(new Date());

                const [customerRows]: any = await pool.query('SELECT full_name, email FROM users WHERE id = ?', [complaintData.user_id]);
                const customerData = customerRows[0] || {};
                const customerName = customerData.full_name || 'Pengguna';

                // Check if status transitioned to closed
                const isTransitionToComplete = previousStatus !== 'closed' && status === 'closed';
                const isTransitionToIncomplete = previousStatus !== 'incomplete' && previousStatus !== 'bawa_pulang' && (status === 'incomplete' || status === 'bawa_pulang');

                if (isTransitionToComplete) {
                    try {
                        const adminEmail = 'adminecare.ptasssb@gmail.com';
                        const subject = `Aduan Selesai: ${reportNumber}`;
                        const adminSubject = `Juruteknik ${techName} update status : closed`;
                        const emailHtml = buildNotificationEmailHtml('Administrator', adminSubject, `Juruteknik ${techName} telah mengemaskini status aduan ${reportNumber} kepada 'Selesai'.`, reportNumber, 'admin');
                        await sendEmail(adminEmail, adminSubject, emailHtml);
                        
                        if (customerData.email) {
                            // Fetch latest remark data from DB if current payload fields are empty
                            let finalRemark = remark;
                            let finalChecking = checking;
                            let finalTransport = note_transport;

                            if (!finalRemark || !finalChecking || !finalTransport) {
                                const [latestRemarks]: any = await pool.query('SELECT remark, checking, note_transport FROM technician_remarks WHERE complaint_id = ? ORDER BY created_at DESC LIMIT 1', [complaintId]);
                                if (latestRemarks && latestRemarks.length > 0) {
                                    if (!finalRemark) finalRemark = latestRemarks[0].remark;
                                    if (!finalChecking) finalChecking = latestRemarks[0].checking;
                                    if (!finalTransport) finalTransport = latestRemarks[0].note_transport;
                                }
                            }

                            let summaryHtml = `Aduan anda (${reportNumber}) telah selesai dibaiki oleh juruteknik ${techName}.<br><br><b>Ringkasan Kerja:</b><br>`;
                            if (finalRemark) summaryHtml += `- <b>Catatan (Remark):</b> ${finalRemark}<br>`;
                            if (finalChecking) summaryHtml += `- <b>Penemuan Teknikal:</b> ${finalChecking}<br>`;
                            if (finalTransport) summaryHtml += `- <b>Logistik/Pengangkutan:</b> ${finalTransport}<br>`;
                            summaryHtml += `<br>Sila klik butang di bawah untuk menyemak status pengambilan barangan anda.`;
                            
                            const custHtml = buildNotificationEmailHtml(customerName, subject, summaryHtml, reportNumber, 'user');
                            await sendEmail(customerData.email, subject, custHtml);
                        }
                    } catch (emailErr) {}
                }

                if (isTransitionToIncomplete) {
                    try {
                        const adminEmail = 'adminecare.ptasssb@gmail.com';
                        const mainTechEmail = 'technicianasign@gmail.com';
                        const subject = `Aduan Bawa Pulang (Incomplete): ${reportNumber}`;
                        const adminSubject = `Juruteknik ${techName} update status : incomplete`;
                        
                        try {
                            const adminHtml = buildNotificationEmailHtml('Administrator', adminSubject, `Juruteknik telah update status progress repair kerosakan untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'admin');
                            await sendEmail(adminEmail, adminSubject, adminHtml);

                            const mainTechHtml = buildNotificationEmailHtml('Main Technician', adminSubject, `Terdapat satu aduan incomplete dihantar oleh juruteknik (${techName}) untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'main_technician');
                            await sendEmail(mainTechEmail, adminSubject, mainTechHtml);

                            if (customerData.email) {
                                const subcategoryName = complaintData.subcategory || 'kerosakan';
                                const custHtml = buildNotificationEmailHtml(customerName, subject, `${reportNumber} aduan anda telah update status progress repair kerosakan ${subcategoryName} oleh juruteknik kami (${techName}). Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'user');
                                await sendEmail(customerData.email, subject, custHtml);
                            }
                        } catch (emailErr) {
                            console.error('[updateRemark] Incomplete email notification error:', emailErr);
                        }

                        const [allTechs]: any = await pool.query('SELECT id FROM technicians');
                        if (allTechs) {
                            const notifPayload = JSON.stringify({
                                key: 'notif_incomplete_maintech_body',
                                params: { techName, reportNumber }
                            });
                            for (const tech of allTechs) {
                                await createNotification(tech.id, 'main_technician', `Status Update: ${reportNumber}`, notifPayload, 'status_update_detailed', complaintId, true);
                            }
                        }
                    } catch (incompleteNotifErr) {
                        console.error('[updateRemark] Incomplete notification error (non-fatal):', incompleteNotifErr);
                    }
                }
            }
        }

        const complaintId = existingRemark.complaint_id;
        const [cDataRows]: any = await pool.query('SELECT user_id, report_number FROM complaints WHERE id = ?', [complaintId]);
        
        if (cDataRows.length > 0) {
            const cData = cDataRows[0];
            const rNum = cData.report_number;

            const [techRows]: any = await pool.query('SELECT name FROM technicians WHERE id = ?', [userId]);
            const techName = techRows[0]?.name || 'Technician';

            // --- BATCH NOTIFICATION UNTUK LOCENG IN-APP ---
            let updatesCount = 0;
            let payloadParts = [];
            payloadParts.push('Maklumat berikut:');
            
            if (status) {
                updatesCount++;
                let statusText = status;
                if (status === 'in_process') statusText = 'inproces';
                else if (status === 'closed') statusText = 'Selesai';
                else if (status === 'incomplete') statusText = 'Incomplete';
                else if (status === 'bawa_pulang') statusText = 'Bawa Pulang';
                payloadParts.push(`~ Status : ${statusText}`);
            }
            if (note_transport) {
                updatesCount++;
                payloadParts.push(`~ Transport Note : ${note_transport}`);
            }
            if (checking) {
                updatesCount++;
                payloadParts.push(`~ Checking : ${checking}`);
            }
            if (remark) {
                updatesCount++;
                payloadParts.push(`~ Remark : ${remark}`);
            }

            if (updatesCount > 0) {
                const summaryTitle = `Juruteknik ${techName} Telah mengemaskini Aduan ${rNum}`;
                const summaryPayload = payloadParts.join('\n');
                
                const [admins]: any = await pool.query('SELECT id FROM admins');
                if (admins) {
                    for (const admin of admins) {
                        // Gunakan skipEmail: true untuk elakkan spam e-mel
                        await createNotification(admin.id, 'admin', summaryTitle, summaryPayload, 'status_update_detailed', complaintId, true, 'technician');
                    }
                }
                await createNotification(cData.user_id, 'user', summaryTitle, summaryPayload, 'status_update_detailed', complaintId, true);
            }
            // --- END BATCH NOTIFICATION ---
        }

        res.json({ message: 'Remark updated successfully' });
    } catch (error) {
        console.error('Update remark error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete remark
export const deleteRemark = async (req: Request, res: Response): Promise<void> => {
    try {
        const { remarkId } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;

        // Technician tidak dibenarkan memadam remark (business rule)
        if (role === 'technician') {
            res.status(403).json({ error: 'Technician tidak dibenarkan memadam remark' });
            return;
        }

        // Cari remark dalam kedua-dua table
        let sourceTable = '';
        let found = false;

        const [adminRows]: any = await pool.query('SELECT id, remark_by FROM complaint_remarks WHERE id = ?', [remarkId]);
        if (adminRows.length > 0) {
            if (adminRows[0].remark_by !== userId) { res.status(403).json({ error: 'You can only delete your own remarks' }); return; }
            sourceTable = 'complaint_remarks';
            found = true;
        } else {
            const [techRows]: any = await pool.query('SELECT id, remark_by FROM technician_remarks WHERE id = ?', [remarkId]);
            if (techRows.length > 0) {
                if (techRows[0].remark_by !== userId) { res.status(403).json({ error: 'You can only delete your own remarks' }); return; }
                sourceTable = 'technician_remarks';
                found = true;
            }
        }

        if (!found) { res.status(404).json({ error: 'Remark not found' }); return; }

        await pool.query(`DELETE FROM ${sourceTable} WHERE id = ?`, [remarkId]);

        res.json({ message: 'Remark deleted successfully' });
    } catch (error) {
        console.error('Delete remark error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Forward complaint to technician
export const forwardComplaint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: paramId } = req.params;
        const { technician_id, status, note_transport, checking, remark } = req.body;
        const adminId = req.user?.id;
        const callerRole = req.user?.role;

        const id = await resolveComplaint(paramId);
        if (!id) { res.status(404).json({ error: 'Complaint not found' }); return; }

        const [complaintRows]: any = await pool.query(
            'SELECT c.assigned_to, c.created_at, c.subcategory, c.report_number, c.user_id, c.brand_name, c.details, cat.name as cat_name, u.full_name, u.email FROM complaints c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN categories cat ON c.category_id = cat.id WHERE c.id = ?',
            [id]
        );
        const complaint = complaintRows[0];

        if (!complaint) { res.status(404).json({ error: 'Complaint not found' }); return; }

        const [techRows]: any = await pool.query('SELECT id, name, email, contact_number, department FROM technicians WHERE id = ?', [technician_id]);
        const techExists = techRows[0];

        if (!techExists) { res.status(400).json({ error: 'Invalid technician ID - User is not a technician' }); return; }

        await pool.query(
            'UPDATE complaints SET assigned_to = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [technician_id, status || 'in_process', id]
        );

        await pool.query(
            'INSERT INTO forward_history (complaint_id, forward_from, forward_to) VALUES (?, ?, ?)',
            [id, complaint.assigned_to || adminId, technician_id]
        );

        // Check remark quota sebelum insert (route guard ensures only admin/main_technician reach here)
        const quota = await checkRemarkQuota(id, status);
        if (!quota.allowed) {
            res.status(400).json({ error: `Limit reached: Maximum ${quota.maxRemarks} remarks allowed per complaint.` });
            return;
        }

        const forwardSuffix = `Complaint Forward to Technician : ${techExists.name}`;
        const remarkText = remark ? `${remark}\n__FORWARD__${forwardSuffix}` : `__FORWARD__${forwardSuffix}`;

        await pool.query(
            'INSERT INTO complaint_remarks (complaint_id, status, note_transport, checking, remark, remark_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [id, status || 'pending', note_transport || null, checking || null, remarkText, adminId]
        );

        const notifRole = techExists.email === 'technicianasign@gmail.com' ? 'main_technician' : 'technician';

        // --- TECHNICIAN NOTIFICATIONS ---
        // Bell 1: Forward Job
        await createNotification(technician_id, notifRole, `Job Assigned: ${complaint.report_number}`, `You have been assigned/forwarded a new job: ${complaint.report_number}`, 'assignment', id, true);
        
        // Bell 2: Combined Update Maklumat
        let updatesCount = 0;
        let payloadParts = [];
        payloadParts.push('Maklumat berikut:');
        payloadParts.push(`~ Second technician : ${techExists.name}`);
        
        if (status) {
            updatesCount++;
            let statusText = status;
            if (status === 'in_process') statusText = 'inproces';
            else if (status === 'closed') statusText = 'Selesai';
            else if (status === 'incomplete') statusText = 'Incomplete';
            else if (status === 'bawa_pulang') statusText = 'Bawa Pulang';
            payloadParts.push(`~ Status : ${statusText}`);
        }
        if (note_transport) {
            updatesCount++;
            payloadParts.push(`~ Transport Note : ${note_transport}`);
        }
        if (checking) {
            updatesCount++;
            payloadParts.push(`~ Checking : ${checking}`);
        }
        if (remark) {
            updatesCount++;
            payloadParts.push(`~ Remark : ${remark}`);
        }

        if (updatesCount > 0) {
            const summaryTitle = `Pihak Pengurusan Telah mengemaskini Aduan ${complaint.report_number}`;
            const summaryPayload = payloadParts.join('\n');
            await createNotification(technician_id, notifRole, summaryTitle, summaryPayload, 'status_update_detailed', id, true);
        }

        // --- EMAILS ---
        const createDate = new Date(complaint.created_at).toLocaleDateString('en-GB'); // dd/mm/yyyy
        let firstTechName = 'Tidak Diketahui';
        let firstTechPhone = '-';
        let firstTechUnit = '-';
        const [firstHistoryRows]: any = await pool.query(
            'SELECT t.name, t.contact_number, t.department FROM forward_history fh JOIN technicians t ON fh.forward_to = t.id WHERE fh.complaint_id = ? ORDER BY fh.created_at ASC LIMIT 1',
            [id]
        );
        if (firstHistoryRows && firstHistoryRows.length > 0) {
            firstTechName = firstHistoryRows[0].name;
            firstTechPhone = firstHistoryRows[0].contact_number || '-';
            firstTechUnit = firstHistoryRows[0].department || '-';
        }

        const secondTechName = techExists.name;
        const secondTechPhone = techExists.contact_number || '-';
        const secondTechUnit = techExists.department || '-';

        let statusLabel = status || '-';
        let statusEmoji = '🔹';
        if (status === 'incomplete') {
            statusLabel = 'Incomplete / Bring to workshop';
            statusEmoji = '⚠️';
        }

        const timestampStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

        const emailTemplateHtml = `MAKLUMAT ADUAN ${complaint.report_number}
date create : ${createDate}
customer name : ${complaint.full_name || 'Pelanggan'}
subcategory : ${complaint.subcategory || '-'}
brand : ${complaint.brand_name || '-'}
defect details : ${complaint.details || '-'}

🛠️ Maklumat Juruteknik Bertanggungjawab:

👤 [1] First Technician
- Nama: ${firstTechName}
- No. Telefon: ${firstTechPhone}
- Unit/Jabatan: ${firstTechUnit}

📌 Status Tindakan (${firstTechName}):
- Status: ${statusEmoji} ${statusLabel}
- Tarikh & Masa: ${timestampStr}
- Transport Note: ${note_transport || '-'}
- Checking: ${checking || '-'}
- Remark: ${remark || '-'}

👤 [2] Second Technician
- Nama: ${secondTechName}
- No. Telefon: ${secondTechPhone}
- Unit/Jabatan: ${secondTechUnit}

click to view details ...`;

        try {
            const trackReportPath = `${complaint.report_number}/track-repair`;

            // Build role-appropriate email subjects
            let subjectTech: string;
            let subjectAdmin: string;
            let subjectUser: string;

            if (callerRole === 'admin') {
                subjectTech = `New job ${complaint.report_number} assigned from admin`;
                subjectAdmin = `New job ${complaint.report_number} assigned from admin`;
                subjectUser = `New job assigned: ${complaint.report_number}`;
            } else {
                subjectTech = `MAIN TECH HAS ASSIGN INCOMPLETE JOB ${complaint.report_number} TO ${techExists.name.toUpperCase()}`;
                subjectAdmin = `MAIN TECH HAS ASSIGN INCOMPLETE JOB ${complaint.report_number} TO ${techExists.name.toUpperCase()}`;
                subjectUser = `MAIN TECH HAS ASSIGN YOUR INCOMPLETE COMPLAINT JOB ${complaint.report_number} TO ${techExists.name.toUpperCase()}`;
            }

            // 1. Email for Technician B
            if (techExists.email) {
                const techHtml = buildNotificationEmailHtml(techExists.name, subjectTech, emailTemplateHtml, trackReportPath, 'technician');
                await sendEmail(techExists.email, subjectTech, techHtml);
            }

            // 2. Email for Admin
            const [admins]: any = await pool.query('SELECT email FROM admins WHERE email IS NOT NULL');
            const adminEmails = admins.map((a: any) => a.email).filter(Boolean);
            if (adminEmails.length > 0) {
                const adminHtml = buildNotificationEmailHtml('Admin', subjectAdmin, emailTemplateHtml, trackReportPath, 'admin');
                for (const email of adminEmails) {
                    await sendEmail(email, subjectAdmin, adminHtml);
                }
            }

            // 3. Email for User
            if (complaint.email) {
                const userHtml = buildNotificationEmailHtml(complaint.full_name || 'Pelanggan', subjectUser, emailTemplateHtml, trackReportPath, 'user');
                await sendEmail(complaint.email, subjectUser, userHtml);
            }
        } catch (emailErr) {
            console.error('Failed to send forward job emails:', emailErr);
        }

        // --- USER NOTIFICATIONS ---
        // User Bell: Detailed Forward Job
        if (status === 'in_process' || !status) {
            let userPayload = `Aduan ${complaint.report_number} telah diproses oleh ${techExists.name}.\n`;
            userPayload += `\nSecond technician : ${techExists.name}`;
            if (complaint.cat_name) userPayload += `\nKategori: ${complaint.cat_name}`;
            if (complaint.brand_name) userPayload += `\nJenama: ${complaint.brand_name}`;
            if (complaint.details) userPayload += `\nKerosakan: ${complaint.details}`;
            
            userPayload += `\n\nClick to view details`;

            await createNotification(complaint.user_id, 'user', `Aduan Anda Sedang Diproses`, userPayload, 'status_update_detailed', id, true);
        }

        res.json({ message: 'Complaint forwarded successfully' });
    } catch (error) {
        console.error('Forward complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Cancel complaint (user only, pending status only)
export const cancelComplaint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: paramId } = req.params;
        const userId = req.user?.id;

        const id = await resolveComplaint(paramId);
        if (!id) { res.status(404).json({ error: 'Complaint not found' }); return; }

        const [complaintRows]: any = await pool.query(
            'SELECT c.user_id, c.status, c.report_number, u.full_name FROM complaints c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?',
            [id]
        );
        const complaint = complaintRows[0];

        if (!complaint) { res.status(404).json({ error: 'Complaint not found' }); return; }

        if (complaint.user_id !== userId) { res.status(403).json({ error: 'You can only cancel your own complaints' }); return; }

        if (complaint.status !== 'pending') {
            res.status(400).json({ error: 'Cannot cancel complaint. Only pending complaints can be cancelled.' });
            return;
        }

        await pool.query('UPDATE complaints SET status = "cancelled", updated_at = NOW() WHERE id = ?', [id]);

        const formattedDate = formatNotificationDate(new Date());

        await createNotification(userId!, 'user', `Status Update: ${complaint.report_number}`, `Cancelled on ${formattedDate}`, 'status_update_detailed', id, true);

        const [adminRows]: any = await pool.query('SELECT id FROM admins LIMIT 1');
        const admin = adminRows[0];

        if (admin) {
            const userName = complaint.full_name || 'Pengguna';
            await createNotification(admin.id, 'admin', `Pelanggan : ${userName} telah membatalkan aduan ${complaint.report_number}.`, `Klik untuk semak.`, 'system', id, true, 'customer');
        }

        res.json({ message: 'Complaint cancelled successfully' });
    } catch (error) {
        console.error('Cancel complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete complaint (admin only)
export const deleteComplaint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: paramId } = req.params;

        const id = await resolveComplaint(paramId);
        if (!id) { res.status(404).json({ error: 'Aduan tidak dijumpai' }); return; }

        const [complaintRows]: any = await pool.query('SELECT report_number FROM complaints WHERE id = ?', [id]);
        const complaint = complaintRows[0];

        if (!complaint) { res.status(404).json({ error: 'Aduan tidak dijumpai' }); return; }

        await pool.query('DELETE FROM technician_remarks WHERE complaint_id = ?', [id]);
        await pool.query('DELETE FROM complaint_remarks WHERE complaint_id = ?', [id]);
        await pool.query('DELETE FROM notifications WHERE reference_id = ?', [id]);
        await pool.query('DELETE FROM complaints WHERE id = ?', [id]);

        res.json({ message: 'Aduan berjaya dipadam' });
    } catch (error: any) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({ error: 'Ralat memadam aduan' });
    }
};

// Bulk delete complaints (admin only)
export const bulkDeleteComplaints = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reportNumbers } = req.body;
        
        if (!Array.isArray(reportNumbers) || reportNumbers.length === 0) {
            res.status(400).json({ error: 'Sila pilih sekurang-kurangnya satu aduan' });
            return;
        }

        // Get IDs
        const placeholders = reportNumbers.map(() => '?').join(',');
        const [rows]: any = await pool.query(`SELECT id FROM complaints WHERE report_number IN (${placeholders})`, reportNumbers);
        const ids = rows.map((r: any) => r.id);

        if (ids.length > 0) {
            const idPlaceholders = ids.map(() => '?').join(',');
            await pool.query(`DELETE FROM technician_remarks WHERE complaint_id IN (${idPlaceholders})`, ids);
            await pool.query(`DELETE FROM complaint_remarks WHERE complaint_id IN (${idPlaceholders})`, ids);
            await pool.query(`DELETE FROM notifications WHERE reference_id IN (${idPlaceholders})`, ids);
            await pool.query(`DELETE FROM complaints WHERE id IN (${idPlaceholders})`, ids);
        }

        res.json({ message: 'Aduan berjaya dipadam secara pukal' });
    } catch (error) {
        console.error('Error bulk deleting complaints:', error);
        res.status(500).json({ error: 'Ralat memadam aduan' });
    }
};

/** Resolve numeric complaint ID to report_number (for notifications) */
export const resolveNumericId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const complaintId = parseInt(id, 10);
        if (isNaN(complaintId)) { res.status(400).json({ error: 'Invalid ID' }); return; }

        const [rows]: any = await pool.query('SELECT report_number FROM complaints WHERE id = ?', [complaintId]);
        if (rows.length === 0) { res.status(404).json({ error: 'Complaint not found' }); return; }

        res.json({ report_number: rows[0].report_number });
    } catch (error) {
        console.error('Resolve numeric ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
