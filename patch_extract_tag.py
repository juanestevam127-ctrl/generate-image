import re

with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

target = "const regex = new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`);"
replacement = "const regex = new RegExp('<' + tag + '>([\\\\s\\\\S]*?)<\\\\/' + tag + '>', 'i');"

c = c.replace(target, replacement)

with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed extractTag regex")
