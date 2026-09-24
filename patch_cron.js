const fs = require('fs');

let content = fs.readFileSync('src/app/api/cron/process-posts/route.ts', 'utf8');

if (!content.includes('getClickupTaskAction')) {
    content = content.replace(
        'const { updateClickupTaskStatusAction } = await import("@/app/actions/clickup");',
        'const { updateClickupTaskStatusAction, getClickupTaskAction } = await import("@/app/actions/clickup");'
    );
}

const oldLogic = `if (matchingVehicle && matchingVehicle.clickupTaskId) {
                                const res = await updateClickupTaskStatusAction(matchingVehicle.clickupTaskId, "falta anúncio");
                                
                                if (res.success) {
                                    const novosDados = { ...matchingVehicle.dados, clickup_status_updated: true };
                                    await supabase.from('VeiculoOperador').update({ dados: novosDados }).eq('id', matchingVehicle.id);
                                    results.push({ action: 'clickup_updated', vehicle: post.veiculo_gerado });
                                }
                            }`;

const newLogic = `if (matchingVehicle && matchingVehicle.clickupTaskId) {
                                // NOVO: Verifica se a tarefa possui uma imagem no campo Stories (c3825f6c-e9d3-428f-a424-758fa44110ff)
                                const taskRes = await getClickupTaskAction(matchingVehicle.clickupTaskId);
                                let hasStory = false;
                                
                                if (taskRes.success && taskRes.data && taskRes.data.custom_fields) {
                                    const storyField = taskRes.data.custom_fields.find((cf: any) => cf.id === 'c3825f6c-e9d3-428f-a424-758fa44110ff');
                                    if (storyField && storyField.value && storyField.value.length > 0) {
                                        hasStory = true;
                                    }
                                }

                                if (hasStory) {
                                    const res = await updateClickupTaskStatusAction(matchingVehicle.clickupTaskId, "falta anúncio");
                                    
                                    if (res.success) {
                                        const novosDados = { ...matchingVehicle.dados, clickup_status_updated: true };
                                        await supabase.from('VeiculoOperador').update({ dados: novosDados }).eq('id', matchingVehicle.id);
                                        results.push({ action: 'clickup_updated', vehicle: post.veiculo_gerado });
                                    }
                                } else {
                                    results.push({ action: 'clickup_skipped_no_story', vehicle: post.veiculo_gerado });
                                    // Não definimos clickup_status_updated = true, então ele tentará novamente na próxima execução
                                }
                            }`;

if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
}

fs.writeFileSync('src/app/api/cron/process-posts/route.ts', content);
