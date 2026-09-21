"use server";

const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN || "pk_112068213_H24CB6Q9OBLJMNEMECLOHXNS7Z27HLJ6";
const CLIENTES_LIST_ID = "900101297340";
const GOS_LIST_ID = "901306161617";

export async function getClickupClientsAction() {
    try {
        let allTasks: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const res = await fetch(`https://api.clickup.com/api/v2/list/${CLIENTES_LIST_ID}/task?archived=false&page=${page}`, {
                method: 'GET',
                headers: {
                    'Authorization': CLICKUP_TOKEN,
                    'Content-Type': 'application/json'
                },
                next: { revalidate: 60 } // Cache for 60s
            });

            if (!res.ok) throw new Error("Failed to fetch from ClickUp");
            
            const data = await res.json();
            const tasks = data.tasks || [];
            allTasks = [...allTasks, ...tasks];

            if (data.last_page) {
                hasMore = false;
            } else if (tasks.length === 0) {
                hasMore = false;
            } else {
                page++;
            }
        }

        const clients = allTasks.map((t: any) => ({
            id: t.id,
            name: t.name
        }));

        // Sort alphabetically
        clients.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return { success: true, data: clients };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createClickupTaskAction(params: {
    nomeVeiculo: string;
    cor: string;
    ano: string;
    precoFormatado: string; // Ex: R$99.990
    clienteClickupId: string;
}) {
    try {
        // Formata o nome "VEICULO COR ANO"
        const taskName = `${params.nomeVeiculo} ${params.cor} ${params.ano}`.toUpperCase();

        // Tenta parsear o preço (remove R$, pontos de milhar, troca vírgula por ponto)
        let precoNumerico = 0;
        if (params.precoFormatado) {
            const limpo = params.precoFormatado.replace(/[R$\s.]/g, '').replace(',', '.');
            precoNumerico = parseFloat(limpo) || 0;
        }

        const body = {
            name: taskName,
            status: "FALTA ARTE | EDIÇÃO",
            custom_fields: [
                {
                    // Preço
                    id: "bb59624a-e911-4831-94e5-f77b50ed8e19",
                    value: precoNumerico
                },
                {
                    // Formato -> Arte (ID da label)
                    id: "d75481ec-10fc-46e3-8a69-4f632c88e749",
                    value: ["cd18d768-d9ae-4391-a517-d7635782cd43"]
                },
                {
                    // CLIENTE (Task Relationship)
                    id: "1bbe66ba-1e2a-4827-b1c2-75c5c615de51",
                    value: {
                        add: [params.clienteClickupId]
                    }
                }
            ]
        };

        const res = await fetch(`https://api.clickup.com/api/v2/list/${GOS_LIST_ID}/task`, {
            method: 'POST',
            headers: {
                'Authorization': CLICKUP_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error("ClickUp Create Error:", await res.text());
            throw new Error("Falha ao criar tarefa no ClickUp");
        }

        const data = await res.json();
        return { success: true, data: { taskId: data.id } };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getGosTasksAction() {
    try {
        let allTasks: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore && page < 10) {
            const res = await fetch(`https://api.clickup.com/api/v2/list/${GOS_LIST_ID}/task?archived=false&page=${page}&order_by=updated`, {
                method: 'GET',
                headers: {
                    'Authorization': CLICKUP_TOKEN,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error("Failed to fetch GOS tasks");
            
            const data = await res.json();
            const tasks = data.tasks || [];
            allTasks = [...allTasks, ...tasks];

            if (data.last_page) {
                hasMore = false;
            } else if (tasks.length === 0) {
                hasMore = false;
            } else {
                page++;
            }
        }

        const formattedTasks = allTasks.map(t => {
            const clientField = t.custom_fields?.find((cf: any) => cf.id === "1bbe66ba-1e2a-4827-b1c2-75c5c615de51");
            const clientId = clientField?.value ? clientField.value[0]?.id : null;

            return {
                id: t.id,
                name: t.name,
                status: t.status?.status,
                statusColor: t.status?.color,
                assignees: t.assignees?.map((a: any) => ({ id: a.id, username: a.username, initials: a.initials, color: a.color })) || [],
                clientId: clientId
            };
        });

        return { success: true, data: formattedTasks };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getClickupListStatusesAction() {
    try {
        const res = await fetch(`https://api.clickup.com/api/v2/list/${GOS_LIST_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': CLICKUP_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error("Failed to fetch list details");
        
        const data = await res.json();
        return { success: true, statuses: data.statuses };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateClickupTaskStatusAction(taskId: string, status: string) {
    try {
        const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': CLICKUP_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!res.ok) throw new Error("Failed to update status");
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

