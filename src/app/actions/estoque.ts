"use server";

import { supabase } from "@/lib/supabase";

export async function fetchBndvInventoryAction(clientId: string) {
    try {
        // 1. Get client credentials
        const { data: client, error } = await supabase
            .from("clientes")
            .select("integracao_tipo, bndv_external_key, bndv_password, bndv_customer_key")
            .eq("id", clientId)
            .single();

        if (error) throw error;

        if (client.integracao_tipo !== "BNDV") {
            return { success: false, error: "Cliente não possui integração BNDV configurada." };
        }

        if (!client.bndv_external_key || !client.bndv_password || !client.bndv_customer_key) {
            return { success: false, error: "Credenciais BNDV incompletas." };
        }

        // 2. Login to get token
        const loginRes = await fetch("https://api-estoque.azurewebsites.net/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                externalKey: client.bndv_external_key,
                password: client.bndv_password
            })
        });

        if (!loginRes.ok) {
            return { success: false, error: "Falha na autenticação BNDV." };
        }

        const loginData = await loginRes.json();
        const token = loginData[0]?.token;

        if (!token) {
            return { success: false, error: "Token não recebido do BNDV." };
        }

        // 3. Fetch data via GraphQL
        const query = `{ vehiclesBy(customerKey: "${client.bndv_customer_key}") { vehicleExternalKey subCategoryId subCategoryName registrationDate description markId markName modelId modelName versionId versionName year vehicleTypeId vehicleTypeName saleValue km pictureJs itemJs plate finalPlate color transmissionId transmissionName fuelId fuelName categoryId Customer { name contact site cnpj customerKey } } }`;

        const graphqlRes = await fetch("https://api-estoque.azurewebsites.net/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });

        if (!graphqlRes.ok) {
            return { success: false, error: "Falha ao buscar dados do BNDV." };
        }

        const graphqlData = await graphqlRes.json();
        
        if (graphqlData.errors) {
            return { success: false, error: graphqlData.errors[0]?.message || "Erro na query GraphQL do BNDV." };
        }

        const vehicles = graphqlData.data?.vehiclesBy || [];
        
        return { success: true, data: vehicles };

    } catch (e: any) {
        console.error("fetchBndvInventoryAction error:", e);
        return { success: false, error: e.message || "Erro desconhecido ao conectar com BNDV." };
    }
}
