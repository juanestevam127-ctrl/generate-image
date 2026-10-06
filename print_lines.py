with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines[100:150]):
    print(f"{i+101}: {line}", end='')
