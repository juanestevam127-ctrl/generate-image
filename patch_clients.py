with open("src/app/actions/clients.ts", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace("boomUrl?: string;", "boomUrl?: string;\n    lojaConectadaToken?: string;")
c = c.replace("bndv_customer_key: data.bndvCustomerKey", "bndv_customer_key: data.bndvCustomerKey,\n        loja_conectada_token: data.lojaConectadaToken")
c = c.replace("if (updates.bndvCustomerKey !== undefined) dbUpdates.bndv_customer_key = updates.bndvCustomerKey;", "if (updates.bndvCustomerKey !== undefined) dbUpdates.bndv_customer_key = updates.bndvCustomerKey;\n    if (updates.lojaConectadaToken !== undefined) dbUpdates.loja_conectada_token = updates.lojaConectadaToken;")
with open("src/app/actions/clients.ts", "w", encoding="utf-8") as f:
    f.write(c)
