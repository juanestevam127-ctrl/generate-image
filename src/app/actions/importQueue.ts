"use server";

import { supabase } from "@/lib/supabase";
import { unstable_noStore as noStore } from "next/cache";

const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN || "pk_112068213_H24CB6Q9OBLJMNEMECLOHXNS7Z27HLJ6";
const GOS_LIST_ID = "901306161617";

export async function fetchImportQueueAction() {
    noStore();
    try {
        // 1. Fetch pending VeiculoOperador
        const { data: veiculos, error: vError } = await supabase
            .from("VeiculoOperador")
            .select("*")
            .eq("importado", false);

        if (vError) throw vError;

        // 2. Fetch GOS tasks from ClickUp
        let allTasks: any[] = [];
        let page = 0;
        let hasMore = true;

        // We only fetch a few pages to avoid hitting limits, ordering by updated
        while (hasMore && page < 5) {
            // We can filter by status directly in the ClickUp API to save bandwidth
            const res = await fetch(`https://api.clickup.com/api/v2/list/${GOS_LIST_ID}/task?archived=false&page=${page}&statuses%5B%5D=FALTA%20ARTE%20%7C%20EDI%C3%87%C3%83O&statuses%5B%5D=falta%20arte%20%7C%20edi%C3%A7%C3%A3o`, {
                method: 'GET',
                headers: {
                    'Authorization': CLICKUP_TOKEN,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                console.error("Failed to fetch ClickUp tasks", await res.text());
                break;
            }
            
            const data = await res.json();
            const tasks = data.tasks || [];
            allTasks = [...allTasks, ...tasks];

            if (data.last_page || tasks.length === 0) {
                hasMore = false;
            } else {
                page++;
            }
        }

        // 3. Process and Filter tasks
        const validTasks = allTasks.filter(t => {
            // Check status (API filter might be enough, but double check)
            const status = t.status?.status?.toUpperCase();
            if (status !== "FALTA ARTE | EDIÇÃO" && status !== "FALTA ARTE | EDIÇAO") return false;

            // Check Format contains "Arte"
            const formatField = t.custom_fields?.find((cf: any) => cf.id === "d75481ec-10fc-46e3-8a69-4f632c88e749");
            if (!formatField || !formatField.value) return false;
            
            // value is usually an array of UUIDs matching type_config.options
            const options = formatField.type_config?.options || [];
            const selectedIds = Array.isArray(formatField.value) ? formatField.value : [formatField.value];
            
            const hasArte = selectedIds.some((id: string) => {
                const opt = options.find((o: any) => o.id === id);
                return opt && (opt.name || opt.label) && (opt.name || opt.label).toUpperCase().includes("ARTE");
            });

            return hasArte;
        });

        // 4. Group by Client
        const grouped: Record<string, any[]> = {};

        for (const t of validTasks) {
            // Get Client name from task relationship or text
            const clientField = t.custom_fields?.find((cf: any) => cf.id === "1bbe66ba-1e2a-4827-b1c2-75c5c615de51");
            let clickupClientName = "Desconhecido";
            if (clientField?.value && clientField.value.length > 0) {
                clickupClientName = clientField.value[0].name || "Desconhecido";
            }

            // Find matching VeiculoOperador
            const veiculoDb = veiculos?.find(v => v.clickupTaskId === t.id);
            
            // Normalize client name for grouping
            const clientName = clickupClientName;

            if (!grouped[clientName]) {
                grouped[clientName] = [];
            }

            // Get Price
            const precoField = t.custom_fields?.find((cf: any) => cf.id === "bb59624a-e911-4831-94e5-f77b50ed8e19");
            const preco = precoField?.value || "";

            grouped[clientName].push({
                clickupTaskId: t.id,
                taskName: t.name,
                clientName: clientName,
                clientId: veiculoDb?.clienteId || null, // Supabase Client ID if exists
                preco: preco,
                url: t.url,
                // Attach VeiculoOperador data if exists
                veiculoDb: veiculoDb || null
            });
        }

        // Sort clients alphabetically
        const sortedClients = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
        
        const finalArray = sortedClients.map(clientName => ({
            clientName,
            tasks: grouped[clientName]
        }));

        return { success: true, data: finalArray };
    } catch (e: any) {
        console.error("fetchImportQueueAction error:", e);
        return { success: false, error: e.message };
    }
}
