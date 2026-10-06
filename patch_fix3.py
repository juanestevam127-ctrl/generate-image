with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Replace all unicode bullet/question mark mess
c = c.replace("•", "?")
c = c.replace("", "?")

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Replaced all with ?")
