with open("src/components/features/VehicleCard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

import re
match = re.search(r'const handleDownloadImages.*?\}', c, re.DOTALL)
if match:
    print(match.group(0)[:1000])
else:
    print("Not found")
