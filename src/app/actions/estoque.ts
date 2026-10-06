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
        console.log("BNDV Login Response:", JSON.stringify(loginData));
        const token = Array.isArray(loginData) ? loginData[0]?.token : loginData?.token;

        if (!token) {
            return { 
                success: false, 
                error: `Falha BNDV: Token não recebido. Resposta da API: ${JSON.stringify(loginData).substring(0, 150)}` 
            };
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


export async function fetchBoomInventoryAction(clientId: string) {
    try {
        
        
        // Obter credenciais do cliente
        const { data: client, error: clientError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return { success: false, error: "Cliente não encontrado." };
        }

        if (client.integracao_tipo !== 'BOOM' || !client.boom_token || !client.boom_customer_key) {
            return { success: false, error: "Credenciais do Boom Sistemas não configuradas para este cliente." };
        }

        const token = client.boom_token;
        const customerKey = client.boom_customer_key;

        console.log(`Buscando Boom API para ${customerKey}...`);
        const res = await fetch(`https://boomsistemas.com.br/api/integration-api/xml/${customerKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            return { success: false, error: `Falha Boom API: HTTP ${res.status}` };
        }

        const data = await res.json();
        const xmlString = data[0]?.data || "";

        if (!xmlString) {
            return { success: false, error: "Falha Boom API: Nenhum dado XML retornado." };
        }

        // Regex parser para extrair <veiculo>...</veiculo>
        const veiculosRegex = /<veiculo>([\s\S]*?)<\/veiculo>/g;
        let match;
        const vehicles = [];

        const extractTag = (xml: string, tag: string) => {
            const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
            const match = xml.match(regex);
            return match ? match[1].trim() : null;
        };

        while ((match = veiculosRegex.exec(xmlString)) !== null) {
            const vXml = match[1];

            // Fotos
            const galeriaMatch = vXml.match(/<galeria>([\s\S]*?)<\/galeria>/);
            const pictures = [];
            if (galeriaMatch) {
                const itemRegex = /<item>(.*?)<\/item>/g;
                let itemMatch;
                let isFirst = true;
                while ((itemMatch = itemRegex.exec(galeriaMatch[1])) !== null) {
                    const link = itemMatch[1].trim();
                    if (link && !link.endsWith("semfoto.png")) {
                        pictures.push({
                            Link: link,
                            Principal: isFirst ? "true" : "false"
                        });
                        isFirst = false;
                    }
                }
            }

            vehicles.push({
                vehicleExternalKey: extractTag(vXml, 'id'),
                markName: extractTag(vXml, 'marca') || "",
                modelName: extractTag(vXml, 'modelo') || "",
                versionName: extractTag(vXml, 'titulo') || "",
                year: extractTag(vXml, 'ano_mod') || extractTag(vXml, 'ano_fab') || "",
                km: parseInt(extractTag(vXml, 'km') || "0"),
                saleValue: parseFloat(extractTag(vXml, 'valor') || "0"),
                color: extractTag(vXml, 'cor') || "",
                transmissionName: extractTag(vXml, 'cambio') || "",
                fuelName: extractTag(vXml, 'combustivel') || "",
                plate: extractTag(vXml, 'placa') || "",
                subCategoryName: extractTag(vXml, 'tipo') || "",
                description: extractTag(vXml, 'observacao') || "",
                itemJs: "[]", // Opcionais se tiver
                pictureJs: JSON.stringify(pictures),
                finalPlate: extractTag(vXml, 'placa')?.slice(-1) || ""
            });
        }

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchBoomInventoryAction:", error);
        return { success: false, error: "Erro interno: " + error.message };
    }
}
