with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('<option value="BOOM">Boom Sistemas</option>', '<option value="BOOM">Boom Sistemas</option>\n                                    <option value="LOJA_CONECTADA">Loja Conectada</option>')

with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
