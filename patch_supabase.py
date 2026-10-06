with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("const supabase = createClient();", "")

with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed supabase reference")
