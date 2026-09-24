const fs = require('fs');

let code = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

const target = `for (const row of tableData) {
                if (row._vehicleId) {
                    const { data: existing } = await supabase.from('VeiculoOperador').select('dados').eq('id', row._vehicleId).single();
                    if (existing) {
                        const updatedDados = { ...existing.dados };
                        activeClient.columns.forEach((c: any) => {
                            if (row[c.id] !== undefined) {
                                updatedDados[c.name] = row[c.id];
                            }
                        });
                        await supabase.from('VeiculoOperador').update({ dados: updatedDados }).eq('id', row._vehicleId);
                    }
                }
            }`;

const replacement = `for (const row of tableData) {
                if (row._vehicleId) {
                    const { data: existing } = await supabase.from('VeiculoOperador').select('dados').eq('id', row._vehicleId).single();
                    if (existing) {
                        const updatedDados = { ...existing.dados };
                        activeClient.columns.forEach((c: any) => {
                            if (row[c.id] !== undefined) {
                                updatedDados[c.name] = row[c.id];
                            }
                        });
                        await supabase.from('VeiculoOperador').update({ dados: updatedDados }).eq('id', row._vehicleId);
                    }
                } else if (row._clickupTaskId) {
                    // Create new record for imported task so we can track it later
                    const newDados: any = {};
                    activeClient.columns.forEach((c: any) => {
                        if (row[c.id] !== undefined) {
                            newDados[c.name] = row[c.id];
                        }
                    });
                    
                    await supabase.from('VeiculoOperador').insert({
                        clienteId: activeClient.id,
                        clickupTaskId: row._clickupTaskId,
                        dados: newDados,
                        importado: false
                    });
                }
            }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', code);
    console.log("Replaced");
} else {
    console.log("Target not found!");
}
