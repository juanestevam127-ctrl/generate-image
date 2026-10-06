with open("src/app/actions.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'integracao_tipo, bndv_external_key, bndv_password, bndv_customer_key',
    'integracao_tipo, bndv_external_key, bndv_password, bndv_customer_key, boom_token, boom_customer_key'
)

c = c.replace(
    'bndvCustomerKey: dbClient.bndv_customer_key,',
    'bndvCustomerKey: dbClient.bndv_customer_key,\n        boomToken: dbClient.boom_token,\n        boomCustomerKey: dbClient.boom_customer_key,'
)

with open("src/app/actions.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated actions.ts")
