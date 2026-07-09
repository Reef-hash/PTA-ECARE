import fs from 'fs';
import path from 'path';

// Guna UPLOAD_DIR env var supaya uploads disimpan di luar folder deployment
// Server: UPLOAD_DIR=/home/u134652667/uploads
// Local dev: fallback ke ./uploads
const UPLOAD_ROOT = process.env.UPLOAD_DIR 
    ? path.resolve(process.env.UPLOAD_DIR) 
    : path.resolve(process.cwd(), 'uploads');

const SUBDIRS = ['warranty-docs', 'receipt-docs', 'user-images'];

for (const dir of SUBDIRS) {
    const full = path.join(UPLOAD_ROOT, dir);
    if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
    }
}

export interface UploadResult {
    publicUrl: string;
    localPath: string;
}

export const saveFile = (
    subdir: string,
    fileName: string,
    buffer: Buffer,
    baseUrl?: string
): UploadResult => {
    const dir = path.join(UPLOAD_ROOT, subdir);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Gunakan API_URL supaya pautan menghala ke pelayan backend yang menyimpan fail sebenar.
    const base = (baseUrl || process.env.API_URL || 'https://api.ptas.my').replace(/\/$/, '');
    const publicUrl = `${base}/uploads/${subdir}/${fileName}`;
    return { publicUrl, localPath: filePath };
};
