with open("src/app/actions/clients.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'bndv_customer_key: clientData.bndvCustomerKey,',
    'bndv_customer_key: clientData.bndvCustomerKey,\n        boom_token: clientData.boomToken,\n        boom_customer_key: clientData.boomCustomerKey,'
)

with open("src/app/actions/clients.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated clients.ts")
