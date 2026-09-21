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
        // Force the folder temp-files
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
        const publicUrl = `https://pub-4c1b7ac0df2a4c329a626eab3a923e47.r2.dev/${key}`;

        return { success: true, signedUrl, publicUrl };
    } catch (e: any) {
        console.error("Presigned URL Error:", e);
        return { success: false, error: e.message };
    }
}
