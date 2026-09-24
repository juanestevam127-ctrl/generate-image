const fs = require('fs');
let code = fs.readFileSync('src/components/features/PostScheduler.tsx', 'utf8');

const replacement = `            const findRes = await findClickupTaskForVehicleAction(client.id, post.veiculo_gerado);
            if (!findRes.success || !findRes.clickupTaskId) {
                alert("Erro ao buscar tarefa: " + (findRes.error || "Veículo não encontrado"));
                setIsUploadingStory(prev => ({ ...prev, [post.id]: false }));
                return;
            }`;

code = code.replace(/const findRes = await findClickupTaskForVehicleAction\(client\.id, post\.veiculo_gerado\);\s*if \(\!findRes\.success \|\| \!findRes\.clickupTaskId\) \{\s*alert\([\s\S]*?\);\s*setIsUploadingStory\(prev => \(\{ \.\.\.prev, \[post\.id\]: false \}\)\);\s*return;\s*\}/, replacement);

fs.writeFileSync('src/components/features/PostScheduler.tsx', code);
console.log("Replaced");
