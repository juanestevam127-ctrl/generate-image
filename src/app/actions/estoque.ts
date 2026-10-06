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
        const { data: client, error: clientError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return { success: false, error: "Cliente não encontrado." };
        }

        if (client.integracao_tipo !== 'BOOM' || !client.boom_url) {
            return { success: false, error: "URL do Boom Sistemas não configurada para este cliente." };
        }

        const fetchUrl = client.boom_url;
        console.log(`Buscando Boom API: ${fetchUrl}`);
        
        const res = await fetch(fetchUrl, {
            method: 'GET'
        });

        if (!res.ok) {
            return { success: false, error: `Falha Boom API: HTTP ${res.status}` };
        }

        const textRes = await res.text();
        let xmlString = "";
        let vehicles = [];
        let parsedJsonData = null;
        
        try {
            const parsed = JSON.parse(textRes);
            
            // Check if it's the direct JSON format: [ { "veiculos": { "veiculo": [...] } } ]
            if (Array.isArray(parsed) && parsed[0]?.veiculos?.veiculo) {
                parsedJsonData = parsed[0].veiculos.veiculo;
            } else if (parsed?.veiculos?.veiculo) {
                parsedJsonData = parsed.veiculos.veiculo;
            } 
            // Check if it's the n8n XML wrapper format: [ { "data": "<?xml..." } ]
            else if (Array.isArray(parsed) && parsed[0]?.data) {
                xmlString = parsed[0].data;
            } else if (parsed.data) {
                xmlString = parsed.data;
            } else {
                xmlString = textRes;
            }
        } catch(err) {
            // It's raw XML
            xmlString = textRes;
        }

        // If we found the parsed JSON vehicles, map them directly
        if (parsedJsonData && Array.isArray(parsedJsonData)) {
            vehicles = parsedJsonData.map((v: any) => {
                const pictures = [];
                if (v.galeria && v.galeria.item) {
                    const items = Array.isArray(v.galeria.item) ? v.galeria.item : [v.galeria.item];
                    let isFirst = true;
                    for (const link of items) {
                        if (link && typeof link === 'string' && !link.endsWith("semfoto.png")) {
                            pictures.push({
                                Link: link,
                                Principal: isFirst ? "true" : "false"
                            });
                            isFirst = false;
                        }
                    }
                }
                
                return {
                    vehicleExternalKey: v.id || "",
                    markName: v.marca || "",
                    modelName: v.modelo || "",
                    versionName: v.titulo || "",
                    year: v.ano_mod || v.ano_fab || "",
                    km: parseInt(v.km || "0") || 0,
                    saleValue: parseFloat(v.valor || "0") || 0,
                    color: v.cor || "",
                    transmissionName: v.cambio || "",
                    fuelName: v.combustivel || "",
                    plate: v.placa || "",
                    subCategoryName: v.tipo || "",
                    description: v.observacao || "",
                    itemJs: "[]",
                    pictureJs: JSON.stringify(pictures),
                    finalPlate: v.placa ? v.placa.slice(-1) : ""
                };
            });
            return { success: true, data: vehicles };
        }

        // Otherwise, fallback to XML parsing
        if (!xmlString || !xmlString.includes('<veiculo>')) {
            return { success: false, error: "Falha Boom API: Nenhum dado XML ou JSON válido retornado." };
        }

        const veiculosRegex = /<veiculo>([\s\S]*?)<\/veiculo>/g;
        let match;

        const extractTag = (xml: string, tag: string) => {
            const regex = new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>', 'i');
            const match = xml.match(regex);
            return match ? match[1].trim() : null;
        }

        while ((match = veiculosRegex.exec(xmlString)) !== null) {
            const vXml = match[1];

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
                vehicleExternalKey: extractTag(vXml, 'id') || "",
                markName: extractTag(vXml, 'marca') || "",
                modelName: extractTag(vXml, 'modelo') || "",
                versionName: extractTag(vXml, 'titulo') || "",
                year: extractTag(vXml, 'ano_mod') || extractTag(vXml, 'ano_fab') || "",
                km: parseInt(extractTag(vXml, 'km') || "0") || 0,
                saleValue: parseFloat(extractTag(vXml, 'valor') || "0") || 0,
                color: extractTag(vXml, 'cor') || "",
                transmissionName: extractTag(vXml, 'cambio') || "",
                fuelName: extractTag(vXml, 'combustivel') || "",
                plate: extractTag(vXml, 'placa') || "",
                subCategoryName: extractTag(vXml, 'tipo') || "",
                description: extractTag(vXml, 'observacao') || "",
                itemJs: "[]",
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


export async function fetchLojaConectadaInventoryAction(clientId: string) {
    try {
        const { data: client, error: clientError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return { success: false, error: "Cliente n\u00e3o encontrado." };
        }

        if (client.integracao_tipo !== 'LOJA_CONECTADA' || !client.loja_conectada_token) {
            return { success: false, error: "Token da Loja Conectada n\u00e3o configurado para este cliente." };
        }

        const fetchUrl = "https://api-site.lojaconectada.com.br/v2/inventory?page_size=80";
        console.log(`Buscando Loja Conectada API: ${fetchUrl}`);
        
        const res = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${client.loja_conectada_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            return { success: false, error: `Falha Loja Conectada API: HTTP ${res.status}` };
        }

        const rawData = await res.json();
        let results = [];
        if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].results) {
            results = rawData[0].results;
        } else if (rawData.results) {
            results = rawData.results;
        } else {
            return { success: false, error: "Formato de resposta inesperado da API da Loja Conectada." };
        }

                const vehicles = results.map((v: any) => {
            const pictures = Array.isArray(v.photos) ? v.photos.map((p: any, index: number) => ({
                Link: p.photo,
                Principal: index === 0 ? "true" : "false"
            })) : [];
            const optionals = Array.isArray(v.optionals) ? v.optionals.map((o: any) => o.name) : [];

            return {
                vehicleExternalKey: v.ad_id?.toString() || crypto.randomUUID(),
                markName: v.manufacturer?.name || "N/A",
                modelName: v.model?.name || "N/A",
                versionName: v.version?.name || v.version_site || "N/A",
                year: (v.make_year && v.model_year) ? `${v.make_year}/${v.model_year}` : (v.model_year || v.make_year || ""),
                km: parseInt(v.km || "0") || 0,
                saleValue: parseFloat(v.price || "0") || 0,
                color: v.color?.name || "N/A",
                transmissionName: v.transmission?.name || "N/A",
                fuelName: v.fuel?.name || "N/A",
                plate: v.license_plate || "N/A",
                finalPlate: v.license_plate ? v.license_plate.slice(-1) : "",
                subCategoryName: v.category?.name || "N/A",
                description: v.description || "",
                itemJs: JSON.stringify(optionals),
                pictureJs: JSON.stringify(pictures),
            };
        });

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchLojaConectadaInventoryAction:", error);
        return { success: false, error: "Erro interno: " + error.message };
    }
}

export async function fetchAutoCertoInventoryAction(clientId: string) {
    try {
        const { data: client, error } = await supabase
            .from("clientes")
            .select("integracao_tipo, autocerto_username, autocerto_password")
            .eq("id", clientId)
            .single();

        if (error) throw error;
        if (client.integracao_tipo !== "AUTOCERTO") {
            return { success: false, error: "Cliente não possui integração AutoCerto configurada." };
        }
        if (!client.autocerto_username || !client.autocerto_password) {
            return { success: false, error: "Credenciais AutoCerto incompletas." };
        }

        const authBody = new URLSearchParams();
        authBody.append("grant_type", "password");
        authBody.append("username", client.autocerto_username);
        authBody.append("password", client.autocerto_password);

        const authRes = await fetch("https://integracao.autocerto.com/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: authBody.toString()
        });

        if (!authRes.ok) {
            return { success: false, error: "Falha na autenticação AutoCerto." };
        }

        const authData = await authRes.json();
        const token = authData.access_token;

        const inventoryRes = await fetch("https://integracao.autocerto.com/api/Veiculo/ObterEstoque", {
            method: "GET",
            headers: {
                "accept": "application/json",
                "authorization": \Bearer \\
            }
        });

        if (!inventoryRes.ok) {
            return { success: false, error: "Falha ao buscar estoque AutoCerto." };
        }

        const items = await inventoryRes.json();

        const vehicles = items.map((v: any) => {
            const pictures = (v.Fotos || []).map((f: any, idx: number) => ({
                Link: f.URL,
                Principal: f.Posicao === 1 || idx === 0
            }));
            const optionals = (v.Opcionais || []).map((o: any) => o.Descricao);
            
            return {
                vehicleExternalKey: String(v.Codigo),
                markName: v.Marca || "N/A",
                modelName: v.Modelo || "N/A",
                versionName: v.Versao || "N/A",
                year: (v.AnoFabricacao && v.AnoModelo) ? `${v.AnoFabricacao}/${v.AnoModelo}` : (v.AnoModelo || v.AnoFabricacao || ""),
                km: parseInt(v.Km || "0") || 0,
                saleValue: v.Preco || 0,
                color: v.Cor || "N/A",
                transmissionName: v.Cambio || "N/A",
                fuelName: v.Combustivel || "N/A",
                plate: v.Placa || "",
                subCategoryName: v.TipoVeiculo || "N/A",
                description: v.Observacao || "",
                itemJs: JSON.stringify(optionals),
                pictureJs: JSON.stringify(pictures),
            };
        });

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchAutoCertoInventoryAction:", error);
        return { success: false, error: "Erro interno: " + error.message };
    }
}
