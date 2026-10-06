import re

with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

start_str = "export async function fetchBoomInventoryAction"
start_idx = c.find(start_str)

new_func = """export async function fetchBoomInventoryAction(clientId: string) {
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
            const regex = new RegExp('<' + tag + '>([\\\\s\\\\S]*?)<\\\\/' + tag + '>', 'i');
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
"""

c = c[:start_idx] + new_func

with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)

print("Replaced fetchBoomInventoryAction with JSON support")
