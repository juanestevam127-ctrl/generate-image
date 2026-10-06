with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("Array.isArray(parsed) • parsed : []", "Array.isArray(parsed) ? parsed : []")
c = c.replace("selectedVehicle.year} • {", "selectedVehicle.year} - {")
c = c.replace("toLocaleString('pt-BR')} km • {", "toLocaleString('pt-BR')} km - {")

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed syntax error")
