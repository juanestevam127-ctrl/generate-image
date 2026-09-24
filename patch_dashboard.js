const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/dashboard/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('TaskQueueUI')) {
    content = content.replace(
        'import { fetchImportacaoVeiculosAction } from "@/app/actions/importacao";',
        'import { fetchImportacaoVeiculosAction } from "@/app/actions/importacao";\nimport { TaskQueueUI } from "@/components/features/TaskQueueUI";'
    );
}

// 1. We need to hide the traditional Client Select when viewMode === "importacao"
// The third Select block starts with:
// <Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-indigo-500/20">
//     <div className="flex flex-col md:flex-row gap-4 items-end">
//         <div className="w-full md:w-1/3">
//             <label className="text-sm font-medium text-gray-300 mb-2 block">Selecione o Cliente</label>

const oldBlock = `<Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-indigo-500/20">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/3">
                                    <label className="text-sm font-medium text-gray-300 mb-2 block">Selecione o Cliente</label>`;

const newBlock = `<Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-indigo-500/20">
                            
                            {/* IMPORT TASK QUEUE */}
                            {viewMode === "importacao" && (
                                <div className="w-full mb-6">
                                    <TaskQueueUI 
                                        onImportTask={(task, clientId) => {
                                            setSelectedClientId(clientId);
                                            if (task.veiculoDb) {
                                                addVehicleToTable(task.veiculoDb);
                                            } else {
                                                // Adiciona linha preenchida com dados basicos
                                                setTableData(prev => [...prev, {
                                                    _id: crypto.randomUUID(),
                                                    _clickupTaskId: task.clickupTaskId,
                                                    "Valor": task.preco || "",
                                                    "Nome do Veiculo": task.taskName
                                                }]);
                                            }
                                        }} 
                                        lockedClientId={tableData.length > 0 ? selectedClientId : null} 
                                    />
                                </div>
                            )}

                            <div className={\`flex flex-col md:flex-row gap-4 items-end \${viewMode === "importacao" ? "hidden" : ""}\`}>
                                <div className="w-full md:w-1/3">
                                    <label className="text-sm font-medium text-gray-300 mb-2 block">Selecione o Cliente</label>`;

if (content.includes(oldBlock) && !content.includes('TaskQueueUI onImportTask')) {
    content = content.replace(oldBlock, newBlock);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('patched successfully');
