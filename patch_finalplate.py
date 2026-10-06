with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

target = "finalPlate: extractTag(vXml, 'placa') ? extractTag(vXml, 'placa').slice(-1) : \"\""
replacement = "finalPlate: extractTag(vXml, 'placa')?.slice(-1) || \"\""

c = c.replace(target, replacement)
with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed finalPlate TS error")
