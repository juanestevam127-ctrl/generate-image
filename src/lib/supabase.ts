import { createClient } from '@supabase/supabase-js';
import { getPresignedUrlAction } from '@/app/actions/upload';

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Ensure protocol exists (fixes DNS issues if protocol is missing in environment variables)
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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

        // 4. Upload to R2
        const uploadRes = await fetch(presignedResult.signedUrl, {
            method: 'PUT',
            body: blob,
            headers: {
                'Content-Type': contentType
            }
        });

        if (!uploadRes.ok) {
            console.error('Failed to upload to R2:', await uploadRes.text());
            return null;
        }

        if (onProgress) onProgress(100);

        // 5. Return Public URL
        return presignedResult.publicUrl;
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
