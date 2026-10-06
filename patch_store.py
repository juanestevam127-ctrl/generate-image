with open("src/lib/store-context.tsx", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace("boomUrl?: string;", "boomUrl?: string;\n    lojaConectadaToken?: string;")
c = c.replace("boomUrl: c.boom_url", "boomUrl: c.boom_url,\n                    lojaConectadaToken: c.loja_conectada_token")
c = c.replace("bndvCustomerKey: result.data.bndv_customer_key", "bndvCustomerKey: result.data.bndv_customer_key,\n            lojaConectadaToken: result.data.loja_conectada_token")
with open("src/lib/store-context.tsx", "w", encoding="utf-8") as f:
    f.write(c)
