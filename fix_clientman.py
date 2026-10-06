with open("src/components/features/ClientManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('const [boomUrl,\n            lojaConectadaToken, setBoomUrl] = useState("");', 'const [boomUrl, setBoomUrl] = useState("");')

with open("src/components/features/ClientManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
