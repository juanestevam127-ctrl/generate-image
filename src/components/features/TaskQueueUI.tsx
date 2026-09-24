"use client";

import { useEffect, useState } from "react";
import { fetchImportQueueAction } from "@/app/actions/importQueue";
import { Loader2, RefreshCw, PlusCircle, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TaskQueueUI({ 
    onImportTask,
    lockedClientId
}: { 
    onImportTask: (task: any, clientId: string) => void,
    lockedClientId: string | null
}) {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadQueue = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchImportQueueAction();
            if (res.success && res.data) {
                setQueue(res.data);
            } else {
                setError(res.error || "Erro ao carregar fila");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-indigo-300">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm animate-pulse">Sincronizando tarefas do ClickUp...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-red-400">
                <AlertCircle className="w-8 h-8 mb-4" />
                <p className="text-sm text-center max-w-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={loadQueue} className="mt-4 border-red-500/20 hover:bg-red-500/10 text-red-400">
                    <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
                </Button>
            </div>
        );
    }

    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <p className="text-sm">Nenhuma tarefa com status "Falta Arte | Edição" no ClickUp.</p>
                <Button variant="ghost" size="sm" onClick={loadQueue} className="mt-4 hover:bg-white/5 text-gray-300">
                    <RefreshCw className="w-4 h-4 mr-2" /> Atualizar Fila
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                    Fila de Demanda: Falta Arte
                </h3>
                <Button variant="ghost" size="sm" onClick={loadQueue} className="h-8 text-xs bg-white/5 hover:bg-white/10 text-gray-300">
                    <RefreshCw className="w-3 h-3 mr-2" /> Atualizar
                </Button>
            </div>

            {lockedClientId && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-md mb-4 text-orange-200 text-xs flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                    Você tem itens na tabela. Conclua ou limpe a tabela para importar tarefas de outros clientes.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queue.map((group, idx) => {
                    const isLockedOut = lockedClientId && group.tasks.some((t:any) => t.clientId) && group.tasks[0].clientId !== lockedClientId;
                    
                    return (
                        <div key={idx} className={`bg-black/30 border ${isLockedOut ? 'border-white/5 opacity-50' : 'border-indigo-500/20'} rounded-lg overflow-hidden flex flex-col`}>
                            <div className="bg-indigo-900/30 px-3 py-2 border-b border-white/5 font-semibold text-indigo-300 text-sm flex items-center justify-between">
                                {group.clientName}
                                <span className="bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full text-[10px]">
                                    {group.tasks.length}
                                </span>
                            </div>
                            <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {group.tasks.map((task: any) => (
                                    <div key={task.clickupTaskId} className="bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-md text-xs group/task">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-medium text-gray-200 leading-tight">
                                                {task.taskName}
                                            </div>
                                        </div>
                                        {task.preco && (
                                            <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                                                💰 R$ {task.preco}
                                            </div>
                                        )}
                                        {task.veiculoDb ? (
                                            <div className="text-[10px] text-blue-400 mt-1 flex items-center">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Imagens disponíveis no banco
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                ⚠️ Sem imagens no banco (criação manual)
                                            </div>
                                        )}

                                        <div className="mt-3">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="w-full h-7 text-[10px] bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300"
                                                disabled={isLockedOut || !task.clientId}
                                                onClick={() => onImportTask(task, task.clientId)}
                                                title={!task.clientId ? "Cliente não encontrado no sistema" : isLockedOut ? "Finalize a tabela atual primeiro" : "Importar tarefa"}
                                            >
                                                <PlusCircle className="w-3 h-3 mr-1" /> Importar para Tabela
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
