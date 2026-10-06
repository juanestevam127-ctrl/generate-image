import re

with open("src/lib/store-context.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Add to Client interface
c = c.replace(
    'bndvCustomerKey?: string;',
    'bndvCustomerKey?: string;\n    boomToken?: string;\n    boomCustomerKey?: string;'
)

with open("src/lib/store-context.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated store-context.tsx")
