with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# delete lines 123 to 125
del lines[122:125]

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed syntax")
