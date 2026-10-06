import re

with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

target = """            integracaoTipo,
            bndvExternalKey,
            bndvPassword,
            bndvCustomerKey,"""

replacement = """            integracaoTipo,
            bndvExternalKey,
            bndvPassword,
            bndvCustomerKey,
            boomUrl,"""

c = c.replace(target, replacement)

with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Added boomUrl to handleSave payload")
