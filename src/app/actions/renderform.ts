"use server";

const RENDERFORM_API_KEY = process.env.RENDERFORM_API_KEY || "key-pz3wDM2mOc6HWjUBM0dfq3KgNACB1TJeB4";
const RENDERFORM_BASE_URL = "https://api.renderform.io/api/v2";

export interface RenderFormTemplateSummary {
    identifier: string;
    name: string;
    preview: string;
    width: number;
    height: number;
    format: "feed" | "stories" | "other";
}

export interface RenderFormComponent {
    id: string; // ex: "nome_veiculo"
    name: string;
    type: "TEXT" | "IMAGE" | string;
    propertyKey: string; // ex: "nome_veiculo.text" ou "imagem_principal.src"
    defaultValue?: string;
}

export interface RenderFormTemplateDetails {
    identifier: string;
    name: string;
    preview: string;
    width: number;
    height: number;
    components: RenderFormComponent[];
}

/**
 * Busca a lista de templates do usuário no RenderForm (com paginação completa)
 */
export async function getRenderFormTemplatesAction(): Promise<{
    success: boolean;
    templates?: RenderFormTemplateSummary[];
    error?: string;
}> {
    try {
        let allTemplates: any[] = [];
        let page = 0;
        const pageSize = 100;

        // Itera sobre as páginas do RenderForm até coletar todos os templates
        while (true) {
            const res = await fetch(`${RENDERFORM_BASE_URL}/my-templates?page=${page}&size=${pageSize}`, {
                method: "GET",
                headers: {
                    "X-API-KEY": RENDERFORM_API_KEY,
                    "Content-Type": "application/json"
                },
                next: { revalidate: 30 } // cache 30s
            });

            if (!res.ok) {
                throw new Error(`Erro na API do RenderForm (${res.status}): ${res.statusText}`);
            }

            const data = await res.json();
            const list: any[] = Array.isArray(data) ? data : [];
            if (list.length === 0) break;

            allTemplates = allTemplates.concat(list);

            // Se veio menos do que o pageSize, chegamos ao final
            if (list.length < pageSize) break;
            page++;

            // Proteção contra loops infinitos
            if (page > 30) break;
        }

        const templates: RenderFormTemplateSummary[] = allTemplates
            .map((t) => {
                const w = t.width || 1080;
                const h = t.height || 1080;
                let format: "feed" | "stories" | "other" = "other";
                if (h > w * 1.3) format = "stories";
                else if (Math.abs(w - h) < 50 || (w === 1080 && h === 1080) || (w === 1080 && h === 1350)) format = "feed";

                return {
                    identifier: t.identifier,
                    name: t.name || t.identifier,
                    preview: t.preview || "",
                    width: w,
                    height: h,
                    format
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return { success: true, templates };
    } catch (e: any) {
        console.error("getRenderFormTemplatesAction error:", e);
        return { success: false, error: e.message || "Falha ao buscar templates do RenderForm." };
    }
}

/**
 * Busca os detalhes de um template específico com todos os seus componentes editáveis
 */
export async function getRenderFormTemplateDetailsAction(templateId: string): Promise<{
    success: boolean;
    template?: RenderFormTemplateDetails;
    error?: string;
}> {
    try {
        if (!templateId) return { success: false, error: "ID do template não informado." };

        const res = await fetch(`${RENDERFORM_BASE_URL}/my-templates/${templateId}`, {
            method: "GET",
            headers: {
                "X-API-KEY": RENDERFORM_API_KEY,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            throw new Error(`Falha ao obter template (${res.status}): ${res.statusText}`);
        }

        const data = await res.json();

        // Agrupar propriedades por componentId para extrair componentes únicos e editáveis
        const compMap = new Map<string, RenderFormComponent>();

        if (Array.isArray(data.properties)) {
            data.properties.forEach((p: any) => {
                const cId = p.componentId;
                const cType = p.componentType || "TEXT";

                // Consideramos componentes relevantes para preenchimento de carros
                if (!compMap.has(cId)) {
                    const isImage = cType === "IMAGE" || p.property === "src";
                    compMap.set(cId, {
                        id: cId,
                        name: cId.replace(/[-_]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
                        type: isImage ? "IMAGE" : "TEXT",
                        propertyKey: isImage ? `${cId}.src` : `${cId}.text`,
                        defaultValue: p.defaultValue || ""
                    });
                }
            });
        }

        const components = Array.from(compMap.values());

        return {
            success: true,
            template: {
                identifier: data.identifier,
                name: data.name,
                preview: data.preview || "",
                width: data.width,
                height: data.height,
                components
            }
        };
    } catch (e: any) {
        console.error("getRenderFormTemplateDetailsAction error:", e);
        return { success: false, error: e.message || "Erro ao obter detalhes do template." };
    }
}
