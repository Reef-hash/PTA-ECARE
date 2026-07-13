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
                whereClauses.push('c.status = "closed" AND c.id IN (SELECT complaint_id FROM forward_history)');
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
                t.id as tech_id, t.name as tech_name, t.department as tech_department, t.username as tech_username
             FROM complaints c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN categories cat ON c.category_id = cat.id
             LEFT JOIN technicians t ON c.assigned_to = t.id
             WHERE ${whereString}
             ORDER BY c.updated_at DESC
             LIMIT ? OFFSET ?`,
            queryParamsWithPagination
        );

        // Fetch remarks and restructure to match Supabase response
        const mappedComplaints = await Promise.all(complaintsData.map(async (c: any) => {
            const [remarksData]: any = await pool.query(
                'SELECT id, status, note_transport, checking, remark, remark_by, created_at FROM complaint_remarks WHERE complaint_id = ?',
                [c.id]
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

        const [userRows]: any = await pool.query('SELECT full_name FROM users WHERE id = ?', [userId]);
        const userName = userRows[0]?.full_name || 'Pengguna';

        const [admins]: any = await pool.query('SELECT id FROM admins');
        if (admins) {
            const adminPayload = JSON.stringify({ key: 'new_complaint_msg', params: { user_name: userName } });
            for (const admin of admins) {
                await createNotification(admin.id, 'admin', `Aduan Baru: ${report_number}`, adminPayload, 'status_update', complaint.id);
            }
        }

        const userPayload = JSON.stringify({ key: 'user_complaint_created_msg', params: { report_number: report_number } });
        await createNotification(userId!, 'user', `Aduan Berjaya Didaftarkan`, userPayload, 'status_update', complaint.id);

        res.status(201).json({ message: 'Complaint submitted successfully', complaint, report_number });
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
            const [adminIncomplete]: any = await pool.query(
                `SELECT COUNT(*) as count FROM complaint_remarks WHERE complaint_id = ? AND status IN ('incomplete', 'bawa_pulang')`,
                [id]
            );
            const [techIncomplete]: any = await pool.query(
                `SELECT COUNT(*) as count FROM technician_remarks WHERE complaint_id = ? AND status IN ('incomplete', 'bawa_pulang')`,
                [id]
            );
            const isIncompleteHistory = adminIncomplete[0].count > 0 || techIncomplete[0].count > 0;
            const isCriticalWorkflow = isIncompleteHistory || status === 'incomplete' || status === 'bawa_pulang';
            const MAX_REMARKS = isCriticalWorkflow ? 6 : 3;

            const [adminCountRow]: any = await pool.query('SELECT COUNT(*) as count FROM complaint_remarks WHERE complaint_id = ?', [id]);
            const [techCountRow]: any = await pool.query('SELECT COUNT(*) as count FROM technician_remarks WHERE complaint_id = ?', [id]);
            const totalRemarks = adminCountRow[0].count + techCountRow[0].count;

            if (totalRemarks >= MAX_REMARKS) {
                res.status(400).json({ error: `Limit reached: Maximum ${MAX_REMARKS} remarks allowed per complaint.` });
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
                const isTransitionToIncomplete = previousStatus !== 'incomplete' && status === 'incomplete';
                const isTransitionFromIncompleteToComplete = previousStatus === 'incomplete' && status === 'closed';

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
                            await createNotification(admin.id, 'admin', `Status Update: ${reportNumber}`, adminStatusPayload, 'status_update_detailed', id);
                        }
                    }
                }

                if (isTransitionFromInProcessToComplete || isTransitionFromIncompleteToComplete) {
                    try {
                        const adminEmail = 'adminecare.ptasssb@gmail.com';
                        const subject = `Aduan Selesai: ${reportNumber}`;
                        const emailHtml = buildNotificationEmailHtml('Administrator', subject, `Juruteknik ${techName} telah mengemaskini status aduan ${reportNumber} daripada '${previousStatus}' kepada 'Selesai' pada ${new Date().toLocaleDateString('ms-MY')} jam ${new Date().toLocaleTimeString('ms-MY')}.`, reportNumber, 'admin');
                        await sendEmail(adminEmail, subject, emailHtml);
                        
                        if (customerData.email) {
                            const custHtml = buildNotificationEmailHtml(customerName, subject, `Aduan anda (${reportNumber}) telah selesai dibaiki oleh juruteknik ${techName}.`, reportNumber, 'user');
                            await sendEmail(customerData.email, subject, custHtml);
                        }
                    } catch (emailErr) {}
                    
                    if (isTransitionFromIncompleteToComplete) {
                        const [mainTechs]: any = await pool.query('SELECT id FROM technicians WHERE username = "maintech"');
                        if (mainTechs) {
                            for (const mt of mainTechs) {
                                await createNotification(mt.id, 'main_technician', `Status Update: ${reportNumber}`, `Juruteknik ${techName} telah menyiapkan aduan ${reportNumber} (sebelum ini bawa pulang / incomplete).`, 'status_update_detailed', id);
                            }
                        }
                    }
                }

                if (isTransitionToIncomplete) {
                    try {
                        const adminEmail = 'adminecare.ptasssb@gmail.com';
                        const mainTechEmail = 'technicianasign@gmail.com';
                        const subject = `Aduan Bawa Pulang (Incomplete): ${reportNumber}`;
                        
                        const adminHtml = buildNotificationEmailHtml('Administrator', subject, `Juruteknik telah update status progress repair kerosakan untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'admin');
                        await sendEmail(adminEmail, subject, adminHtml);

                        const mainTechHtml = buildNotificationEmailHtml('Main Technician', subject, `Terdapat satu aduan incomplete dihantar oleh juruteknik (${techName}) untuk aduan ${reportNumber}. Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'admin');
                        await sendEmail(mainTechEmail, subject, mainTechHtml);

                        if (customerData.email) {
                            const subcategoryName = complaintData.subcategory || 'kerosakan';
                            const custHtml = buildNotificationEmailHtml(customerName, subject, `${reportNumber} aduan anda telah update status progress repair kerosakan ${subcategoryName} oleh juruteknik kami (${techName}). Sila tekan semak aduan untuk lihat lebih lanjut.`, reportNumber, 'user');
                            await sendEmail(customerData.email, subject, custHtml);
                        }

                        const [mainTechs]: any = await pool.query('SELECT id FROM technicians WHERE username = "maintech"');
                        if (mainTechs) {
                            for (const mt of mainTechs) {
                                await createNotification(mt.id, 'main_technician', `Status Update: ${reportNumber}`, `Terdapat satu aduan incomplete dihantar oleh juruteknik (${techName}) untuk aduan ${reportNumber}.`, 'status_update_detailed', id);
                            }
                        }
                    } catch (incompleteNotifErr) {
                        console.error('[addRemark] Incomplete notification error (non-fatal):', incompleteNotifErr);
                    }
                }

                if (note_transport) {
                    const transportAdminPayload = JSON.stringify({ key: 'notif_transport_admin', params: { id: reportNumber, detail: note_transport } });
                    const [admins]: any = await pool.query('SELECT id FROM admins');
                    if (admins) {
                        for (const admin of admins) {
                            await createNotification(admin.id, 'admin', `Transport Update: ${reportNumber}`, transportAdminPayload, 'transport_update', id);
                        }
                    }
                    const transportUserPayload = JSON.stringify({ key: 'notif_transport_user', params: { id: reportNumber, detail: note_transport } });
                    await createNotification(complaintData.user_id, 'user', `Transport Update: ${reportNumber}`, transportUserPayload, 'transport_update', id);
                }

                if (checking) {
                    const checkingAdminPayload = JSON.stringify({ key: 'notif_checking_admin', params: { id: reportNumber, detail: checking } });
                    const [admins]: any = await pool.query('SELECT id FROM admins');
                    if (admins) {
                        for (const admin of admins) {
                            await createNotification(admin.id, 'admin', `Checking Update: ${reportNumber}`, checkingAdminPayload, 'checking_update', id);
                        }
                    }
                    const checkingUserPayload = JSON.stringify({ key: 'notif_checking_user', params: { id: reportNumber, detail: checking } });
                    await createNotification(complaintData.user_id, 'user', `Checking Update: ${reportNumber}`, checkingUserPayload, 'checking_update', id);
                }

                if (remark) {
                    const remarkAdminPayload = JSON.stringify({ key: 'notif_remark_admin', params: { id: reportNumber, detail: remark } });
                    const [admins]: any = await pool.query('SELECT id FROM admins');
                    if (admins) {
                        for (const admin of admins) {
                            await createNotification(admin.id, 'admin', `New Remark: ${reportNumber}`, remarkAdminPayload, 'remark_update', id);
                        }
                    }
                    const remarkUserPayload = JSON.stringify({ key: 'notif_remark_user', params: { id: reportNumber, detail: remark } });
                    await createNotification(complaintData.user_id, 'user', `New Remark: ${reportNumber}`, remarkUserPayload, 'remark_update', id);
                }

                if (status === 'in_process') {
                    const processingPayload = JSON.stringify({ key: 'notif_processing_body', params: { id: reportNumber, name: techName, date: new Date().toLocaleDateString('ms-MY'), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) } });
                    await createNotification(complaintData.user_id, 'user', `Status Update: ${reportNumber}`, processingPayload, 'status_update_detailed', id);
                } else if (status === 'closed') {
                    const closedPayload = JSON.stringify({ key: 'notif_completed_body', params: { id: reportNumber, name: techName, date: new Date().toLocaleDateString('ms-MY'), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) } });
                    await createNotification(complaintData.user_id, 'user', `Status Update: ${reportNumber}`, closedPayload, 'status_update_detailed', id);
                }
            }

            const [c]: any = await pool.query('SELECT assigned_to, report_number FROM complaints WHERE id = ?', [id]);
            if (c.length > 0 && c[0].assigned_to) {
                await createNotification(c[0].assigned_to, 'technician', `Job Update: ${c[0].report_number}`, `Technician updated complaint ${c[0].report_number} to '${status}'.`, 'status_update', id);
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

        if (role !== 'technician') { res.status(403).json({ error: 'Access denied' }); return; }

        const [existingRemarkRows]: any = await pool.query('SELECT remark_by, complaint_id FROM technician_remarks WHERE id = ?', [remarkId]);
        const existingRemark = existingRemarkRows[0];

        if (!existingRemark) { res.status(404).json({ error: 'Remark not found' }); return; }
        if (existingRemark.remark_by !== userId) { res.status(403).json({ error: 'You can only edit your own remarks' }); return; }

        await pool.query(
            'UPDATE technician_remarks SET note_transport = ?, checking = ?, remark = ?, status = ? WHERE id = ?',
            [note_transport || null, checking || null, remark || null, status || null, remarkId]
        );

        if (status) {
            const complaintId = existingRemark.complaint_id;
            await pool.query('UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?', [status, complaintId]);

            const [techRows]: any = await pool.query('SELECT name FROM technicians WHERE id = ?', [userId]);
            const techName = techRows[0]?.name || 'Technician';

            const [cRows]: any = await pool.query('SELECT user_id, report_number FROM complaints WHERE id = ?', [complaintId]);
            if (cRows.length > 0) {
                const complaintData = cRows[0];
                const reportNumber = complaintData.report_number;
                const formattedDate = formatNotificationDate(new Date());

                const [admins]: any = await pool.query('SELECT id FROM admins');
                if (admins) {
                    for (const admin of admins) {
                        await createNotification(admin.id, 'admin', `Status Update: ${reportNumber}`, status === 'in_process' ? `Status Update [${reportNumber}]: Service in progress by Technician ${techName} on ${formattedDate}.` : `Status Update [${reportNumber}]: Service completed by Technician ${techName} on ${formattedDate}. Case status transitioned to 'Ready for Pickup'.`, 'status_update_detailed', complaintId);
                    }
                }

                if (status === 'in_process') {
                    await createNotification(complaintData.user_id, 'user', `Status Update: ${reportNumber}`, `Status Update [${reportNumber}]: Service in process by Technician ${techName} on ${formattedDate}.`, 'status_update_detailed', complaintId);
                } else if (status === 'closed') {
                    await createNotification(complaintData.user_id, 'user', `Status Update: ${reportNumber}`, `Status Update [${reportNumber}]: Service completed by Technician ${techName} on ${formattedDate}. Case status transitioned to 'Ready for Pickup'.`, 'status_update_detailed', complaintId);
                }
            }
        }

        const complaintId = existingRemark.complaint_id;
        const [cDataRows]: any = await pool.query('SELECT user_id, report_number FROM complaints WHERE id = ?', [complaintId]);
        if (cDataRows.length > 0) {
            const cData = cDataRows[0];
            const rNum = cData.report_number;

            if (note_transport) {
                const transportAdminPayload = JSON.stringify({ key: 'notif_transport_admin', params: { id: rNum } });
                const [admins]: any = await pool.query('SELECT id FROM admins');
                if (admins) {
                    for (const admin of admins) {
                        await createNotification(admin.id, 'admin', `Transport Update: ${rNum}`, transportAdminPayload, 'transport_update', complaintId);
                    }
                }
                const transportUserPayload = JSON.stringify({ key: 'notif_transport_user', params: { id: rNum } });
                await createNotification(cData.user_id, 'user', `Transport Update: ${rNum}`, transportUserPayload, 'transport_update', complaintId);
            }

            if (checking) {
                const checkingAdminPayload = JSON.stringify({ key: 'notif_checking_admin', params: { id: rNum } });
                const [admins]: any = await pool.query('SELECT id FROM admins');
                if (admins) {
                    for (const admin of admins) {
                        await createNotification(admin.id, 'admin', `Checking Update: ${rNum}`, checkingAdminPayload, 'checking_update', complaintId);
                    }
                }
                const checkingUserPayload = JSON.stringify({ key: 'notif_checking_user', params: { id: rNum } });
                await createNotification(cData.user_id, 'user', `Checking Update: ${rNum}`, checkingUserPayload, 'checking_update', complaintId);
            }

            if (remark) {
                const remarkAdminPayload = JSON.stringify({ key: 'notif_remark_admin', params: { id: rNum } });
                const [admins]: any = await pool.query('SELECT id FROM admins');
                if (admins) {
                    for (const admin of admins) {
                        await createNotification(admin.id, 'admin', `New Remark: ${rNum}`, remarkAdminPayload, 'remark_update', complaintId);
                    }
                }
                const remarkUserPayload = JSON.stringify({ key: 'notif_remark_user', params: { id: rNum } });
                await createNotification(cData.user_id, 'user', `New Remark: ${rNum}`, remarkUserPayload, 'remark_update', complaintId);
            }
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

        if (role !== 'technician') { res.status(403).json({ error: 'Access denied' }); return; }

        const [existingRemarkRows]: any = await pool.query('SELECT remark_by FROM technician_remarks WHERE id = ?', [remarkId]);
        const existingRemark = existingRemarkRows[0];

        if (!existingRemark) { res.status(404).json({ error: 'Remark not found' }); return; }
        if (existingRemark.remark_by !== userId) { res.status(403).json({ error: 'You can only delete your own remarks' }); return; }

        await pool.query('DELETE FROM technician_remarks WHERE id = ?', [remarkId]);

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

        const id = await resolveComplaint(paramId);
        if (!id) { res.status(404).json({ error: 'Complaint not found' }); return; }

        const [complaintRows]: any = await pool.query(
            'SELECT c.assigned_to, c.report_number, c.user_id, u.full_name, u.email FROM complaints c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?',
            [id]
        );
        const complaint = complaintRows[0];

        if (!complaint) { res.status(404).json({ error: 'Complaint not found' }); return; }

        const [techRows]: any = await pool.query('SELECT id, name, email FROM technicians WHERE id = ?', [technician_id]);
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

        const forwardSuffix = `Complaint Forward to Technician : ${techExists.name}`;
        const remarkText = remark ? `${remark}\n__FORWARD__${forwardSuffix}` : `__FORWARD__${forwardSuffix}`;

        await pool.query(
            'INSERT INTO complaint_remarks (complaint_id, status, note_transport, checking, remark, remark_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [id, status || 'pending', note_transport || null, checking || null, remarkText, adminId]
        );

        const assignmentPayload = JSON.stringify({ key: 'notif_processing_tech', params: { id: complaint.report_number, userName: complaint.full_name || 'Pengguna' } });
        await createNotification(technician_id, 'technician', `Job Assigned: ${complaint.report_number}`, assignmentPayload, 'assignment', id);

        if (status === 'in_process' || !status) {
            const formattedDate = formatNotificationDate(new Date());
            const userPayload = JSON.stringify({ key: 'notif_processing_user', params: { id: complaint.report_number, name: techExists.name, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) } });
            await createNotification(complaint.user_id, 'user', `Status Update: ${complaint.report_number}`, userPayload, 'status_update_detailed', id);
        }

        try {
            const [mainTechs]: any = await pool.query('SELECT id FROM technicians WHERE username = "maintech"');
            if (mainTechs && mainTechs.length > 0) {
                for (const mt of mainTechs) {
                    await createNotification(mt.id, 'main_technician', `Job Forwarded: ${complaint.report_number}`, `Aduan ${complaint.report_number} berjaya di hantar kepada juruteknik ${techExists.name}.`, 'assignment', id);
                }
            }
        } catch (e) {}

        try {
            const adminEmail = 'adminecare.ptasssb@gmail.com';
            const subject = `Agihan Tugasan Aduan: ${complaint.report_number}`;
            const customerName = complaint.full_name || 'Pelanggan';
            const customerEmail = complaint.email;

            if (techExists.email) {
                const techHtml = buildNotificationEmailHtml(techExists.name, subject, `Satu tugasan aduan (${complaint.report_number}) telah diagihkan kepada anda oleh pihak pengurusan. Sila semak aplikasi E-CARE untuk maklumat lanjut.`, complaint.report_number, 'technician');
                await sendEmail(techExists.email, subject, techHtml);
            }

            const adminHtml = buildNotificationEmailHtml('Administrator', subject, `Tugasan aduan (${complaint.report_number}) telah berjaya diagihkan kepada juruteknik ${techExists.name}.`, complaint.report_number, 'admin');
            await sendEmail(adminEmail, subject, adminHtml);

            if (customerEmail) {
                const custHtml = buildNotificationEmailHtml(customerName, subject, `Aduan anda (${complaint.report_number}) telah diagihkan kepada juruteknik kami (${techExists.name}) untuk tindakan selanjutnya.`, complaint.report_number, 'user');
                await sendEmail(customerEmail, subject, custHtml);
            }
        } catch (emailErr) {}

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

        await createNotification(userId!, 'user', `Status Update: ${complaint.report_number}`, `Cancelled on ${formattedDate}`, 'status_update_detailed', id);

        const [adminRows]: any = await pool.query('SELECT id FROM admins LIMIT 1');
        const admin = adminRows[0];

        if (admin) {
            const userName = complaint.full_name || 'Pengguna';
            await createNotification(admin.id, 'admin', `Aduan Dibatalkan oleh Pengguna`, `${userName} telah membatalkan aduan (No Laporan: ${complaint.report_number}). Klik untuk semak.`, 'status_update', id);
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
