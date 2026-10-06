const fs = require('fs');
let c = fs.readFileSync('src/components/features/EstoqueManager.tsx', 'utf-8');

const correctHandleSync = `    const handleSync = async () => {
        if (!selectedClientId) return;
        setIsLoading(true);
        setError(null);
        setVehicles([]);

        // Aqui, futuramente podemos rotear para ações diferentes (BNDV, RevendaMais, etc) 
        // baseado no integracaoTipo do cliente selecionado.
        const client = integratedClients.find(c => c.id === selectedClientId);
        
        if (client?.integracaoTipo === "BNDV") {
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
        }
        
        setIsLoading(false);
    };`;

c = c.replace(/const handleSync = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n    \};/m, correctHandleSync);

fs.writeFileSync('src/components/features/EstoqueManager.tsx', c, 'utf-8');
console.log("Fixed handleSync block");
