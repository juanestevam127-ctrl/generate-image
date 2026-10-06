const fs = require('fs');

let c = fs.readFileSync('src/app/actions/estoque.ts', 'utf-8');

const boomAction = `
export async function fetchBoomInventoryAction(clientId: string) {
    try {
        const supabase = createClient();
        
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

        console.log(\`Buscando Boom API para \${customerKey}...\`);
        const res = await fetch(\`https://boomsistemas.com.br/api/integration-api/xml/\${customerKey}\`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${token}\`
            }
        });

        if (!res.ok) {
            return { success: false, error: \`Falha Boom API: HTTP \${res.status}\` };
        }

        const data = await res.json();
        const xmlString = data[0]?.data || "";

        if (!xmlString) {
            return { success: false, error: "Falha Boom API: Nenhum dado XML retornado." };
        }

        // Regex parser para extrair <veiculo>...</veiculo>
        const veiculosRegex = /<veiculo>(.*?)<\\/veiculo>/gs;
        let match;
        const vehicles = [];

        const extractTag = (xml, tag) => {
            const regex = new RegExp(\`<\${tag}>(.*?)<\\\\/\${tag}>\`, 's');
            const match = xml.match(regex);
            return match ? match[1].trim() : null;
        };

        while ((match = veiculosRegex.exec(xmlString)) !== null) {
            const vXml = match[1];

            // Fotos
            const galeriaMatch = vXml.match(/<galeria>(.*?)<\\/galeria>/s);
            const pictures = [];
            if (galeriaMatch) {
                const itemRegex = /<item>(.*?)<\\/item>/g;
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
                finalPlate: extractTag(vXml, 'placa') ? extractTag(vXml, 'placa').slice(-1) : ""
            });
        }

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchBoomInventoryAction:", error);
        return { success: false, error: "Erro interno: " + error.message };
    }
}
`;

c = c + '\n' + boomAction;

fs.writeFileSync('src/app/actions/estoque.ts', c, 'utf-8');
console.log("Updated estoque.ts");
