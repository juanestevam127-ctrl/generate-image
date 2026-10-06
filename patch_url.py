import re

# 1. store-context.tsx
with open("src/lib/store-context.tsx", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    'boomCustomerKey?: string;',
    'boomCustomerKey?: string;\n    boomUrl?: string;'
)
with open("src/lib/store-context.tsx", "w", encoding="utf-8") as f:
    f.write(c)

# 2. actions.ts
with open("src/app/actions.ts", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    'boom_token, boom_customer_key',
    'boom_token, boom_customer_key, boom_url'
)
c = c.replace(
    'boomCustomerKey: dbClient.boom_customer_key,',
    'boomCustomerKey: dbClient.boom_customer_key,\n        boomUrl: dbClient.boom_url,'
)
with open("src/app/actions.ts", "w", encoding="utf-8") as f:
    f.write(c)

# 3. clients.ts
with open("src/app/actions/clients.ts", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    'boom_customer_key: clientData.boomCustomerKey,',
    'boom_customer_key: clientData.boomCustomerKey,\n        boom_url: clientData.boomUrl,'
)
with open("src/app/actions/clients.ts", "w", encoding="utf-8") as f:
    f.write(c)

# 4. ClientManager.tsx
with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    'const [boomCustomerKey, setBoomCustomerKey] = useState("");',
    'const [boomCustomerKey, setBoomCustomerKey] = useState("");\n    const [boomUrl, setBoomUrl] = useState("");'
)
c = c.replace(
    'setBoomCustomerKey("");',
    'setBoomCustomerKey("");\n        setBoomUrl("");'
)
c = c.replace(
    'setBoomCustomerKey(client.boomCustomerKey || "");',
    'setBoomCustomerKey(client.boomCustomerKey || "");\n        setBoomUrl(client.boomUrl || "");'
)
c = c.replace(
    'boomCustomerKey,',
    'boomCustomerKey,\n            boomUrl,'
)
boom_ui = """
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">URL da API</label>
                                        <Input
                                            value={boomUrl}
                                            onChange={(e) => setBoomUrl(e.target.value)}
                                            placeholder="Ex: https://boomsistemas.com.br/api/integration-api/xml/MotosPrime-..."
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>"""
c = c.replace(
    '<h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Boom Sistemas</h4>\n                                    </div>',
    '<h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Boom Sistemas</h4>\n                                    </div>' + boom_ui
)
with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)

# 5. estoque.ts
with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    "const customerKey = client.boom_customer_key;",
    "const customerKey = client.boom_customer_key;\n        const boomUrl = client.boom_url;"
)
c = c.replace(
    "const res = await fetch(`https://boomsistemas.com.br/api/integration-api/xml/${customerKey}`",
    "const fetchUrl = boomUrl || `https://boomsistemas.com.br/api/integration-api/xml/${customerKey}`;\n        const res = await fetch(fetchUrl"
)
with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)

print("Added Boom URL field to all layers")
