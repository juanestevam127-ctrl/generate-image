const fs = require('fs');
let c = fs.readFileSync('src/components/features/ClientManager.tsx', 'utf-8');

c = c.replace(
    'const [bndvCustomerKey, setBndvCustomerKey] = useState("");',
    'const [bndvCustomerKey, setBndvCustomerKey] = useState("");\n    const [boomToken, setBoomToken] = useState("");\n    const [boomCustomerKey, setBoomCustomerKey] = useState("");'
);

c = c.replace(
    'setBndvCustomerKey("");',
    'setBndvCustomerKey("");\n        setBoomToken("");\n        setBoomCustomerKey("");'
);

c = c.replace(
    'setBndvCustomerKey(client.bndvCustomerKey || "");',
    'setBndvCustomerKey(client.bndvCustomerKey || "");\n        setBoomToken(client.boomToken || "");\n        setBoomCustomerKey(client.boomCustomerKey || "");'
);

c = c.replace(
    'bndvCustomerKey,',
    'bndvCustomerKey,\n            boomToken,\n            boomCustomerKey,'
);

c = c.replace(
    '<option value="BNDV">BNDV</option>',
    '<option value="BNDV">BNDV</option>\n                                    <option value="BOOM">Boom Sistemas</option>'
);

const boomUI = `
                            {integracaoTipo === "BOOM" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Boom Sistemas</h4>
                                    </div>
                                    <div>
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
                                    </div>
                                </div>
                            )}`;

c = c.replace(
    '{integracaoTipo === "BNDV" && (',
    boomUI + '\n                            {integracaoTipo === "BNDV" && ('
);

fs.writeFileSync('src/components/features/ClientManager.tsx', c, 'utf-8');
console.log("Updated ClientManager.tsx");
