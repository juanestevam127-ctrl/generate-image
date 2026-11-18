"use server";

import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dtrsswmwk";
const API_KEY = process.env.CLOUDINARY_API_KEY || "119741111254882";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "OYLWJF2_5D_Wsi0taM0mHX1JqyU";

interface MockupProcessResult {
    success: boolean;
    transformedUrl?: string;
    originalPublicId?: string;
    error?: string;
}

/**
 * Faz o upload da imagem original para o Cloudinary (se já não estiver lá)
 * e aplica a transformação de corte / mockup (ex: losango/máscara).
 *
 * @param imageUrl URL da imagem original do veículo
 * @param transformationString Expressão de transformação Cloudinary (ex: "c_fill,w_650,h_450,g_center/l_Group_93_2_wkjwms,fl_cutter,w_650,h_450/l_Group_93_2_wkjwms,w_650,h_450,co_white,e_make_transparent:20")
 */
export async function processCloudinaryMockupAction(
    imageUrl: string,
    transformationString?: string
): Promise<MockupProcessResult> {
    try {
        if (!imageUrl) {
            return { success: false, error: "URL da imagem não fornecida" };
        }

        // Se a imagem já é uma URL do Cloudinary deste cloud name, podemos só extrair o public_id
        const cloudinaryPrefix = `res.cloudinary.com/${CLOUD_NAME}/image/upload/`;
        let publicId = "";

        if (imageUrl.includes(cloudinaryPrefix)) {
            const parts = imageUrl.split(cloudinaryPrefix)[1];
            // Remove transforms prévios ou versão se houver
            const segments = parts.split("/");
            const lastSegment = segments[segments.length - 1];
            publicId = lastSegment.split(".")[0];
        } else {
            // Upload da imagem para o Cloudinary a partir da URL
            const timestamp = Math.floor(Date.now() / 1000);
            const folder = "mockups_veiculos";
            // Na assinatura do Cloudinary, todos os parâmetros enviados além de file/api_key precisam ser assinados em ordem alfabética!
            const paramsToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
            const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file: imageUrl,
                    api_key: API_KEY,
                    timestamp,
                    signature,
                    folder
                })
            });

            if (!response.ok) {
                const errData = await response.text();
                throw new Error(`Falha no upload do Cloudinary: ${errData}`);
            }

            const uploadData = await response.json();
            publicId = uploadData.public_id;
        }

        // Se não tiver transformação customizada, retorna a URL padrão do Cloudinary
        if (!transformationString || !transformationString.trim()) {
            return {
                success: true,
                transformedUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}.png`,
                originalPublicId: publicId
            };
        }

        // Limpa a string de transformação (remove barras nas pontas se houver)
        let cleanTransform = transformationString.trim().replace(/^\/+|\/+$/g, "");

        // Constrói a URL final de transformação
        const transformedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${cleanTransform}/${publicId}.png`;

        return {
            success: true,
            transformedUrl,
            originalPublicId: publicId
        };
    } catch (err: any) {
        console.error("Erro ao processar mockup no Cloudinary:", err);
        return {
            success: false,
            error: err.message || "Erro desconhecido ao processar mockup"
        };
    }
}
