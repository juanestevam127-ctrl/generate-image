with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

target = "{typeof item === 'string' ? item : (item.Descricao || item.name || item.descricao || JSON.stringify(item))}"
replacement = "{typeof item === 'string' ? item : (item.value || item.Descricao || item.name || item.descricao || JSON.stringify(item))}"

c = c.replace(target, replacement)

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed item rendering to support item.value")
