import fs from 'fs';
import path from 'path';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

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

    const base = (baseUrl || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const publicUrl = `${base}/uploads/${subdir}/${fileName}`;
    return { publicUrl, localPath: filePath };
};
