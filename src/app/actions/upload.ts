"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || "https://504606956cf9454e5c1a0ee6a159a338.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "6403d276742ca081b4908554c548089b",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "e4c20157a3943c037aca4df3b10c63aa5198af0ca1aca4ac9ede5368db847dba"
    }
});

export async function getPresignedUrlAction(filename: string, contentType: string) {
    try {
        const bucket = "autodesign-bucket";
        let key = filename;
        if (!key.startsWith("temp-files/")) {
            key = `temp-files/${filename}`;
        }
        
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType
        });

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        const publicUrl = `https://cdn.artesdesignonline.com.br/${key}`;

        return { success: true, signedUrl, publicUrl };
    } catch (e: any) {
        console.error("Presigned URL Error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Server Action para upload direto do backend para o R2.
 * Evita bloqueios de CORS do navegador em ambiente localhost!
 */
export async function uploadImageServerAction(base64Data: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer: Buffer;
        let contentType = "image/png";

        if (matches && matches.length === 3) {
            contentType = matches[1];
            buffer = Buffer.from(matches[2], "base64");
        } else {
            buffer = Buffer.from(base64Data, "base64");
        }

        const extension = contentType.split("/")[1] || "png";
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const key = `temp-files/${timestamp}-${randomStr}.${extension}`;

        const bucket = "autodesign-bucket";
        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType
        }));

        const publicUrl = `https://cdn.artesdesignonline.com.br/${key}`;
        return { success: true, publicUrl };
    } catch (e: any) {
        console.error("Erro no upload do servidor R2:", e);
        return { success: false, error: e.message || "Erro no upload" };
    }
}
