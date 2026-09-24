const fs = require('fs');

let content = fs.readFileSync('src/app/actions/clickup.ts', 'utf8');

if (!content.includes('export async function uploadStoryToClickupAction')) {
    content += `

export async function uploadStoryToClickupAction(taskId: string, imageUrl: string) {
    try {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error('Failed to download image from R2');
        const buffer = await imageRes.arrayBuffer();
        
        const fd = new FormData();
        const blob = new Blob([buffer], { type: imageRes.headers.get('content-type') || 'image/jpeg' });
        fd.append('attachment', blob, 'story.jpg');

        const FIELD_ID = 'c3825f6c-e9d3-428f-a424-758fa44110ff'; // Stories custom field
        const res = await fetch(\`https://api.clickup.com/api/v2/task/\${taskId}/field/\${FIELD_ID}\`, {
            method: 'POST',
            headers: {
                'Authorization': CLICKUP_TOKEN
            },
            body: fd as any
        });

        if (!res.ok) throw new Error('Failed to upload to ClickUp: ' + await res.text());

        return { success: true };
    } catch (e: any) {
        console.error('ClickUp Story Upload Error:', e);
        return { success: false, error: e.message };
    }
}

export async function findClickupTaskForVehicleAction(clienteId: string, veiculoGerado: string) {
    try {
        const { data: veiculos } = await supabase
            .from('VeiculoOperador')
            .select('id, clickupTaskId, dados')
            .eq('clienteId', clienteId)
            .not('clickupTaskId', 'is', null)
            .order('created_at', { ascending: false });

        if (!veiculos || veiculos.length === 0) return { success: false, error: 'No tasks found' };

        const veiculoFormatado = String(veiculoGerado).trim().toUpperCase();

        const match = veiculos.find(v => {
            const values = Object.values(v.dados).map(val => String(val).trim().toUpperCase());
            return values.some(val => val === veiculoFormatado);
        });

        if (match) return { success: true, clickupTaskId: match.clickupTaskId };
        return { success: false, error: 'Vehicle not found' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getClickupTaskAction(taskId: string) {
    try {
        const res = await fetch(\`https://api.clickup.com/api/v2/task/\${taskId}\`, {
            method: 'GET',
            headers: { 'Authorization': CLICKUP_TOKEN }
        });
        if (!res.ok) throw new Error('Failed to fetch task');
        const data = await res.json();
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
`;
}

if (!content.includes('import { supabase } from "@/lib/supabase";')) {
    content = 'import { supabase } from "@/lib/supabase";\n' + content;
}

fs.writeFileSync('src/app/actions/clickup.ts', content);
