with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("?", "•")
c = c.replace("Cmbio", "Câmbio")
c = c.replace("Combustvel", "Combustível")
c = c.replace("Descrio", "Descrição")
c = c.replace("disponvel", "disponível")
c = c.replace("veculo", "veículo")
c = c.replace("Aes e Info Bsica", "Ações e Info Básica")
c = c.replace("Mais detalhes tcnicos", "Mais detalhes técnicos")
c = c.replace("Modal de Detalhes do Veculo", "Modal de Detalhes do Veículo")
c = c.replace("pequeno intervalo para no travar o navegador", "pequeno intervalo para não travar o navegador")
c = c.replace("•", " • ")
c = c.replace("  •  ", " • ") # fix double spaces

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed encoding issues")
