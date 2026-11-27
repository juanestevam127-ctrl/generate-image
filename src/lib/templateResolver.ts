/**
 * Resolve uma expressão/template de campo para o RenderForm
 * Suporta:
 * 1. Referência direta de ID de coluna: "col-id-123"
 * 2. Expressão com {{nome_da_coluna}} ou {{col_id}}: "• {{Opcional 1}} • {{Ano}} • {{Opcional 2}}"
 * 3. Modificadores úteis:
 *    - {{Valor|sem_cifrao}} ou {{Valor|clean}} -> remove "R$", "r$", "R $", e espaços
 *    - {{Valor|com_cifrao}} -> garante "R$ 10.000"
 *    - {{Campo|upper}} ou {{Campo|lower}}
 */
export function resolveFieldTemplate(
    templateStr: string,
    row: Record<string, any>,
    columns: Array<{ id: string; name: string }>
): any {
    if (!templateStr || typeof templateStr !== "string") return "";

    // 1. Se for referência direta a uma coluna (sem {{}}), retorna o valor direto
    const directCol = columns.find(c => c.id === templateStr || c.name === templateStr);
    if (directCol && !templateStr.includes("{{")) {
        return row[directCol.id] !== undefined ? row[directCol.id] : (row[directCol.name] !== undefined ? row[directCol.name] : "");
    }

    // 2. Se não contiver bigodes {{ }}, retorna a string pura
    if (!templateStr.includes("{{")) {
        return row[templateStr] !== undefined ? row[templateStr] : templateStr;
    }

    // Helper interno para obter e formatar o valor de uma coluna/variável
    const getResolvedValue = (expression: string) => {
        const parts = expression.split("|").map((p: string) => p.trim());
        const varName = parts[0];
        const filter = parts[1]?.toLowerCase();

        // Procura a coluna pelo nome ou pelo id
        const col = columns.find(
            c => c.name.toLowerCase() === varName.toLowerCase() || c.id === varName
        );

        let val = "";
        if (col) {
            val = row[col.id] !== undefined ? row[col.id] : (row[col.name] !== undefined ? row[col.name] : "");
        } else if (row[varName] !== undefined) {
            val = row[varName];
        }

        if (val === null || val === undefined) val = "";
        val = String(val);

        // Se for um campo de valor/preço na LEGENDA e não tiver filtro explícito de 'sem_cifrao',
        // o padrão natural esperado na legenda é sempre vir formatado com R$!
        const isValorField = varName.toLowerCase().includes("valor") || 
            varName.toLowerCase().includes("preco") || 
            varName.toLowerCase().includes("preço") ||
            (col && (col.name.toLowerCase().includes("valor") || col.name.toLowerCase().includes("preco") || col.name.toLowerCase().includes("preço")));

        if (!filter && isValorField && val.trim().length > 0) {
            // Garante R$ por padrão na legenda
            val = val.replace(/r\$\s*/gi, "").trim();
            if (val) val = `R$ ${val}`;
        }

        // Aplica filtros se houver
        if (filter === "sem_cifrao" || filter === "clean" || filter === "numero") {
            val = val.replace(/r\$\s*/gi, "").trim();
        } else if (filter === "com_cifrao" || filter === "com_r$" || filter === "moeda") {
            val = val.replace(/r\$\s*/gi, "").trim();
            if (val) val = `R$ ${val}`;
        } else if (filter === "lista" || filter?.startsWith("lista:")) {
            const bullet = parts[1]?.includes(":") ? parts[1].split(":")[1].trim() : "✅";
            const items = val
                .split(/[\n,;•|]+/)
                .map(item => item.trim())
                .filter(item => item.length > 0);
            
            if (items.length > 0) {
                val = items.map(item => `${bullet} ${item}`).join("\n");
            } else {
                val = "";
            }
        } else if (filter === "upper") {
            val = val.toUpperCase();
        } else if (filter === "lower") {
            val = val.toLowerCase();
        }

        return val;
    };

    // 3. Suporte a {{{Campo}}}: quando o usuário quer deliberadamente que o resultado saia entre chaves simples, ex: {fiesta}
    let result = templateStr.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}/g, (_, expression) => {
        const val = getResolvedValue(expression);
        return val ? `{${val}}` : "";
    });

    // 4. Interpolação padrão com tags duplas {{ nome_coluna | filtro }}
    result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
        return getResolvedValue(expression);
    });

    // 4. Limpeza inteligente de separadores vazios (ex: "• Completo • • Automático" ou "• • 2020")
    // Se o texto tiver múltiplas linhas (ex: uma legenda com quebras de linha \n), limpa linhas vazias com marcadores órfãos
    const isMultiLine = result.includes("\n");
    const isUrl = result.startsWith("http://") || result.startsWith("https://");

    if (!isUrl && !isMultiLine) {
        result = result
            .replace(/^[•\-\/,\s]+/, "") // Remove no início
            .replace(/[•\-\/,\s]+$/, "") // Remove no final
            .replace(/([•\-,])\s*([•\-,])/g, "$1") // Remove duplicatas "• •" (sem mexer em barra / para não quebrar caminhos)
            .replace(/\s{2,}/g, " ") // Reduz espaços duplos
            .trim();
    } else if (isMultiLine) {
        // Se for legenda multi-linha: remove linhas que continham apenas um marcador/emoji e a variável ficou vazia (ex: "✅ " ou "• ")
        result = result
            .split("\n")
            .filter(line => {
                const trimmed = line.trim();
                // Se a linha for apenas um marcador solitário como "✅", "•", "-", "🔹" sem conteúdo depois, descarta
                if (/^(✅|🔹|•|\-|\*|⚡)\s*$/.test(trimmed)) return false;
                return true;
            })
            .join("\n")
            .trim();
    } else {
        result = result.trim();
    }

    return result;
}
