import re

with open("src/components/features/VehicleCard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

target = """                const proxyUrl = getProxiedUrl(url);
                
                const res = await fetch(proxyUrl);"""

replacement = """                // Force proxy for downloading to bypass strict R2 CORS
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                
                const res = await fetch(proxyUrl);"""

c = c.replace(target, replacement)

with open("src/components/features/VehicleCard.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated VehicleCard.tsx downloads")
