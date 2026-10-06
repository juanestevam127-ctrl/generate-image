import re

with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

correctHandleSync = """    const handleSync = async () => {
        if (!selectedClientId) return;
        setIsLoading(true);
        setError(null);
        setVehicles([]);

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
    };"""

pattern = re.compile(r'    const handleSync = async \(\) => \{.*?\setIsLoading\(false\);\n    \};', re.DOTALL)
c = pattern.sub(correctHandleSync, c)

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Replaced handleSync properly")
