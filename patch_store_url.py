with open("src/lib/store-context.tsx", "r", encoding="utf-8") as f:
    c = f.read()

target = "bndvCustomerKey: c.bndv_customer_key"
replacement = "bndvCustomerKey: c.bndv_customer_key,\n                    boomUrl: c.boom_url"
c = c.replace(target, replacement)

with open("src/lib/store-context.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated store-context.tsx formatting")
