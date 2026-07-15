import multer from 'multer';
import { Request } from 'express';

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Relaxed check to accommodate mobile browsers which might not send standard mime types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/heic', 'image/heif'];

    if (!file.mimetype || allowedTypes.includes(file.mimetype.toLowerCase()) || file.originalname.match(/\.(jpg|jpeg|png|pdf|heic|heif)$/i)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

export const uploadWarranty = upload.single('warranty');
export const uploadReceipt = upload.single('receipt');
export const uploadAvatar = upload.single('avatar');
export const uploadComplaintFiles = upload.fields([
    { name: 'warranty_file', maxCount: 1 },
    { name: 'receipt_file', maxCount: 1 },
]);
