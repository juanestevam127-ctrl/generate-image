with open("src/components/features/VehicleCard.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Baixar Fotos" in line or "download" in line.lower() or "zip" in line.lower():
        print(f"{i}: {line.strip()}")
