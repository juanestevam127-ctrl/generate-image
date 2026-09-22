"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Save, Car, LayoutList, Plus, Search, Filter, Trash2 } from "lucide-react";
import { getPresignedUrlAction } from "@/app/actions/upload";
import { getGosTasksAction, getClickupListStatusesAction, updateClickupTaskStatusAction } from "@/app/actions/clickup";

export default function VeiculosPage() {
    const { user, clients } = useStore();
    const [activeTab, setActiveTab] = useState<"lista" | "novo">("lista");
    
    // Lista GOS
    const [tasks, setTasks] = useState<any[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    
    // Filters
    const [filterClients, setFilterClients] = useState<string[]>([]);
    const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
    const [filterAssignees, setFilterAssignees] = useState<string[]>([]);

    // Novo Veículo
        type VehicleRowData = {
        id: string;
        textFields: Record<string, string>;
        extraValor: string;
        observacoesGOS: string;
        contemVideo: boolean;
        imageFiles: File[];
    };

    const [selectedClientId, setSelectedClientId] = useState("");
    const [activeClient, setActiveClient] = useState<any>(null);
    const [vehicles, setVehicles] = useState<VehicleRowData[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeTab === "lista") {
            loadGosData();
        }
    }, [activeTab]);

    const loadGosData = async () => {
        setIsLoadingTasks(true);
        const [tasksRes, statusesRes] = await Promise.all([
            getGosTasksAction(),
            getClickupListStatusesAction()
        ]);
        
        if (tasksRes.success) {
            setTasks(tasksRes.data || []);
        }
        if (statusesRes.success) {
            setStatuses(statusesRes.statuses || []);
        }
        setIsLoadingTasks(false);
    };

    // Filter derivations
    const assignees = useMemo(() => {
        const map = new Map();
        tasks.forEach(t => {
            t.assignees?.forEach((a: any) => {
                if (!map.has(a.id)) map.set(a.id, a);
            });
        });
        return Array.from(map.values());
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (filterClients.length > 0) {
                const cId = t.clientId ? t.clientId.toString() : "";
                if (!filterClients.includes(cId)) return false;
            }
            if (filterStatuses.length > 0) {
                if (!filterStatuses.includes(t.status)) return false;
            }
            if (filterAssignees.length > 0) {
                const taskAssigneeIds = t.assignees?.map((a:any) => a.id.toString()) || [];
                if (!filterAssignees.some(id => taskAssigneeIds.includes(id.toString()))) return false;
            }
            return true;
        });
    }, [tasks, filterClients, filterStatuses, filterAssignees]);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        const res = await updateClickupTaskStatusAction(taskId, newStatus);
        if (!res.success) {
            alert("Erro ao alterar status: " + res.error);
            // Revert on error
            loadGosData(); 
        }
    };

    // Form functions
    useEffect(() => {
        if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            setActiveClient(client);
            setVehicles([{
                id: Math.random().toString(),
                textFields: {},
                extraValor: "",
                observacoesGOS: "",
                contemVideo: false,
                imageFiles: []
            }]);
        } else {
            setActiveClient(null);
        }
    }, [selectedClientId, clients]);

    const handleVehicleChange = (vId: string, field: string, value: any) => {
        setVehicles(prev => prev.map(v => v.id === vId ? { ...v, [field]: value } : v));
    };

    const handleVehicleTextChange = (vId: string, colId: string, value: string) => {
        setVehicles(prev => prev.map(v => v.id === vId ? { ...v, textFields: { ...v.textFields, [colId]: value } } : v));
    };

    const handleVehicleImageChange = (vId: string, files: File[]) => {
        setVehicles(prev => prev.map(v => v.id === vId ? { ...v, imageFiles: [...v.imageFiles, ...files] } : v));
    };

    const removeVehicleImage = (vId: string, fileIdx: number) => {
        setVehicles(prev => prev.map(v => v.id === vId ? { ...v, imageFiles: v.imageFiles.filter((_, i) => i !== fileIdx) } : v));
    };

    const addVehicleRow = () => {
        setVehicles(prev => [...prev, {
            id: Math.random().toString(),
            textFields: {},
            extraValor: "",
            observacoesGOS: "",
            contemVideo: false,
            imageFiles: []
        }]);
    };

    const removeVehicleRow = (vId: string) => {
        setVehicles(prev => prev.filter(v => v.id !== vId));
    };

    const uploadFileToR2 = async (file: File): Promise<string> => {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = `temp-files/${fileName}`;
        const res = await getPresignedUrlAction(filePath, file.type);
        if (!res.success) throw new Error(res.error);
        const uploadRes = await fetch(res.signedUrl!, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!uploadRes.ok) throw new Error("Erro no upload do R2");
        return res.publicUrl!;
    };

    const handleSave = async () => {
        if (!activeClient || !activeClient.clickupTarefaId) {
            alert("Cliente não possui integração com ClickUp configurada (Tarefa não vinculada).");
            return;
        }
        if (vehicles.length === 0) return;

        setIsSaving(true);
        try {
            const { createClickupTaskAction } = await import("@/app/actions/clickup");
            const { supabase } = await import("@/lib/supabase");

            for (const v of vehicles) {
                const uploadedUrls = [];
                for (const file of v.imageFiles) {
                    uploadedUrls.push(await uploadFileToR2(file));
                }

                const dados: any = {};
                activeClient.columns.forEach((col: any) => {
                    if (col.type === "text" || col.type === "checkbox") {
                        if (col.name.toLowerCase() !== "formato") {
                            dados[col.name] = v.textFields[col.id] || "";
                        }
                    }
                });

                const getFieldVal = (d: any, keywords: string[]) => {
                    let key = Object.keys(d).find(k => keywords.some(kw => k.toLowerCase() === kw.toLowerCase() || k.toLowerCase().startsWith(kw.toLowerCase())));
                    if (key) return d[key];
                    key = Object.keys(d).find(k => keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(k)));
                    return key ? d[key] : null;
                };

                const nome = getFieldVal(dados, ['nome', 'carro', 'titulo', 'modelo']) || Object.values(dados)[0] as string || "Veículo";
                const cor = getFieldVal(dados, ['cor']) || "";
                const ano = getFieldVal(dados, ['ano']) || "";
                const preco = getFieldVal(dados, ['pre', 'valor']) || v.extraValor || "";

                const clickupRes = await createClickupTaskAction({
                    nomeVeiculo: nome, 
                    cor, 
                    ano, 
                    precoFormatado: preco, 
                    clienteClickupId: activeClient.clickupTarefaId,
                    observacoesGOS: v.observacoesGOS,
                    contemVideo: v.contemVideo
                });

                if (!clickupRes.success) throw new Error("Erro ClickUp: " + clickupRes.error);

                const { error: sbError } = await supabase.from("VeiculoOperador").insert([{
                    clienteId: activeClient.id, dados: dados, fotos: uploadedUrls, clickupTaskId: clickupRes.data?.taskId, importado: false
                }]);

                if (sbError) throw sbError;
            }

            alert("Veículo(s) adicionado(s) com sucesso!");
            setVehicles([{
                id: Math.random().toString(),
                textFields: {},
                extraValor: "",
                observacoesGOS: "",
                contemVideo: false,
                imageFiles: []
            }]);
            setActiveTab("lista");
            loadGosData();
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;
    const availableClients = clients.filter(c => c.clickupTarefaId);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center">
                        <Car className="mr-2 text-indigo-400 w-8 h-8" />
                        Veículos e Estoque GOS
                    </h1>
                    <p className="text-muted-foreground">
                        Acompanhe tarefas no GOS, altere status, ou adicione novos veículos ao estoque.
                    </p>
                </div>
                <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex space-x-1">
                    <button
                        onClick={() => setActiveTab("lista")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "lista" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <LayoutList className="w-4 h-4" /> Painel GOS
                    </button>
                    <button
                        onClick={() => setActiveTab("novo")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "novo" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <Plus className="w-4 h-4" /> Adicionar Veículo
                    </button>
                </div>
            </div>

            {activeTab === "lista" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="bg-zinc-900 border-white/10 shadow-xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-white text-lg">Filtros</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-gray-400">Cliente</Label>
                                    <MultiSelectDropdown 
                                        options={availableClients}
                                        selected={filterClients}
                                        onChange={setFilterClients}
                                        placeholder="Todos os Clientes"
                                        renderLabel={(c: any) => c.name}
                                        valueKey="clickupTarefaId"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-gray-400">Responsável</Label>
                                    <MultiSelectDropdown 
                                        options={assignees}
                                        selected={filterAssignees}
                                        onChange={setFilterAssignees}
                                        placeholder="Todos os Responsáveis"
                                        renderLabel={(a: any) => a.username}
                                        valueKey={(a: any) => a.id.toString()}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-gray-400">Status</Label>
                                    <MultiSelectDropdown 
                                        options={statuses}
                                        selected={filterStatuses}
                                        onChange={setFilterStatuses}
                                        placeholder="Todos os Status"
                                        renderLabel={(s: any) => s.status.toUpperCase()}
                                        valueKey="status"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isLoadingTasks ? (
                        <div className="flex flex-col items-center justify-center py-20 text-indigo-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Carregando tarefas do ClickUp...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTasks.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    Nenhum veículo encontrado com os filtros atuais.
                                </div>
                            ) : (
                                filteredTasks.map(task => {
                                    const cClient = availableClients.find(c => c.clickupTarefaId === task.clientId);
                                    return (
                                        <Card key={task.id} className="bg-zinc-900 border-white/10 p-4 flex flex-col space-y-4 shadow-xl hover:border-indigo-500/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-white font-bold text-sm mb-1 line-clamp-2" title={task.name}>{task.name}</h3>
                                                    <p className="text-xs text-indigo-300 font-semibold">{cClient ? cClient.name : "Cliente Não Vinculado"}</p>
                                                </div>
                                                {task.assignees?.length > 0 && (
                                                    <div className="flex -space-x-2">
                                                        {task.assignees.map((a: any) => (
                                                            <div key={a.id} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border border-black text-white" style={{ backgroundColor: a.color || '#666' }} title={a.username}>
                                                                {a.initials}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="pt-2 mt-auto">
                                                <Label className="text-[10px] text-gray-400 mb-1 block uppercase tracking-wider">Status Atual (ClickUp)</Label>
                                                <select 
                                                    value={task.status} 
                                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                    className="w-full text-xs bg-black/50 border border-white/5 rounded p-2 text-white outline-none cursor-pointer hover:bg-black transition-colors"
                                                    style={{ borderLeft: `4px solid ${task.statusColor || '#666'}` }}
                                                >
                                                    {statuses.map(s => (
                                                        <option key={s.id} value={s.status}>{s.status.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "novo" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
                    <Card className="bg-zinc-900 border-white/10 shadow-xl overflow-hidden">
                        <CardHeader className="bg-black/20 border-b border-white/5">
                            <CardTitle className="text-white">Selecione o Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <select
                                className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-white outline-none focus:border-indigo-500"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">-- Escolha um cliente --</option>
                                {availableClients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>

                    {activeClient && (
                        <Card className="bg-zinc-900 border-white/10 shadow-xl overflow-hidden mt-6">
                            <CardHeader className="bg-black/20 border-b border-white/5">
                                <CardTitle className="text-white">Preencha as Informações</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="overflow-x-auto w-full pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    <div className="min-w-max flex flex-col gap-3">
                                        <div className="flex items-center gap-3 px-3 text-sm font-medium text-gray-400 border-b border-white/5 pb-2">
                                            {activeClient.columns.map((c: any) => c.name.toLowerCase() !== 'formato' && (c.type === 'text' || c.type === 'checkbox') && (
                                                <div key={c.id} className="w-44 shrink-0">{c.name}</div>
                                            ))}
                                            {!activeClient.columns.some((col: any) => col.name.toLowerCase().includes('valor') || col.name.toLowerCase().includes('preço') || col.name.toLowerCase().includes('preco')) && (
                                                <div className="w-32 shrink-0">Valor (ClickUp)</div>
                                            )}
                                            <div className="w-56 shrink-0">Observações - GOS</div>
                                            <div className="w-24 shrink-0">Contém Vídeo?</div>
                                            <div className="w-52 shrink-0">Fotos</div>
                                            <div className="w-10 shrink-0"></div>
                                        </div>

                                        {vehicles.map((v, i) => (
                                            <div key={v.id} className="flex items-start gap-3 bg-black/20 p-3 rounded-lg border border-white/5 relative group hover:bg-black/30 transition-colors">
                                                {activeClient.columns.map((c: any) => {
                                                    if (c.name.toLowerCase() === 'formato') return null;
                                                    if (c.type !== 'text' && c.type !== 'checkbox') return null;
                                                    return (
                                                        <div key={c.id} className="w-44 shrink-0">
                                                            {c.type === "checkbox" ? (
                                                                <div className="flex items-center gap-4 h-9">
                                                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            className="w-4 h-4 rounded border-white/10 bg-black/50 text-indigo-600"
                                                                            checked={(v.textFields[c.id] || "").includes("Stories")}
                                                                            onChange={(e) => {
                                                                                let current = v.textFields[c.id] ? v.textFields[c.id].split(', ') : [];
                                                                                if (e.target.checked) { if (!current.includes("Stories")) current.push("Stories"); }
                                                                                else { current = current.filter(x => x !== "Stories"); }
                                                                                handleVehicleTextChange(v.id, c.id, current.join(', '));
                                                                            }}
                                                                        /> Stories
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            className="w-4 h-4 rounded border-white/10 bg-black/50 text-indigo-600"
                                                                            checked={(v.textFields[c.id] || "").includes("Feed")}
                                                                            onChange={(e) => {
                                                                                let current = v.textFields[c.id] ? v.textFields[c.id].split(', ') : [];
                                                                                if (e.target.checked) { if (!current.includes("Feed")) current.push("Feed"); }
                                                                                else { current = current.filter(x => x !== "Feed"); }
                                                                                handleVehicleTextChange(v.id, c.id, current.join(', '));
                                                                            }}
                                                                        /> Feed
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <Input type="text" className="h-9 bg-black/50 text-xs border-white/10" value={v.textFields[c.id] || ''} onChange={(e) => handleVehicleTextChange(v.id, c.id, e.target.value)} placeholder={`${c.name}`} />
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                                
                                                {!activeClient.columns.some((col: any) => col.name.toLowerCase().includes('valor') || col.name.toLowerCase().includes('preço') || col.name.toLowerCase().includes('preco')) && (
                                                    <div className="w-32 shrink-0">
                                                        <Input className="h-9 bg-black/50 text-xs border-white/10" value={v.extraValor} onChange={(e) => handleVehicleChange(v.id, 'extraValor', e.target.value)} placeholder="R$ 0,00" />
                                                    </div>
                                                )}

                                                <div className="w-56 shrink-0">
                                                    <Input className="h-9 bg-black/50 text-xs border-white/10" value={v.observacoesGOS} onChange={(e) => handleVehicleChange(v.id, 'observacoesGOS', e.target.value)} placeholder="Opcional..." />
                                                </div>

                                                <div className="w-24 shrink-0 flex items-center justify-center h-9 bg-black/30 border border-white/5 rounded">
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 w-full h-full justify-center">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-black/50 text-indigo-600 focus:ring-indigo-500" checked={v.contemVideo} onChange={(e) => handleVehicleChange(v.id, 'contemVideo', e.target.checked)} />
                                                        Sim
                                                    </label>
                                                </div>

                                                <div className="w-52 shrink-0 flex flex-col gap-2">
                                                    <label className="h-9 w-full flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/20 cursor-pointer text-xs font-semibold transition-colors">
                                                        <Upload className="w-3 h-3 mr-2" /> {v.imageFiles.length > 0 ? `${v.imageFiles.length} foto(s)` : 'Anexar Fotos'}
                                                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
                                                            if (e.target.files) handleVehicleImageChange(v.id, Array.from(e.target.files));
                                                        }} />
                                                    </label>
                                                    {v.imageFiles.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {v.imageFiles.map((file, idx) => (
                                                                <div key={idx} className="relative w-8 h-8 group/img">
                                                                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded shadow-sm border border-white/10" />
                                                                    <button onClick={() => removeVehicleImage(v.id, idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10 shadow-lg">
                                                                        <X className="w-2.5 h-2.5 text-white"/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-10 shrink-0 flex items-start justify-center pt-1">
                                                    {vehicles.length > 1 && (
                                                        <button onClick={() => removeVehicleRow(v.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Remover linha">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-4 border-t border-white/5 pt-4">
                                        <Button variant="outline" onClick={addVehicleRow} className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-9 px-4">
                                            <Plus className="w-4 h-4 mr-2" /> Adicionar Mais Um Veículo
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={isSaving}
                                        variant="secondary"
                                        className="w-full h-12 bg-gray-200 hover:bg-gray-300 text-indigo-900 text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin text-indigo-900" />
                                        ) : (
                                            <Save className="w-5 h-5 mr-2 text-indigo-900" />
                                        )}
                                        {isSaving ? "Salvando e Processando..." : "Salvar Veículo"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

            )}
        </div>
    );
}

function MultiSelectDropdown({ options, selected, onChange, placeholder, renderLabel, valueKey }: any) {
    const [open, setOpen] = useState(false);
    const toggleOpt = (val: string) => {
        if (selected.includes(val)) {
            onChange(selected.filter((v: string) => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };
    return (
        <div className="relative">
            <div className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white flex justify-between items-center cursor-pointer select-none min-h-[42px]" onClick={() => setOpen(!open)}>
                <span className="truncate text-sm">
                    {selected.length === 0 ? placeholder : `${selected.length} selecionado(s)`}
                </span>
                <span className="text-xs text-gray-400">▼</span>
            </div>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-white/10 rounded-md shadow-2xl z-50 max-h-60 overflow-y-auto p-1 space-y-1">
                        <div className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer transition-colors" onClick={() => { onChange([]); setOpen(false); }}>
                            <input type="checkbox" checked={selected.length === 0} readOnly className="pointer-events-none w-4 h-4 rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500" />
                            <span className="text-sm text-gray-200">Todos</span>
                        </div>
                        {options.map((opt: any, i: number) => {
                            const val = typeof valueKey === 'function' ? valueKey(opt) : opt[valueKey];
                            const label = renderLabel(opt);
                            return (
                                <div key={i} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer transition-colors" onClick={() => toggleOpt(val)}>
                                    <input type="checkbox" checked={selected.includes(val)} readOnly className="pointer-events-none w-4 h-4 rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500" />
                                    <span className="text-sm text-gray-200 truncate">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
