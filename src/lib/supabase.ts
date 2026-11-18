import { nocoClient } from './nocoClient';
import { getPresignedUrlAction, uploadImageServerAction } from '@/app/actions/upload';

// The application now directs all database queries and writes directly to NocoDB!
export const supabase = nocoClient;

export async function uploadImage(
    image: string, 
    bucket: string = 'images', 
    folder: string = '',
    onProgress?: (progress: number) => void
): Promise<string | null> {
    try {
        // 1. Convert Base64 (DataURL) to Blob - Browser safe
        const res = await fetch(image);
        const blob = await res.blob();
        const contentType = blob.type || 'image/png';
        const extension = contentType.split('/')[1] || 'png';

        // 2. Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        // User wants all images in temp-files
        const filename = `temp-files/${timestamp}-${randomStr}.${extension}`;

        if (onProgress) onProgress(10);

        // 3. Get Presigned URL for R2
        const presignedResult = await getPresignedUrlAction(filename, contentType);
        if (!presignedResult.success || !presignedResult.signedUrl || !presignedResult.publicUrl) {
            console.error('Failed to get presigned URL:', presignedResult.error);
            return null;
        }

        if (onProgress) onProgress(30);

        // 4. Upload to R2 (se falhar via navegador/CORS no localhost, faz fallback automático via Servidor)
        try {
            const uploadRes = await fetch(presignedResult.signedUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': contentType
                }
            });

            if (uploadRes.ok) {
                if (onProgress) onProgress(100);
                return presignedResult.publicUrl;
            }
        } catch (corsErr) {
            console.warn('Upload direto via browser bloqueado por CORS (comum em localhost). Usando fallback via Servidor...');
        }

        // Fallback robusto via Server Action (Node.js backend não sofre bloqueio de CORS)
        const serverUpload = await uploadImageServerAction(image);
        if (serverUpload.success && serverUpload.publicUrl) {
            if (onProgress) onProgress(100);
            return serverUpload.publicUrl;
        }

        return null;
    } catch (e) {
        console.error('Upload Logic Error:', e);
        return null;
    }
}

export async function uploadFile(
    file: File, 
    bucket: string = 'images', 
    folder: string = '',
    onProgress?: (progress: number) => void
): Promise<string | null> {
    try {
        const contentType = file.type || 'application/octet-stream';
        const extension = file.name.split('.').pop() || 'bin';

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const filename = `temp-files/${timestamp}-${randomStr}.${extension}`;

        if (onProgress) onProgress(10);

        const presignedResult = await getPresignedUrlAction(filename, contentType);
        if (!presignedResult.success || !presignedResult.signedUrl || !presignedResult.publicUrl) {
            console.error('Failed to get presigned URL:', presignedResult.error);
            return null;
        }

        if (onProgress) onProgress(30);

        const uploadRes = await fetch(presignedResult.signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': contentType
            }
        });

        if (!uploadRes.ok) {
            console.error('Failed to upload to R2:', await uploadRes.text());
            return null;
        }

        if (onProgress) onProgress(100);

        return presignedResult.publicUrl;
    } catch (e) {
        console.error('Upload Logic Error:', e);
        return null;
    }
}
