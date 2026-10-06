with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('const [boomUrl, setBoomUrl] = useState("");', 'const [boomUrl, setBoomUrl] = useState("");\n    const [lojaConectadaToken, setLojaConectadaToken] = useState("");')
c = c.replace('setBoomUrl("");', 'setBoomUrl("");\n        setLojaConectadaToken("");')
c = c.replace('setBoomUrl(client.boomUrl || "");', 'setBoomUrl(client.boomUrl || "");\n        setLojaConectadaToken(client.lojaConectadaToken || "");')
c = c.replace('boomUrl,', 'boomUrl,\n            lojaConectadaToken,')

ui_snippet = """                                </TabsContent>

                                <TabsContent value="loja_conectada" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </TabsContent>
"""
c = c.replace('</TabsContent>\n                            </Tabs>', '</TabsContent>\n' + ui_snippet + '                            </Tabs>')
c = c.replace('<TabsTrigger value="boom">Boom</TabsTrigger>', '<TabsTrigger value="boom">Boom</TabsTrigger>\n                                        <TabsTrigger value="loja_conectada">Loja Conectada</TabsTrigger>')

with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
