import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadImage(image: string, bucket: string = 'images'): Promise<string | null> {
    try {
        // 1. Convert Base64 to Blob
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });

        // 2. Generate unique filename
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

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

        return publicUrl;
    } catch (e) {
        console.error('Upload Logic Error:', e);
        return null;
    }
}
