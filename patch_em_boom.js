const fs = require('fs');

let c = fs.readFileSync('src/components/features/EstoqueManager.tsx', 'utf-8');

c = c.replace(
    'import { fetchBndvInventoryAction } from "@/app/actions/estoque";',
    'import { fetchBndvInventoryAction, fetchBoomInventoryAction } from "@/app/actions/estoque";'
);

const newLogic = `        if (client?.integracaoTipo === "BNDV") {
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
        } else {`;

c = c.replace(
    `        if (client?.integracaoTipo === "BNDV") {
            const result = await fetchBndvInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
            } else {
                setError(result.error || "Erro ao sincronizar estoque.");
            }
        } else {`,
    newLogic
);

fs.writeFileSync('src/components/features/EstoqueManager.tsx', c, 'utf-8');
console.log("Updated EstoqueManager logic");
