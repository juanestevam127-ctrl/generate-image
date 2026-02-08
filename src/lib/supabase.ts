import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadImage(image: string, bucket: string = 'images', folder: string = ''): Promise<string | null> {
    try {
        // 1. Convert Base64 (DataURL) to Blob - Browser safe
        const res = await fetch(image);
        const blob = await res.blob();

        // 2. Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        // Ensure folder ends with / if provided and not empty
        const folderPrefix = folder ? (folder.endsWith('/') ? folder : `${folder}/`) : '';
        const filename = `${folderPrefix}${timestamp}-${randomStr}.png`;

        // 3. Upload
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, blob, {
                contentType: 'image/png',
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            return null;
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filename);

        console.log("Upload success:", publicUrl);
        return publicUrl;
    } catch (e) {
        console.error('Upload Logic Error:', e);
        return null;
    }
}
