with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

target = """        console.log("BNDV Login Response:", JSON.stringify(loginData));
        const token = Array.isArray(loginData) ? loginData[0]?.token : loginData?.token;

        if (!token) {
            return { success: false, error: "Token não recebido do BNDV." };
        }"""

replacement = """        console.log("BNDV Login Response:", JSON.stringify(loginData));
        const token = Array.isArray(loginData) ? loginData[0]?.token : loginData?.token;

        if (!token) {
            return { 
                success: false, 
                error: `Falha BNDV: Token não recebido. Resposta da API: ${JSON.stringify(loginData).substring(0, 150)}` 
            };
        }"""

c = c.replace(target, replacement)
with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated error message")
