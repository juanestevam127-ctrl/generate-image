const fs = require('fs');

// 1. ClientManager.tsx - Remover Token e CustomerKey
let c = fs.readFileSync('src/components/features/ClientManager.tsx', 'utf-8');

c = c.replace(
`                                    <div>
                                        <label className="block text-sm font-medium mb-1">Customer Key</label>
                                        <Input
                                            value={boomCustomerKey}
                                            onChange={(e) => setBoomCustomerKey(e.target.value)}
                                            placeholder="Ex: MotosPrime-0WxGYEtQCDS4Iji"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Token</label>
                                        <Input
                                            value={boomToken}
                                            onChange={(e) => setBoomToken(e.target.value)}
                                            placeholder="Ex: eyJhbG..."
                                            className="bg-slate-900 border-slate-700 text-white"
                                            type="password"
                                        />
                                    </div>`,
''
);
fs.writeFileSync('src/components/features/ClientManager.tsx', c, 'utf-8');

// 2. estoque.ts - Remover Token e alterar requisição
let e = fs.readFileSync('src/app/actions/estoque.ts', 'utf-8');

e = e.replace(
`        if (client.integracao_tipo !== 'BOOM' || !client.boom_token || !client.boom_customer_key) {
            return { success: false, error: "Credenciais do Boom Sistemas não configuradas para este cliente." };
        }

        const token = client.boom_token;
        const customerKey = client.boom_customer_key;
        const boomUrl = client.boom_url;

        console.log(\`Buscando Boom API para \${customerKey}...\`);
        const fetchUrl = boomUrl || \`https://boomsistemas.com.br/api/integration-api/xml/\${customerKey}\`;
        const res = await fetch(fetchUrl, {
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
        }`,
`        if (client.integracao_tipo !== 'BOOM' || !client.boom_url) {
            return { success: false, error: "URL do Boom Sistemas não configurada para este cliente." };
        }

        const fetchUrl = client.boom_url;
        console.log(\`Buscando Boom API: \${fetchUrl}\`);
        
        const res = await fetch(fetchUrl, {
            method: 'GET'
        });

        if (!res.ok) {
            return { success: false, error: \`Falha Boom API: HTTP \${res.status}\` };
        }

        const textRes = await res.text();
        let xmlString = "";
        
        try {
            const parsed = JSON.parse(textRes);
            if (Array.isArray(parsed) && parsed[0]?.data) {
                xmlString = parsed[0].data;
            } else if (parsed.data) {
                xmlString = parsed.data;
            } else {
                xmlString = textRes;
            }
        } catch(err) {
            // Se falhar o parse de JSON, significa que a API retornou o XML cru (o que é o padrão esperado para endpoints /xml)
            xmlString = textRes;
        }

        if (!xmlString || !xmlString.includes('<veiculo>')) {
            return { success: false, error: "Falha Boom API: Nenhum dado XML retornado." };
        }`
);
fs.writeFileSync('src/app/actions/estoque.ts', e, 'utf-8');

console.log("Updated files!");
