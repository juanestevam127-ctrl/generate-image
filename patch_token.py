with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

target = """        const loginData = await loginRes.json();
        const token = loginData[0]?.token;

        if (!token) {"""

replacement = """        const loginData = await loginRes.json();
        console.log("BNDV Login Response:", JSON.stringify(loginData));
        const token = Array.isArray(loginData) ? loginData[0]?.token : loginData?.token;

        if (!token) {"""

c = c.replace(target, replacement)
with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated estoque.ts token logic")
