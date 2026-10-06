with open("src/components/features/PostScheduler.tsx", "r", encoding="utf-8") as f:
    c = f.read()
import re
for match in re.finditer(r'.{0,30}fetch\(.{0,50}', c):
    print(match.group(0))
