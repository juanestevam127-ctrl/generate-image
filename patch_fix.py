with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'const [boomCustomerKey,\n            boomUrl, setBoomCustomerKey] = useState("");',
    'const [boomCustomerKey, setBoomCustomerKey] = useState("");'
)

with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed ClientManager")
