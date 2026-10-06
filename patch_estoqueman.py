with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

import re
c = c.replace('import { fetchBndvInventoryAction, fetchBoomInventoryAction } from "@/app/actions/estoque";', 'import { fetchBndvInventoryAction, fetchBoomInventoryAction, fetchLojaConectadaInventoryAction } from "@/app/actions/estoque";')

sync_logic = """        } else if (client?.integracaoTipo === "LOJA_CONECTADA") {
            const result = await fetchLojaConectadaInventoryAction(selectedClientId);
            if (result.success && result.data) {
                setVehicles(result.data);
                toast.success("Estoque Loja Conectada sincronizado com sucesso!");
            } else {
                setError(result.error || "Erro ao sincronizar estoque da Loja Conectada.");
            }"""

c = c.replace('        } else {\n            setError("Integra\u00e7\u00e3o n\u00e3o suportada ainda.");\n        }', sync_logic + '\n        } else {\n            setError("Integra\u00e7\u00e3o n\u00e3o suportada ainda.");\n        }')

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
