with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

loja_conectada_function = """

export async function fetchLojaConectadaInventoryAction(clientId: string) {
    try {
        const { data: client, error: clientError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return { success: false, error: "Cliente n\\u00e3o encontrado." };
        }

        if (client.integracao_tipo !== 'LOJA_CONECTADA' || !client.loja_conectada_token) {
            return { success: false, error: "Token da Loja Conectada n\\u00e3o configurado para este cliente." };
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
            const pics = Array.isArray(v.photos) ? v.photos.map((p: any) => p.photo) : [];
            const optionals = Array.isArray(v.optionals) ? v.optionals.map((o: any) => o.name).join(', ') : "";

            return {
                id: v.ad_id?.toString() || crypto.randomUUID(),
                modelo: v.model?.name || "N/A",
                marca: v.manufacturer?.name || "N/A",
                versao: v.version?.name || v.version_site || "N/A",
                ano_fabricacao: v.make_year?.toString() || "",
                ano_modelo: v.model_year?.toString() || "",
                cor: v.color?.name || "N/A",
                valor: v.price?.toString() || "0",
                quilometragem: v.km?.toString() || "0",
                placa: v.license_plate || "N/A",
                combustivel: v.fuel?.name || "N/A",
                cambio: v.transmission?.name || "N/A",
                portas: v.doors?.toString() || "0",
                observacoes: v.description || "",
                opcionais: optionals,
                fotos: pics,
            };
        });

        return { success: true, data: vehicles };
    } catch (error: any) {
        console.error("Erro em fetchLojaConectadaInventoryAction:", error);
        return { success: false, error: "Erro interno: " + error.message };
    }
}
"""

c = c + loja_conectada_function

with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
