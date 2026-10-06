with open("src/lib/store-context.tsx", "r", encoding="utf-8") as f:
    c = f.read()
import re
match = re.search(r'export interface Client \{[^}]+\}', c)
if match:
    print(match.group(0))
