const fs = require('fs');

let c = fs.readFileSync('src/components/features/EstoqueManager.tsx', 'utf-8');

const target1 = `const integratedClients = clients.filter(c => c.integracaoTipo && c.integracaoTipo !== "none");`;
const replacement1 = `const integratedClients = clients
        .filter(c => c.integracaoTipo && c.integracaoTipo !== "none")
        .sort((a, b) => a.name.localeCompare(b.name));`;
c = c.replace(target1, replacement1);

const target2 = `        if (client?.integracaoTipo === "BNDV") {
            const result = await fetchBndvInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
            } else {
                setError(result.error || "Erro ao sincronizar estoque.");
            }
        } else {
            setError("Integração não suportada ainda.");
        }`;

const replacement2 = `        if (client?.integracaoTipo === "BNDV") {
            const result = await fetchBndvInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
            } else {
                setError(result.error || "Erro ao sincronizar estoque.");
            }
        } else if (client?.integracaoTipo === "BOOM") {
            const result = await fetchBoomInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
            } else {
                setError(result.error || "Erro ao sincronizar estoque.");
            }
        } else {
            setError("Integração não suportada ainda.");
        }`;

c = c.replace(target2, replacement2);

// Check if replacement worked
if (!c.includes('fetchBoomInventoryAction(selectedClientId)')) {
    // If it failed, maybe indentation is different. We can use regex.
    c = c.replace(/if \(client\?\.integracaoTipo === "BNDV"\) \{[\s\S]*?\} else \{/g, 
`if (client?.integracaoTipo === "BNDV") {
            const result = await fetchBndvInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
            } else {
                setError(result.error || "Erro ao sincronizar estoque.");
            }
        } else if (client?.integracaoTipo === "BOOM") {
            const result = await fetchBoomInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
            } else {
                setError(result.error || "Erro ao sincronizar estoque.");
            }
        } else {`);
}

fs.writeFileSync('src/components/features/EstoqueManager.tsx', c, 'utf-8');
console.log("Fixed EstoqueManager integration and sorting");
