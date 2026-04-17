"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function verifyLoginAction(email: string, pass: string) {
    try {
        const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email.toLowerCase())
            .eq("password", pass)
            .single();

        if (error) {
            console.error("Server Action Login Error:", error);
            if (error.code === 'PGRST116') { // No rows found
                return { success: false, error: "Credenciais inválidas." };
            }
            return { success: false, error: "Erro na conexão com o banco de dados." };
        }

        if (data) {
            const { password, ...safeUser } = data;
            return { success: true, user: safeUser };
        }

        return { success: false, error: "Credenciais inválidas." };
    } catch (e) {
        console.error("Server Action Auth Exception:", e);
        return { success: false, error: "Erro interno no servidor." };
    }
}

export async function loadInitialDataAction() {
    try {
        // Run fetches in parallel on the server
        const [clientsRes, usersRes, layoutsRes, soldRes] = await Promise.all([
            supabase.from("clientes").select("*").order("name", { ascending: true }),
            supabase.from("usuarios").select("*").order("email", { ascending: true }),
            supabase.from("design_online_layouts_clientes").select("*").order("nome_cliente", { ascending: true }),
            supabase.from("clientes_vendidos").select("*").order("name", { ascending: true })
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (usersRes.error) throw usersRes.error;

        return {
            success: true,
            data: {
                clients: clientsRes.data || [],
                registeredUsers: usersRes.data || [],
                layoutClients: layoutsRes.data || [],
                soldClients: soldRes.data || []
            }
        };
    } catch (error: any) {
        console.error("Server Action Load Data Error:", error);
        return { success: false, error: error.message || "Falha ao carregar dados do servidor." };
    }
}

export async function serverUploadImage(base64: string, bucket: string = 'images', folder: string = '') {
    try {
        // 1. Parse base64
        const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        let buffer: Buffer;
        let contentType: string;

        if (matches && matches.length === 3) {
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Assume it might be just the base64 string or already formatted poorly
            // Fallback to fetch-like logic if it's a URL or just try to convert
            buffer = Buffer.from(base64.split(',')[1] || base64, 'base64');
            contentType = 'image/png';
        }

        const extension = contentType.split('/')[1] || 'png';
        const timestamp = Date.now();
        const filename = `${folder ? folder + '/' : ''}${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, { contentType, upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);
        return { success: true, url: publicUrl };
    } catch (error: any) {
        console.error("Server Upload Error:", error);
        return { success: false, error: error.message || "Falha no upload via servidor." };
    }
}

export async function serverUploadFile(formData: FormData, bucket: string = 'images', folder: string = '') {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: "Nenhum arquivo enviado." };

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const timestamp = Date.now();
        const filename = `${folder ? folder + '/' : ''}${timestamp}-${file.name}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, { 
                contentType: file.type || 'application/octet-stream',
                upsert: false 
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);
        return { success: true, url: publicUrl };
    } catch (error: any) {
        console.error("Server File Upload Error:", error);
        return { success: false, error: error.message || "Falha no upload do arquivo via servidor." };
    }
}
