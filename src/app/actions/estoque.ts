"use server";
import { XMLParser } from "fast-xml-parser";

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
            let errorMsg = "Credenciais inválidas";
            try {
                const errData = await loginRes.json();
                errorMsg = errData.message || JSON.stringify(errData);
            } catch (e) {
                errorMsg = await loginRes.text();
            }
            return { success: false, error: `Falha na autenticação BNDV: ${errorMsg}` };
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
                "authorization": `Bearer ${token}`
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



export async function fetchRevendaMaisInventoryAction(clientId: string) {
    try {
        const { data: client, error } = await supabase
            .from("clientes")
            .select("integracao_tipo, revenda_mais_url")
            .eq("id", clientId)
            .single();

        if (error) throw error;

        if (client.integracao_tipo !== "REVENDA_MAIS") {
            return { success: false, error: "Cliente não possui integração Revenda Mais configurada." };
        }

        if (!client.revenda_mais_url) {
            return { success: false, error: "URL do Revenda Mais não configurada." };
        }

        const url = client.revenda_mais_url;
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error("Falha ao buscar API: " + res.statusText);

        const rawText = await res.text();
        
        let xmlData = "";
        try {
            // Tenta parsear como JSON caso venha encapsulado (ex: [{"data": "<?xml..."}])
            const data = JSON.parse(rawText);
            if (Array.isArray(data) && data.length > 0 && data[0].data) {
                xmlData = data[0].data;
            } else if (data.data) {
                xmlData = data.data;
            } else {
                xmlData = rawText; // Fallback caso não encontre 'data'
            }
        } catch (e) {
            // Se falhar o parse do JSON, é porque já veio o XML cru (começando com <)
            xmlData = rawText;
        }

        const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });
        const parsed = parser.parse(xmlData);

        if (!parsed || !parsed.ADS || !parsed.ADS.AD) {
            return { success: true, data: [] }; // Nenhum veículo encontrado
        }

        let ads = parsed.ADS.AD;
        if (!Array.isArray(ads)) {
            ads = [ads];
        }

        const vehicles = ads.map((ad: any) => {
            const pics = ad.IMAGES_LARGE?.IMAGE_URL_LARGE || ad.IMAGES?.IMAGE_URL || [];
            const picturesArr = Array.isArray(pics) ? pics : [pics];
            const pictures = picturesArr.filter(Boolean).map((url, index) => ({
                Link: url,
                Principal: index === 0 ? "true" : "false"
            }));
            const optionals = ad.ACCESSORIES ? String(ad.ACCESSORIES).split(',').filter(Boolean).map(o => o.trim()) : [];

            return {
                vehicleExternalKey: ad.ID?.toString() || crypto.randomUUID(),
                markName: ad.MAKE || "N/A",
                modelName: ad.MODEL || "N/A",
                versionName: ad.BASE_MODEL || "N/A",
                year: (ad.FABRIC_YEAR && ad.YEAR) ? `${ad.FABRIC_YEAR}/${ad.YEAR}` : (ad.YEAR || ad.FABRIC_YEAR || ""),
                km: parseInt(ad.MILEAGE || "0") || 0,
                saleValue: parseFloat(ad.PROMOTION_PRICE || ad.PRICE || "0") || 0,
                color: ad.COLOR || "N/A",
                transmissionName: ad.GEAR || "N/A",
                fuelName: ad.FUEL || "N/A",
                plate: ad.PLATE || "N/A",
                finalPlate: ad.PLATE ? String(ad.PLATE).slice(-1) : "",
                subCategoryName: ad.CATEGORY || ad.BODY_TYPE || "N/A",
                description: ad.DESCRIPTION || "",
                itemJs: JSON.stringify(optionals),
                pictureJs: JSON.stringify(pictures),
            };
        });

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchRevendaMaisInventoryAction:", error);
        return { success: false, error: "Erro interno: " + error.message };
    }
}


export async function fetchAutoConfInventoryAction(clientId: string) {
    try {
        const { data: client, error } = await supabase
            .from("clientes")
            .select("integracao_tipo, revenda_mais_url, boom_url")
            .eq("id", clientId)
            .single();

        if (error) throw error;

        if (client.integracao_tipo !== "AUTOCONF") {
            return { success: false, error: "Cliente não possui integração AutoConf configurada." };
        }

        const url = client.revenda_mais_url || client.boom_url;
        if (!url) {
            return { success: false, error: "URL do XML do AutoConf não configurada." };
        }

        const res = await fetch(url, { 
            headers: { 
                accept: "application/json, text/xml, application/xml, */*" 
            },
            cache: 'no-store'
        });
        if (!res.ok) throw new Error("Falha ao buscar XML do AutoConf: " + res.statusText);

        const rawText = await res.text();
        
        let xmlData = "";
        try {
            // Tenta parsear caso venha encapsulado em JSON (ex: [{"data": "<?xml..."}] ou { "data": "..." })
            const data = JSON.parse(rawText);
            if (Array.isArray(data) && data.length > 0 && data[0]?.data) {
                xmlData = data[0].data;
            } else if (data?.data) {
                xmlData = data.data;
            } else {
                xmlData = rawText;
            }
        } catch (e) {
            // Se já for XML puro começando com <
            xmlData = rawText;
        }

        const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });
        const parsed = parser.parse(xmlData);

        if (!parsed || !parsed.ADS || !parsed.ADS.AD) {
            return { success: true, data: [] }; // Nenhum veículo encontrado
        }

        let ads = parsed.ADS.AD;
        if (!Array.isArray(ads)) {
            ads = [ads];
        }

        const vehicles = ads.map((ad: any) => {
            // Extração de fotos
            // AutoConf vem com múltiplos <IMAGES><IMAGE_URL>url</IMAGE_URL></IMAGES>
            // ou um único <IMAGES> com array ou objeto
            let picturesArr: string[] = [];
            if (ad.IMAGES) {
                const imgContainer = Array.isArray(ad.IMAGES) ? ad.IMAGES : [ad.IMAGES];
                for (const item of imgContainer) {
                    if (item?.IMAGE_URL) {
                        if (Array.isArray(item.IMAGE_URL)) {
                            picturesArr.push(...item.IMAGE_URL);
                        } else if (typeof item.IMAGE_URL === "string") {
                            picturesArr.push(item.IMAGE_URL);
                        }
                    } else if (typeof item === "string") {
                        picturesArr.push(item);
                    }
                }
            } else if (ad.IMAGES_LARGE) {
                const l = ad.IMAGES_LARGE.IMAGE_URL_LARGE || ad.IMAGES_LARGE;
                picturesArr = Array.isArray(l) ? l : [l];
            }

            const pictures = picturesArr.filter(Boolean).map((url, index) => ({
                Link: String(url).trim(),
                Principal: index === 0 ? "true" : "false"
            }));

            // Extração de opcionais / features
            let optionals: string[] = [];
            if (ad.FEATURES) {
                const featContainer = Array.isArray(ad.FEATURES) ? ad.FEATURES : [ad.FEATURES];
                for (const f of featContainer) {
                    if (f?.FEATURE) {
                        if (Array.isArray(f.FEATURE)) {
                            optionals.push(...f.FEATURE.map((x: any) => String(x).trim()));
                        } else {
                            optionals.push(String(f.FEATURE).trim());
                        }
                    } else if (typeof f === "string") {
                        optionals.push(f.trim());
                    }
                }
            } else if (ad.ACCESSORIES) {
                optionals = String(ad.ACCESSORIES).split(',').filter(Boolean).map(o => o.trim());
            }

            // Ano formatado (FABRIC_YEAR/YEAR)
            const yearFab = ad.FABRIC_YEAR ? String(ad.FABRIC_YEAR).trim() : "";
            const yearMod = ad.YEAR ? String(ad.YEAR).trim() : "";
            const yearFormatted = (yearFab && yearMod && yearFab !== yearMod) 
                ? `${yearFab}/${yearMod}` 
                : (yearMod || yearFab || "");

            // Valor de venda
            const salePrice = parseFloat(String(ad.PRICES?.PROMOTION_PRICE || ad.PRICES?.REGULAR_PRICE || ad.PRICE || "0").replace(/[^0-9.]/g, "")) || 0;

            // Quilometragem
            const km = parseInt(String(ad.MILEAGE || "0").replace(/[^0-9]/g, "")) || 0;

            // Placa
            const plate = ad.FULL_PLATE || ad.PLATE || "";

            return {
                vehicleExternalKey: ad.ID?.toString() || crypto.randomUUID(),
                markName: ad.MAKE || "N/A",
                modelName: ad.MODEL || "N/A",
                versionName: ad.VERSION || ad.AD_VERSION || ad.TITLE || "N/A",
                year: yearFormatted,
                km: km,
                saleValue: salePrice,
                color: ad.COLOR || "N/A",
                transmissionName: ad.gear || ad.GEAR || "N/A",
                fuelName: ad.FUEL || "N/A",
                plate: plate,
                finalPlate: plate ? String(plate).slice(-1) : "",
                subCategoryName: ad.CATEGORY || ad.BODY || ad.BODY_TYPE || "N/A",
                description: ad.DESCRIPTION || "",
                itemJs: JSON.stringify(optionals),
                pictureJs: JSON.stringify(pictures),
            };
        });

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchAutoConfInventoryAction:", error);
        return { success: false, error: "Erro interno AutoConf: " + error.message };
    }
}

export async function getNocoDbBasesAction() {
    try {
        const host = "https://evolution-nocodb.4lap5g.easypanel.host";
        const token = "9Qz7ETxba8JnXq3B0e9ybHaSiDar6hLqYBIIkg7u";
        const res = await fetch(`${host}/api/v1/db/meta/projects`, {
            headers: { "xc-token": token }
        });
        if (!res.ok) throw new Error(`Falha ao buscar bases (${res.status}): ${res.statusText}`);
        const data = await res.json();
        const bases = (data.list || []).map((b: any) => ({ id: b.id, title: b.title }));
        return { success: true, data: bases };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao carregar bases do NocoDB." };
    }
}

export async function getNocoDbTablesAction(baseIdentifier: string) {
    try {
        if (!baseIdentifier) return { success: true, data: [] };
        const host = "https://evolution-nocodb.4lap5g.easypanel.host";
        const token = "9Qz7ETxba8JnXq3B0e9ybHaSiDar6hLqYBIIkg7u";
        const headers = { "xc-token": token };

        let projectId = baseIdentifier;
        if (!baseIdentifier.startsWith("p")) {
            const bRes = await fetch(`${host}/api/v1/db/meta/projects`, { headers });
            if (bRes.ok) {
                const bData = await bRes.json();
                const found = (bData.list || []).find((b: any) => 
                    (b.title && b.title.toLowerCase() === baseIdentifier.toLowerCase()) || 
                    (b.id && b.id.toLowerCase() === baseIdentifier.toLowerCase())
                );
                if (found) projectId = found.id;
            }
        }

        const tRes = await fetch(`${host}/api/v1/db/meta/projects/${projectId}/tables`, { headers });
        if (!tRes.ok) throw new Error(`Falha ao buscar tabelas (${tRes.status}): ${tRes.statusText}`);
        const tData = await tRes.json();
        const tables = (tData.list || [])
            .filter((t: any) => !t.title.startsWith("nc_") && !t.title.startsWith("xc_") && t.title !== "notification")
            .map((t: any) => ({ id: t.id, title: t.title }));

        return { success: true, data: tables };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao carregar tabelas do NocoDB." };
    }
}

export async function fetchNocoDbInventoryAction(clientId: string) {
    try {
        const { data: client, error } = await supabase
            .from("clientes")
            .select("integracao_tipo, boom_customer_key, revenda_mais_url, boom_url, boom_token")
            .eq("id", clientId)
            .single();

        if (error) throw error;

        if (client.integracao_tipo !== "NOCODB") {
            return { success: false, error: "Cliente não possui integração NocoDB configurada." };
        }

        // Host e Token padrões com possibilidade de override
        const nocoHost = (client.boom_url && client.boom_url.trim()) 
            ? client.boom_url.trim().replace(/\/+$/, "") 
            : "https://evolution-nocodb.4lap5g.easypanel.host";
        const nocoToken = (client.boom_token && client.boom_token.trim()) 
            ? client.boom_token.trim() 
            : "9Qz7ETxba8JnXq3B0e9ybHaSiDar6hLqYBIIkg7u";

        const baseIdentifier = (client.boom_customer_key || "").trim();
        const tablePrefixOrNames = (client.revenda_mais_url || "").trim();

        if (!baseIdentifier) {
            return { success: false, error: "Nome ou ID da Base do NocoDB não configurado no cliente." };
        }

        const headers = {
            "xc-token": nocoToken,
            "Content-Type": "application/json"
        };

        // 1. Resolver o ID da Base / Projeto
        let projectId = baseIdentifier;
        if (!baseIdentifier.startsWith("p")) {
            const basesRes = await fetch(`${nocoHost}/api/v1/db/meta/projects`, { headers });
            if (!basesRes.ok) {
                return { success: false, error: `Falha ao listar bases NocoDB (${basesRes.status}): ${basesRes.statusText}` };
            }
            const basesData = await basesRes.json();
            const foundBase = (basesData.list || []).find((b: any) => 
                (b.title && b.title.toLowerCase() === baseIdentifier.toLowerCase()) || 
                (b.id && b.id.toLowerCase() === baseIdentifier.toLowerCase())
            );
            if (!foundBase) {
                return { success: false, error: `Base '${baseIdentifier}' não encontrada no NocoDB.` };
            }
            projectId = foundBase.id;
        }

        // 2. Buscar tabelas deste projeto
        const tablesRes = await fetch(`${nocoHost}/api/v1/db/meta/projects/${projectId}/tables`, { headers });
        if (!tablesRes.ok) {
            return { success: false, error: `Falha ao listar tabelas do projeto NocoDB: ${tablesRes.statusText}` };
        }
        const tablesData = await tablesRes.json();
        const allTables: any[] = tablesData.list || [];

        // 3. Localizar tabelas ativas e inativas
        let targetTables: { table: any; status: "ativo" | "inativo" }[] = [];

        if (tablePrefixOrNames.includes(",")) {
            const parts = tablePrefixOrNames.split(",").map((s: string) => s.trim().toLowerCase());
            for (const t of allTables) {
                const tTitle = (t.title || "").toLowerCase();
                const tId = (t.id || "").toLowerCase();
                if (parts.includes(tTitle) || parts.includes(tId)) {
                    const isInativo = tTitle.includes("inativo") || tTitle.includes("desativ");
                    targetTables.push({ table: t, status: isInativo ? "inativo" : "ativo" });
                }
            }
        } else {
            const prefix = tablePrefixOrNames.toLowerCase().replace(/_estoque.*$/, "");
            for (const t of allTables) {
                const tTitle = (t.title || "").toLowerCase();
                const matchesPrefix = !prefix || tTitle.startsWith(prefix) || tTitle.includes(prefix);
                if (matchesPrefix) {
                    if (tTitle.endsWith("_estoque") || tTitle === `${prefix}_estoque` || tTitle === "estoque") {
                        targetTables.push({ table: t, status: "ativo" });
                    } else if (tTitle.endsWith("_estoque_inativo") || tTitle.includes("estoque_inativo") || tTitle === `${prefix}_estoque_inativo`) {
                        targetTables.push({ table: t, status: "inativo" });
                    }
                }
            }
        }

        // Fallback: se não achou pelo prefixo, busca qualquer tabela com 'estoque' no nome
        if (targetTables.length === 0) {
            for (const t of allTables) {
                const tTitle = (t.title || "").toLowerCase();
                if (tTitle.includes("estoque")) {
                    const isInativo = tTitle.includes("inativo");
                    targetTables.push({ table: t, status: isInativo ? "inativo" : "ativo" });
                }
            }
        }

        if (targetTables.length === 0) {
            return { 
                success: false, 
                error: `Nenhuma tabela de estoque encontrada para '${tablePrefixOrNames || baseIdentifier}'. Tabelas disponíveis: ${allTables.map((t: any) => t.title).join(", ")}` 
            };
        }

        // 4. Buscar registros das tabelas encontradas (ativo e inativo mesclados)
        let mergedVehicles: any[] = [];

        for (const { table, status } of targetTables) {
            try {
                const recRes = await fetch(`${nocoHost}/api/v2/tables/${table.id}/records?limit=250`, { headers });
                if (!recRes.ok) {
                    console.error(`Erro ao buscar registros da tabela ${table.title} (${table.id}):`, recRes.statusText);
                    continue;
                }
                const recData = await recRes.json();
                const rows: any[] = recData.list || [];

                for (const r of rows) {
                    const externalKey = String(r.chave_externa || r.Id || r.id || crypto.randomUUID());
                    const markName = (r.marca || "N/A").trim();
                    const modelName = (r.modelo || "N/A").trim();
                    const versionName = (r.versao || "").trim();
                    const year = r.ano ? String(r.ano) : "";
                    
                    let km = 0;
                    if (r.quilometragem !== undefined && r.quilometragem !== null) {
                        km = parseInt(String(r.quilometragem).replace(/\D/g, "")) || 0;
                    }

                    let saleValue = 0;
                    if (r.valor_venda) {
                        saleValue = parseFloat(String(r.valor_venda).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
                    }

                    const color = (r.cor || "N/A").trim();
                    const transmissionName = (r.cambio || "N/A").trim();
                    const fuelName = (r.combustivel || "N/A").trim();
                    const plate = (r.placa || "").trim();
                    const subCategoryName = (r.tipo || r.subcategoria || "N/A").trim();

                    // Parse fotos
                    let pictures: { Link: string; Principal: string }[] = [];
                    const rawFotos = r.fotos?.fotos || r.fotos;
                    if (Array.isArray(rawFotos)) {
                        pictures = rawFotos.map((picUrl: any, idx: number) => ({
                            Link: typeof picUrl === "string" ? picUrl : (picUrl.url || picUrl.signedUrl || ""),
                            Principal: idx === 0 ? "true" : "false"
                        })).filter(p => !!p.Link);
                    } else if (typeof rawFotos === "string" && rawFotos.startsWith("http")) {
                        pictures = [{ Link: rawFotos, Principal: "true" }];
                    }

                    // Parse opcionais
                    let optionals: string[] = [];
                    const rawOpc = r.opcionais?.fotos || r.opcionais;
                    if (Array.isArray(rawOpc)) {
                        optionals = rawOpc.map((o: any) => typeof o === "string" ? o : (o.nome || ""));
                    } else if (typeof rawOpc === "string") {
                        optionals = [rawOpc];
                    }

                    const description = optionals.join(" • ");

                    mergedVehicles.push({
                        vehicleExternalKey: externalKey,
                        markName,
                        modelName,
                        versionName,
                        year,
                        km,
                        saleValue,
                        color,
                        transmissionName,
                        fuelName,
                        plate,
                        subCategoryName,
                        description,
                        itemJs: JSON.stringify(optionals),
                        pictureJs: JSON.stringify(pictures),
                        _estoqueStatus: status, // "ativo" ou "inativo"
                        _tabelaNome: table.title
                    });
                }
            } catch (tblErr) {
                console.error(`Erro ao carregar tabela ${table.title}:`, tblErr);
            }
        }

        return { success: true, data: mergedVehicles };
    } catch (e: any) {
        console.error("fetchNocoDbInventoryAction error:", e);
        return { success: false, error: e.message || "Erro desconhecido ao carregar estoque do NocoDB." };
    }
}


export async function fetchWebMotorsInventoryAction(clientId: string) {
    try {
        const { data: client, error } = await supabase
            .from("clientes")
            .select("integracao_tipo, revenda_mais_url, boom_url")
            .eq("id", clientId)
            .single();

        if (error) throw error;

        if (client.integracao_tipo !== "WEBMOTORS") {
            return { success: false, error: "Cliente não possui integração WebMotors configurada." };
        }

        // URL do Webhook do n8n (pode ser personalizada no cliente em revenda_mais_url ou usar o default)
        const webhookUrl = (client.revenda_mais_url && client.revenda_mais_url.trim().startsWith("http"))
            ? client.revenda_mais_url.trim()
            : "https://n8n-webhook.vpsdesignonline.com.br/webhook/estoque-api-webmotors";

        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                clienteId: clientId,
                webmotorsUrl: client.boom_url || null
            })
        });

        if (!res.ok) {
            throw new Error(`Falha na requisição ao n8n WebMotors (${res.status}): ${res.statusText}`);
        }

        const rawData = await res.json();
        const list: any[] = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.items || []);

        const vehicles = list.map((item: any) => {
            const externalKey = String(item.id || item.UniqueId || crypto.randomUUID());
            const markName = (item.marca || item.Make || "N/A").trim();
            const modelName = (item.modelo || item.Model || item.titulo || "N/A").trim();
            const versionName = (item.versao || item.titulo || "").trim();
            const year = item.ano ? String(item.ano) : (item.ano_modelo ? String(item.ano_modelo) : "");
            
            const km = typeof item.km === "number" ? item.km : (parseInt(String(item.km || "0").replace(/\D/g, "")) || 0);
            const saleValue = typeof item.preco === "number" ? item.preco : (parseFloat(String(item.preco || "0").replace(/[^0-9.]/g, "")) || 0);
            
            const color = (item.cor || "N/A").trim();
            const transmissionName = (item.cambio || "N/A").trim();
            const fuelName = (item.combustivel || "N/A").trim();
            const plate = (item.placa || "").trim();
            const subCategoryName = (item.estilo || item.tipo || "Moto").trim();

            // Mapear Fotos
            let pictures: { Link: string; Principal: string }[] = [];
            const rawFotos = item.fotos || (item.foto_principal ? [item.foto_principal] : []);
            if (Array.isArray(rawFotos)) {
                pictures = rawFotos.map((picUrl: any, idx: number) => ({
                    Link: typeof picUrl === "string" ? picUrl : (picUrl.url || ""),
                    Principal: idx === 0 ? "true" : "false"
                })).filter(p => !!p.Link);
            }

            // Opcionais / Atributos
            let optionals: string[] = [];
            if (Array.isArray(item.atributos)) {
                optionals = item.atributos.map((a: any) => String(a).trim());
            }
            if (item.cilindrada) optionals.unshift(`${item.cilindrada}cc`);
            if (item.motor) optionals.push(`Motor ${item.motor}`);
            if (item.freios) optionals.push(`Freios ${item.freios}`);
            if (item.refrigeracao) optionals.push(`Refrigeração ${item.refrigeracao}`);

            const description = item.descricao || optionals.join(" • ");

            return {
                vehicleExternalKey: externalKey,
                markName,
                modelName,
                versionName,
                year,
                km,
                saleValue,
                color,
                transmissionName,
                fuelName,
                plate,
                subCategoryName,
                description,
                itemJs: JSON.stringify(optionals),
                pictureJs: JSON.stringify(pictures),
                urlAnuncio: item.url_anuncio || null,
                _estoqueStatus: "ativo"
            };
        });

        return { success: true, data: vehicles };
    } catch (e: any) {
        console.error("fetchWebMotorsInventoryAction error:", e);
        return { success: false, error: e.message || "Erro desconhecido ao carregar estoque da WebMotors." };
    }
}

export async function importEstoqueVehiclesAction(params: {
    clienteId: string;
    items: Array<{
        vehicle: any;
        textFields?: Record<string, string>;
        observacoesGOS?: string;
        contemVideo?: boolean;
    }>;
}) {
    try {
        const { clienteId, items } = params;
        if (!items || items.length === 0) return { success: false, error: "Nenhum veículo selecionado para importação." };

        const { data: client, error: cErr } = await supabase
            .from("clientes")
            .select("id, name, columns, clickup_tarefa_id")
            .eq("id", clienteId)
            .single();

        if (cErr || !client) return { success: false, error: "Cliente não encontrado." };
        if (!client.clickup_tarefa_id) {
            return { success: false, error: "Cliente não possui tarefa vinculada no ClickUp (Aba Serviços)." };
        }

        const { createClickupTaskAction } = await import("@/app/actions/clickup");
        const results: any[] = [];

        for (const item of items) {
            const v = item.vehicle;
            const pics = (() => {
                if (!v.pictureJs) return [];
                try {
                    const p = JSON.parse(v.pictureJs);
                    return Array.isArray(p) ? p.map((x: any) => typeof x === "string" ? x : x.Link).filter(Boolean) : [];
                } catch (e) {
                    return [];
                }
            })();

            // Build dados based on client columns or intelligent mapping
            const dados: Record<string, string> = {};
            const clientColumns: any[] = client.columns || [];

            // Helper to find column match
            const findCol = (keywords: string[]) => {
                return clientColumns.find((c: any) =>
                    keywords.some(kw => c.name.toLowerCase() === kw.toLowerCase() || c.name.toLowerCase().startsWith(kw.toLowerCase()))
                );
            };

            const colNome = findCol(["nome", "veiculo", "veículo", "carro", "titulo", "modelo"]);
            const colMarca = findCol(["marca", "fabricante"]);
            const colCor = findCol(["cor"]);
            const colAno = findCol(["ano"]);
            const colPreco = findCol(["pre", "valor"]);
            const colKm = findCol(["km", "quilo"]);
            const colCambio = findCol(["cambio", "câmbio"]);
            const colCombustivel = findCol(["combustivel", "combustível"]);
            const colPlaca = findCol(["placa"]);

            // Preenche dados padrão das colunas
            clientColumns.forEach((col: any) => {
                if (col.type === "text" || col.type === "checkbox") {
                    if (col.name.toLowerCase() !== "formato") {
                        dados[col.name] = item.textFields?.[col.id] || "";
                    }
                }
            });

            // Marca
            if (colMarca && !dados[colMarca.name] && v.markName && v.markName !== "N/A") {
                dados[colMarca.name] = v.markName;
            }

            // Nome do veículo
            const rawNome = (v.markName && v.markName !== "N/A" ? `${v.markName} ` : "") + (v.modelName || v.versionName || "Veículo");
            const nomeFinal = (colNome && dados[colNome.name]) ? dados[colNome.name] : rawNome.trim();
            if (colNome && !dados[colNome.name]) dados[colNome.name] = nomeFinal;

            // Cor
            const corFinal = (colCor && dados[colCor.name]) ? dados[colCor.name] : (v.color && v.color !== "N/A" ? v.color : "");
            if (colCor && !dados[colCor.name]) dados[colCor.name] = corFinal;

            // Ano
            const anoFinal = (colAno && dados[colAno.name]) ? dados[colAno.name] : (v.year ? String(v.year) : "");
            if (colAno && !dados[colAno.name]) dados[colAno.name] = anoFinal;

            // Preço
            const precoFormatado = v.saleValue
                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v.saleValue)
                : "";
            const precoFinal = (colPreco && dados[colPreco.name]) ? dados[colPreco.name] : (item.textFields?.["_extraValor"] || precoFormatado);
            if (colPreco && !dados[colPreco.name]) dados[colPreco.name] = precoFinal;

            // KM
            if (colKm && !dados[colKm.name] && v.km) {
                dados[colKm.name] = `${v.km.toLocaleString("pt-BR")} km`;
            }

            // Câmbio
            if (colCambio && !dados[colCambio.name] && v.transmissionName && v.transmissionName !== "N/A") {
                dados[colCambio.name] = v.transmissionName;
            }

            // Combustível
            if (colCombustivel && !dados[colCombustivel.name] && v.fuelName && v.fuelName !== "N/A") {
                dados[colCombustivel.name] = v.fuelName;
            }

            // Placa
            if (colPlaca && !dados[colPlaca.name] && v.plate && v.plate !== "N/A") {
                dados[colPlaca.name] = v.plate;
            }

            // Guarda chave externa do estoque dentro de dados para identificar reimportação
            if (v.vehicleExternalKey) {
                dados["_externalKey"] = String(v.vehicleExternalKey);
            }

            // Criação no ClickUp
            const clickupRes = await createClickupTaskAction({
                nomeVeiculo: nomeFinal,
                cor: corFinal,
                ano: anoFinal,
                precoFormatado: precoFinal,
                clienteClickupId: client.clickup_tarefa_id,
                observacoesGOS: item.observacoesGOS || "",
                contemVideo: !!item.contemVideo
            });

            if (!clickupRes.success) {
                throw new Error("Erro ClickUp: " + clickupRes.error);
            }

            const taskId = clickupRes.data?.taskId;

            // Salva no banco de dados Supabase na tabela VeiculoOperador
            const { data: inserted, error: sbError } = await supabase.from("VeiculoOperador").insert([{
                clienteId: client.id,
                dados: dados,
                fotos: pics,
                clickupTaskId: taskId,
                importado: false
            }]).select().single();

            if (sbError) throw sbError;

            results.push({
                vehicleExternalKey: v.vehicleExternalKey,
                clickupTaskId: taskId,
                veiculoId: inserted.id
            });
        }

        return { success: true, data: results };
    } catch (e: any) {
        console.error("importEstoqueVehiclesAction error:", e);
        return { success: false, error: e.message || "Erro ao importar veículos do estoque." };
    }
}


export async function linkEstoqueVehicleToClickupAction(params: {
    clienteId: string;
    vehicle: any;
    clickupTaskId: string;
}) {
    try {
        const { clienteId, vehicle, clickupTaskId } = params;
        if (!clienteId || !vehicle || !clickupTaskId) {
            return { success: false, error: "Dados incompletos para vincular." };
        }

        // Clean taskId: remove # or URL components if pasted as URL
        let cleanTaskId = clickupTaskId.trim();
        if (cleanTaskId.startsWith("#")) cleanTaskId = cleanTaskId.substring(1);
        if (cleanTaskId.includes("/t/")) {
            const parts = cleanTaskId.split("/t/");
            cleanTaskId = parts[parts.length - 1].split("/")[0].split("?")[0];
        }

        const vKey = String(vehicle.vehicleExternalKey || "");
        if (!vKey) return { success: false, error: "Chave externa do veículo não encontrada." };

        const { data: existingList } = await supabase
            .from("VeiculoOperador")
            .select("id, dados, clickupTaskId")
            .eq("clienteId", clienteId);

        const existing = existingList?.find((op: any) => {
            const d = op.dados || {};
            return d._externalKey && String(d._externalKey) === vKey;
        });

        const pics = (() => {
            if (!vehicle.pictureJs) return [];
            try {
                const p = JSON.parse(vehicle.pictureJs);
                return Array.isArray(p) ? p.map((x: any) => typeof x === "string" ? x : x.Link).filter(Boolean) : [];
            } catch (e) {
                return [];
            }
        })();

        if (existing) {
            const { error: upErr } = await supabase
                .from("VeiculoOperador")
                .update({ 
                    clickupTaskId: cleanTaskId,
                    fotos: (existing as any).fotos?.length ? (existing as any).fotos : pics
                })
                .eq("id", existing.id);

            if (upErr) throw upErr;
        } else {
            const { data: client } = await supabase
                .from("clientes")
                .select("id, columns")
                .eq("id", clienteId)
                .single();

            const dados: Record<string, string> = {
                _externalKey: vKey
            };

            const clientColumns: any[] = client?.columns || [];
            const findCol = (keywords: string[]) => {
                return clientColumns.find((c: any) =>
                    keywords.some(kw => c.name.toLowerCase() === kw.toLowerCase() || c.name.toLowerCase().startsWith(kw.toLowerCase()))
                );
            };

            const colNome = findCol(["nome", "veiculo", "veículo", "carro", "titulo", "modelo"]);
            const colMarca = findCol(["marca", "fabricante"]);
            const colAno = findCol(["ano"]);
            const colPreco = findCol(["pre", "valor"]);
            const colKm = findCol(["km", "quilo"]);
            const colCor = findCol(["cor"]);
            const colPlaca = findCol(["placa"]);

            if (colMarca && vehicle.markName && vehicle.markName !== "N/A") dados[colMarca.name] = vehicle.markName;
            const rawNome = (vehicle.markName && vehicle.markName !== "N/A" ? `${vehicle.markName} ` : "") + (vehicle.modelName || vehicle.versionName || "Veículo");
            if (colNome) dados[colNome.name] = rawNome.trim();
            if (colAno && vehicle.year) dados[colAno.name] = String(vehicle.year);
            if (colCor && vehicle.color && vehicle.color !== "N/A") dados[colCor.name] = vehicle.color;
            if (colPreco && vehicle.saleValue) {
                dados[colPreco.name] = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(vehicle.saleValue);
            }
            if (colKm && vehicle.km) dados[colKm.name] = `${vehicle.km.toLocaleString("pt-BR")} km`;
            if (colPlaca && vehicle.plate && vehicle.plate !== "N/A") dados[colPlaca.name] = vehicle.plate;

            const { error: insErr } = await supabase
                .from("VeiculoOperador")
                .insert([{
                    clienteId: clienteId,
                    dados: dados,
                    fotos: pics,
                    clickupTaskId: cleanTaskId,
                    importado: false
                }]);

            if (insErr) throw insErr;
        }

        // Busca status atualizado no ClickUp
        let taskStatus = "Vinculado";
        let taskColor = "#6366f1";
        try {
            const { getClickupTaskAction } = await import("@/app/actions/clickup");
            const ckRes = await getClickupTaskAction(cleanTaskId);
            if (ckRes.success && ckRes.data?.status) {
                taskStatus = ckRes.data.status.status || "Vinculado";
                taskColor = ckRes.data.status.color || "#6366f1";
            }
        } catch (e) {}

        return {
            success: true,
            data: {
                taskId: cleanTaskId,
                status: taskStatus,
                statusColor: taskColor
            }
        };
    } catch (e: any) {
        console.error("linkEstoqueVehicleToClickupAction error:", e);
        return { success: false, error: e.message || "Erro ao vincular tarefa do ClickUp." };
    }
}

export async function unlinkEstoqueVehicleAction(params: {
    clienteId: string;
    vehicleExternalKey: string;
}) {
    try {
        const { clienteId, vehicleExternalKey } = params;
        const vKey = String(vehicleExternalKey || "");
        if (!vKey || !clienteId) return { success: false, error: "Dados incompletos." };

        const { data: existingList } = await supabase
            .from("VeiculoOperador")
            .select("id, dados")
            .eq("clienteId", clienteId);

        const match = existingList?.find((op: any) => {
            const d = op.dados || {};
            return d._externalKey && String(d._externalKey) === vKey;
        });

        if (match) {
            const { error } = await supabase
                .from("VeiculoOperador")
                .delete()
                .eq("id", match.id);

            if (error) throw error;
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao desvincular veículo." };
    }
}
