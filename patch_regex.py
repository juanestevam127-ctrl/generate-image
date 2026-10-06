with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("/<veiculo>(.*?)<\/veiculo>/gs", "/<veiculo>([\s\S]*?)<\/veiculo>/g")
c = c.replace("new RegExp(`(?:<${tag}>)(.*?)(?:<\/${tag}>)`, 's')", "new RegExp(`(?:<${tag}>)([\\\\s\\\\S]*?)(?:<\\\\/${tag}>)`)")
c = c.replace("/<galeria>(.*?)<\/galeria>/s", "/<galeria>([\s\S]*?)<\/galeria>/")

with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed regexes to avoid /s flag")
