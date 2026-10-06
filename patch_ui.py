with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

ui_snippet = """                            {integracaoTipo === "LOJA_CONECTADA" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Loja Conectada</h4>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Token de Autorização</label>
                                        <Input
                                            value={lojaConectadaToken}
                                            onChange={(e) => setLojaConectadaToken(e.target.value)}
                                            placeholder="Token da Loja Conectada"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                            )}"""

c = c.replace('                            {integracaoTipo === "BOOM" && (', ui_snippet + '\n\n                            {integracaoTipo === "BOOM" && (')

with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
