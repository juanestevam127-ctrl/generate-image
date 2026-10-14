"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store-context";
import { 
    fetchBndvInventoryAction, 
    fetchBoomInventoryAction, 
    fetchLojaConectadaInventoryAction, 
    fetchAutoCertoInventoryAction, 
    fetchRevendaMaisInventoryAction,
    importEstoqueVehiclesAction,
    linkEstoqueVehicleToClickupAction,
    unlinkEstoqueVehicleAction
} from "@/app/actions/estoque";
import { getVeiculosOperadorByClienteAction } from "@/app/actions/veiculo";
import { getClickupTasksStatusesAction } from "@/app/actions/clickup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
    Loader2, 
    RefreshCw, 
    Car, 
    Info, 
    Image as ImageIcon, 
    Download, 
    CheckCircle2, 
    UploadCloud, 
    CheckSquare, 
    Square, 
    Video, 
    ExternalLink,
    Filter,
    Search,
    Link as LinkIcon,
    Unlink
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export function EstoqueManager() {
    const { clients } = useStore();
    const [selectedClientId, setSelectedClientId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadingSingle, setDownloadingSingle] = useState<number | null>(null);

    // Multi-selection
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Clickup Tracking State: map from externalKey/plate/name to { clickupTaskId, status, statusColor }
    const [importedTracking, setImportedTracking] = useState<Record<string, { taskId: string; status: string; statusColor?: string }>>({});
    
    // Import Modal State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [vehiclesToImport, setVehiclesToImport] = useState<any[]>([]);
    const [customTextFields, setCustomTextFields] = useState<Record<string, Record<string, string>>>({});
    const [importContemVideoMap, setImportContemVideoMap] = useState<Record<string, boolean>>({});
    const [importObservacoesMap, setImportObservacoesMap] = useState<Record<string, string>>({});

    // Link Task Modal State
    const [linkModalVehicle, setLinkModalVehicle] = useState<any | null>(null);
    const [manualTaskIdInput, setManualTaskIdInput] = useState("");
    const [isLinking, setIsLinking] = useState(false);

    const activeClient = clients.find(c => c.id === selectedClientId);

    // Filtra clientes que têm integração de estoque configurada
    const integratedClients = clients
        .filter(c => c.integracaoTipo && c.integracaoTipo !== "none")
        .sort((a, b) => a.name.localeCompare(b.name));

    const parsePictures = (pictureJs: string) => {
        if (!pictureJs) return [];
        try {
            const parsed = JSON.parse(pictureJs);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    const parseItems = (itemJs: string) => {
        if (!itemJs) return [];
        try {
            const parsed = JSON.parse(itemJs);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    const downloadSingleImage = async (url: string, index: number) => {
        setDownloadingSingle(index);
        try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error("Failed to fetch image");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = blobUrl;
            a.download = `veiculo_foto_${index + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Erro ao baixar foto:", err);
            alert("Erro ao baixar a foto.");
        } finally {
            setDownloadingSingle(null);
        }
    };

    const handleDownloadImages = async (pictures: any[]) => {
        setIsDownloading(true);
        try {
            for (let i = 0; i < pictures.length; i++) {
                const pic = pictures[i];
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(pic.Link)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) continue;
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = blobUrl;
                a.download = `veiculo_foto_${i + 1}.jpg`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
                await new Promise(r => setTimeout(r, 200)); 
            }
        } catch (err) {
            console.error("Erro ao baixar fotos:", err);
            alert("Erro ao baixar algumas fotos.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Recarrega status dos veículos importados no ClickUp
    const refreshImportedTracking = async (clientId: string, currentVehicles: any[]) => {
        try {
            const opRes = await getVeiculosOperadorByClienteAction(clientId);
            if (!opRes.success || !opRes.data) return;

            const existingOps = opRes.data;
            const taskIdsToFetch: string[] = [];
            const mapping: Record<string, { taskId: string; status: string; statusColor?: string }> = {};

            existingOps.forEach((op: any) => {
                if (op.clickupTaskId) {
                    taskIdsToFetch.push(op.clickupTaskId);
                }
            });

            let statusesMap: Record<string, { status: string; statusColor?: string }> = {};
            if (taskIdsToFetch.length > 0) {
                const sRes = await getClickupTasksStatusesAction(taskIdsToFetch);
                if (sRes.success && sRes.data) {
                    statusesMap = sRes.data;
                }
            }

            currentVehicles.forEach((v) => {
                const vKey = String(v.vehicleExternalKey || "");
                if (!vKey) return;

                // Só casa se foi um veículo importado explicitamente por esta tela (com _externalKey gravado)
                const match = existingOps.find((op: any) => {
                    const d = op.dados || {};
                    return d._externalKey && String(d._externalKey) === vKey;
                });

                if (match && match.clickupTaskId) {
                    const st = statusesMap[match.clickupTaskId] || { status: "Vinculado", statusColor: "#6366f1" };
                    mapping[vKey] = {
                        taskId: match.clickupTaskId,
                        status: st.status,
                        statusColor: st.statusColor
                    };
                }
            });

            setImportedTracking(mapping);
        } catch (err) {
            console.error("Error loading imported tracking:", err);
        }
    };

    const handleSync = async () => {
        if (!selectedClientId) return;
        setIsLoading(true);
        setError(null);
        setVehicles([]);
        setSelectedKeys([]);
        setImportedTracking({});
        
        const client = clients.find(c => c.id === selectedClientId);
        let fetchedList: any[] = [];
        
        try {
            if (client?.integracaoTipo === "BNDV") {
                const result = await fetchBndvInventoryAction(selectedClientId);
                if (result.success && result.data) {
                    fetchedList = result.data;
                } else {
                    setError(result.error || "Erro ao sincronizar estoque.");
                }
            } else if (client?.integracaoTipo === "BOOM") {
                const result = await fetchBoomInventoryAction(selectedClientId);
                if (result.success && result.data) {
                    fetchedList = result.data;
                } else {
                    setError(result.error || "Erro ao sincronizar estoque.");
                }
            } else if (client?.integracaoTipo === "LOJA_CONECTADA") {
                const result = await fetchLojaConectadaInventoryAction(selectedClientId);
                if (result.success && result.data) {
                    fetchedList = result.data;
                } else {
                    setError(result.error || "Erro ao sincronizar estoque da Loja Conectada.");
                }
            } else if (client?.integracaoTipo === "AUTOCERTO") {
                const result = await fetchAutoCertoInventoryAction(selectedClientId);
                if (result.success && result.data) {
                    fetchedList = result.data;
                } else {
                    setError(result.error || "Erro ao sincronizar estoque AutoCerto.");
                }
            } else if (client?.integracaoTipo === "REVENDA_MAIS") {
                const result = await fetchRevendaMaisInventoryAction(selectedClientId);
                if (result.success && result.data) {
                    fetchedList = result.data;
                } else {
                    setError(result.error || "Erro ao sincronizar estoque Revenda Mais.");
                }
            } else {
                setError("Integração não suportada ainda.");
            }

            setVehicles(fetchedList);
            if (fetchedList.length > 0) {
                await refreshImportedTracking(selectedClientId, fetchedList);
            }
        } catch (e: any) {
            setError("Erro interno ao sincronizar: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Selection handlers
    const toggleSelectAll = () => {
        const unimported = filteredVehicles.filter(v => !importedTracking[String(v.vehicleExternalKey)]);
        if (selectedKeys.length === unimported.length && unimported.length > 0) {
            setSelectedKeys([]);
        } else {
            setSelectedKeys(unimported.map(v => String(v.vehicleExternalKey)));
        }
    };

    const toggleSelectVehicle = (key: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (importedTracking[key]) return; // Já importado
        setSelectedKeys(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    // Open Import Modal
    const openImportModal = (vehicleList: any[]) => {
        if (!activeClient?.clickupTarefaId) {
            alert("Atenção: Este cliente não possui a Tarefa de Serviços do ClickUp vinculada no cadastro de clientes!");
            return;
        }
        setVehiclesToImport(vehicleList);
        
        // Inicializa mapeamento com base nas colunas
        const initialCustom: Record<string, Record<string, string>> = {};
        const initialVideo: Record<string, boolean> = {};
        const initialObs: Record<string, string> = {};

        vehicleList.forEach(v => {
            const vKey = String(v.vehicleExternalKey);
            initialCustom[vKey] = {};
            initialVideo[vKey] = false;
            initialObs[vKey] = "";

            activeClient?.columns.forEach((col: any) => {
                if (col.type === "text" || col.type === "checkbox") {
                    const cName = col.name.toLowerCase();
                    if (cName.includes("marca") || cName.includes("fabricante")) {
                        initialCustom[vKey][col.id] = v.markName && v.markName !== "N/A" ? v.markName : "";
                    } else if (cName.includes("nome") || cName.includes("veiculo") || cName.includes("veículo") || cName.includes("modelo") || cName.includes("carro")) {
                        initialCustom[vKey][col.id] = (v.markName && v.markName !== "N/A" ? `${v.markName} ` : "") + (v.modelName || v.versionName || "");
                    } else if (cName.includes("ano")) {
                        initialCustom[vKey][col.id] = v.year ? String(v.year) : "";
                    } else if (cName.includes("cor")) {
                        initialCustom[vKey][col.id] = v.color && v.color !== "N/A" ? v.color : "";
                    } else if (cName.includes("pre") || cName.includes("valor")) {
                        initialCustom[vKey][col.id] = v.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.saleValue) : "";
                    } else if (cName.includes("km") || cName.includes("quilo")) {
                        initialCustom[vKey][col.id] = v.km ? `${v.km.toLocaleString('pt-BR')} km` : "";
                    } else if (cName.includes("cambio") || cName.includes("câmbio")) {
                        initialCustom[vKey][col.id] = v.transmissionName && v.transmissionName !== "N/A" ? v.transmissionName : "";
                    } else if (cName.includes("combustivel") || cName.includes("combustível")) {
                        initialCustom[vKey][col.id] = v.fuelName && v.fuelName !== "N/A" ? v.fuelName : "";
                    } else if (cName.includes("placa")) {
                        initialCustom[vKey][col.id] = v.plate && v.plate !== "N/A" ? v.plate : "";
                    }
                }
            });

            // Valor extra caso o cliente não tenha coluna de valor
            const hasValorCol = activeClient?.columns.some((col: any) => col.name.toLowerCase().includes('valor') || col.name.toLowerCase().includes('preço') || col.name.toLowerCase().includes('preco'));
            if (!hasValorCol) {
                initialCustom[vKey]["_extraValor"] = v.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.saleValue) : "";
            }
        });

        setCustomTextFields(initialCustom);
        setImportContemVideoMap(initialVideo);
        setImportObservacoesMap(initialObs);
        setImportModalOpen(true);
    };

    // Execute Import
    const handleExecuteImport = async () => {
        if (!activeClient || vehiclesToImport.length === 0) return;
        setIsImporting(true);

        try {
            const payloadItems = vehiclesToImport.map(v => {
                const vKey = String(v.vehicleExternalKey);
                return {
                    vehicle: v,
                    textFields: customTextFields[vKey] || {},
                    observacoesGOS: importObservacoesMap[vKey] || "",
                    contemVideo: !!importContemVideoMap[vKey]
                };
            });

            const res = await importEstoqueVehiclesAction({
                clienteId: activeClient.id,
                items: payloadItems
            });

            if (!res.success) {
                throw new Error(res.error || "Erro ao importar veículos.");
            }

            alert(`${vehiclesToImport.length} veículo(s) importado(s) com sucesso para o ClickUp!`);
            setImportModalOpen(false);
            setSelectedKeys([]);
            if (selectedVehicle) setSelectedVehicle(null);

            // Atualiza status na tela
            await refreshImportedTracking(activeClient.id, vehicles);

        } catch (err: any) {
            alert("Erro durante importação: " + err.message);
        } finally {
            setIsImporting(false);
        }
    };

    // Open Link Task Modal
    const openLinkModal = (vehicle: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const vKey = String(vehicle.vehicleExternalKey || "");
        const currentTracking = importedTracking[vKey];
        setLinkModalVehicle(vehicle);
        setManualTaskIdInput(currentTracking ? currentTracking.taskId : "");
    };

    // Confirm Link Task
    const handleConfirmLink = async () => {
        if (!activeClient || !linkModalVehicle || !manualTaskIdInput.trim()) return;
        setIsLinking(true);

        try {
            const res = await linkEstoqueVehicleToClickupAction({
                clienteId: activeClient.id,
                vehicle: linkModalVehicle,
                clickupTaskId: manualTaskIdInput.trim()
            });

            if (!res.success) {
                throw new Error(res.error || "Erro ao vincular tarefa.");
            }

            const vKey = String(linkModalVehicle.vehicleExternalKey || "");
            setImportedTracking(prev => ({
                ...prev,
                [vKey]: {
                    taskId: res.data!.taskId,
                    status: res.data!.status,
                    statusColor: res.data!.statusColor
                }
            }));

            // Remove de seleções caso estivesse marcado
            setSelectedKeys(prev => prev.filter(k => k !== vKey));
            setLinkModalVehicle(null);
            alert("Veículo vinculado com sucesso à tarefa do ClickUp!");
        } catch (err: any) {
            alert("Erro ao vincular: " + err.message);
        } finally {
            setIsLinking(false);
        }
    };

    // Unlink Task
    const handleUnlink = async () => {
        if (!activeClient || !linkModalVehicle) return;
        if (!confirm("Deseja realmente desvincular este veículo da tarefa do ClickUp?")) return;
        setIsLinking(true);

        try {
            const vKey = String(linkModalVehicle.vehicleExternalKey || "");
            const res = await unlinkEstoqueVehicleAction({
                clienteId: activeClient.id,
                vehicleExternalKey: vKey
            });

            if (!res.success) {
                throw new Error(res.error || "Erro ao desvincular.");
            }

            setImportedTracking(prev => {
                const updated = { ...prev };
                delete updated[vKey];
                return updated;
            });

            setLinkModalVehicle(null);
            alert("Vínculo removido com sucesso!");
        } catch (err: any) {
            alert("Erro ao desvincular: " + err.message);
        } finally {
            setIsLinking(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            v.markName?.toLowerCase().includes(term) ||
            v.modelName?.toLowerCase().includes(term) ||
            v.versionName?.toLowerCase().includes(term) ||
            v.plate?.toLowerCase().includes(term) ||
            String(v.year)?.toLowerCase().includes(term)
        );
    });

    const unimportedCount = filteredVehicles.filter(v => !importedTracking[String(v.vehicleExternalKey)]).length;

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                        <Car className="w-5 h-5 text-indigo-400" />
                        Sincronizar Estoque Integrado
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {integratedClients.length === 0 ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-sm flex gap-2">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>Nenhum cliente possui integração de estoque configurada. Vá em Configurações Gerais - Gerenciar Clientes e adicione as credenciais de integração.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium mb-1 text-slate-300">Cliente</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    value={selectedClientId}
                                    onChange={(e) => {
                                        setSelectedClientId(e.target.value);
                                        setVehicles([]);
                                        setSelectedKeys([]);
                                        setImportedTracking({});
                                    }}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {integratedClients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Button 
                                onClick={handleSync} 
                                disabled={!selectedClientId || isLoading}
                                className="!bg-indigo-600 hover:!bg-indigo-700 !text-white w-full md:w-auto h-10"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Sincronizar Estoque
                            </Button>
                        </div>
                    )}
                    
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-sm">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {vehicles.length > 0 && (
                <div className="space-y-4">
                    {/* Toolbar Superior */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-slate-200">
                                Veículos no Estoque ({filteredVehicles.length})
                            </h2>
                            {selectedKeys.length > 0 && (
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                                    {selectedKeys.length} selecionado(s)
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Campo de Busca */}
                            <div className="relative min-w-[220px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input 
                                    placeholder="Buscar por modelo, marca..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-800 border-slate-700 pl-9 text-xs text-white h-9"
                                />
                            </div>

                            {/* Botão de Selecionar Todos Disponíveis */}
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-9"
                            >
                                {selectedKeys.length === unimportedCount && unimportedCount > 0 ? (
                                    <CheckSquare className="w-4 h-4 mr-1.5 text-indigo-400" />
                                ) : (
                                    <Square className="w-4 h-4 mr-1.5 text-slate-400" />
                                )}
                                Selecionar Disponíveis ({unimportedCount})
                            </Button>

                            {/* Botão de Importação em Lote */}
                            {selectedKeys.length > 0 && (
                                <Button 
                                    size="sm"
                                    onClick={() => {
                                        const selectedVehiclesList = vehicles.filter(v => selectedKeys.includes(String(v.vehicleExternalKey)));
                                        openImportModal(selectedVehiclesList);
                                    }}
                                    className="!bg-indigo-600 hover:!bg-indigo-700 !text-white text-xs h-9 font-semibold shadow-lg shadow-indigo-600/20"
                                >
                                    <UploadCloud className="w-4 h-4 mr-1.5" />
                                    Importar Selecionados ({selectedKeys.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* LISTAGEM EM LINHAS (Estilo Windows Explorer / Lista Moderna) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-3 w-10 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={selectedKeys.length === unimportedCount && unimportedCount > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                            />
                                        </th>
                                        <th className="py-3 px-3 w-16">Foto</th>
                                        <th className="py-3 px-4">Veículo / Modelo</th>
                                        <th className="py-3 px-4">Ano</th>
                                        <th className="py-3 px-4">Km</th>
                                        <th className="py-3 px-4">Preço</th>
                                        <th className="py-3 px-4">Placa</th>
                                        <th className="py-3 px-4">Status ClickUp</th>
                                        <th className="py-3 px-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredVehicles.map((v, idx) => {
                                        const vKey = String(v.vehicleExternalKey || idx);
                                        const pictures = parsePictures(v.pictureJs);
                                        const principalPic = pictures.find((p: any) => p.Principal === "true") || pictures[0];
                                        const isImported = !!importedTracking[vKey];
                                        const tracking = importedTracking[vKey];
                                        const isSelected = selectedKeys.includes(vKey);

                                        return (
                                            <tr 
                                                key={vKey} 
                                                className={cn(
                                                    "hover:bg-slate-800/40 transition-colors cursor-pointer group",
                                                    isSelected && "bg-indigo-950/20 hover:bg-indigo-950/30"
                                                )}
                                                onClick={() => setSelectedVehicle(v)}
                                            >
                                                {/* Checkbox */}
                                                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox"
                                                        disabled={isImported}
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectVehicle(vKey)}
                                                        className={cn(
                                                            "w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0",
                                                            isImported ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                                        )}
                                                    />
                                                </td>

                                                {/* Thumbnail */}
                                                <td className="py-3 px-3">
                                                    <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-800 border border-slate-700 relative shrink-0">
                                                        {principalPic ? (
                                                            <img 
                                                                src={principalPic.Link} 
                                                                alt="" 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                <ImageIcon className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        {pictures.length > 0 && (
                                                            <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] px-1 rounded text-white font-medium">
                                                                {pictures.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Modelo / Marca */}
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                                            {v.markName || "N/A"}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                                            {v.modelName}
                                                        </span>
                                                        {v.versionName && v.versionName !== v.modelName && (
                                                            <span className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                                                                {v.versionName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Ano */}
                                                <td className="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                                                    {v.year || "—"}
                                                </td>

                                                {/* Km */}
                                                <td className="py-3 px-4 text-slate-300 whitespace-nowrap text-xs">
                                                    {v.km ? `${v.km.toLocaleString('pt-BR')} km` : "0 km"}
                                                </td>

                                                {/* Preço */}
                                                <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                                                    {v.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.saleValue) : "Sob consulta"}
                                                </td>

                                                {/* Placa */}
                                                <td className="py-3 px-4 text-xs font-mono text-slate-400 uppercase whitespace-nowrap">
                                                    {v.plate && v.plate !== "N/A" ? v.plate : (v.finalPlate ? `Final ${v.finalPlate}` : "—")}
                                                </td>

                                                {/* Status no ClickUp */}
                                                <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    {isImported ? (
                                                        <div 
                                                            onClick={(e) => openLinkModal(v, e)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 cursor-pointer transition-colors group/status"
                                                            title="Clique para alterar ou desvincular a tarefa do ClickUp"
                                                        >
                                                            <span 
                                                                className="w-2 h-2 rounded-full shrink-0" 
                                                                style={{ backgroundColor: tracking.statusColor || "#6366f1" }}
                                                            />
                                                            <span className="capitalize">{tracking.status}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">#{tracking.taskId}</span>
                                                            <LinkIcon className="w-3 h-3 ml-0.5 opacity-0 group-hover/status:opacity-100 transition-opacity text-indigo-400" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => openLinkModal(v, e)}
                                                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors py-1 px-2 rounded-md hover:bg-slate-800 border border-transparent hover:border-slate-700"
                                                            title="Vincular este veículo a uma tarefa existente no ClickUp"
                                                        >
                                                            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                                                            <span>Vincular tarefa</span>
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Botão de Ação */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    {isImported ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-slate-700 bg-slate-800 text-slate-400 text-xs h-8 cursor-default opacity-60"
                                                            disabled
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                                            Importado
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openImportModal([v])}
                                                            className="!bg-indigo-600 hover:!bg-indigo-700 !text-white text-xs h-8 font-medium shadow-sm"
                                                        >
                                                            <UploadCloud className="w-3.5 h-3.5 mr-1" />
                                                            Importar
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE IMPORTAÇÃO (Formato em Linha Horizontal idêntico ao Adicionar Veículo) */}
            <Modal
                isOpen={importModalOpen}
                onClose={() => !isImporting && setImportModalOpen(false)}
                title={`Importar ${vehiclesToImport.length} veículo(s) para o ClickUp`}
                className="max-w-6xl w-[95vw]"
            >
                <div className="space-y-5 pt-2">
                    <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 flex items-start gap-2.5">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                        <div>
                            <p className="font-semibold mb-0.5">Mapeamento em Linhas por Veículo</p>
                            <p className="text-indigo-300/80">
                                Preencha ou revise as informações nas colunas abaixo. Cada linha possui seu próprio campo de <strong>Observações</strong> e a opção individual <strong>Contém Vídeo</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Tabela Horizontal de Linhas */}
                    <div className="overflow-x-auto w-full pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[60vh]">
                        <div className="min-w-max flex flex-col gap-2.5">
                            {/* Cabeçalho das Colunas */}
                            <div className="flex items-center gap-3 px-3 text-xs font-semibold text-slate-400 border-b border-white/10 pb-2">
                                <div className="w-16 shrink-0">Foto</div>
                                {activeClient?.columns.map((c: any) => {
                                    if (c.name.toLowerCase() === 'formato') return null;
                                    if (c.type !== 'text' && c.type !== 'checkbox') return null;
                                    return (
                                        <div key={c.id} className="w-44 shrink-0">
                                            {c.name}
                                        </div>
                                    );
                                })}
                                {!activeClient?.columns.some((col: any) => col.name.toLowerCase().includes('valor') || col.name.toLowerCase().includes('preço') || col.name.toLowerCase().includes('preco')) && (
                                    <div className="w-32 shrink-0">Valor (ClickUp)</div>
                                )}
                                <div className="w-56 shrink-0">Observações - GOS</div>
                                <div className="w-24 shrink-0 text-center">Contém Vídeo?</div>
                            </div>

                            {/* Linhas de Veículos */}
                            {vehiclesToImport.map((v) => {
                                const vKey = String(v.vehicleExternalKey);
                                const pics = parsePictures(v.pictureJs);
                                const principalPic = pics.find((p: any) => p.Principal === "true") || pics[0];
                                const fields = customTextFields[vKey] || {};

                                return (
                                    <div 
                                        key={vKey} 
                                        className="flex items-center gap-3 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/70 transition-colors"
                                    >
                                        {/* Foto / Miniatura */}
                                        <div className="w-16 shrink-0 flex items-center justify-center">
                                            <div className="w-14 h-10 rounded overflow-hidden bg-slate-900 border border-slate-700 relative shrink-0">
                                                {principalPic ? (
                                                    <img src={principalPic.Link} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                                {pics.length > 0 && (
                                                    <span className="absolute bottom-0 right-0 bg-black/70 text-[9px] px-1 rounded-tl text-white">
                                                        {pics.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Colunas personalizadas do cliente */}
                                        {activeClient?.columns.map((c: any) => {
                                            if (c.name.toLowerCase() === 'formato') return null;
                                            if (c.type !== 'text' && c.type !== 'checkbox') return null;

                                            return (
                                                <div key={c.id} className="w-44 shrink-0">
                                                    {c.type === "checkbox" ? (
                                                        <div className="flex items-center gap-3 h-9 px-2 bg-slate-900/60 border border-slate-700/60 rounded">
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-indigo-600"
                                                                    checked={(fields[c.id] || "").includes("Stories")}
                                                                    onChange={(e) => {
                                                                        let current = fields[c.id] ? fields[c.id].split(', ') : [];
                                                                        if (e.target.checked) { if (!current.includes("Stories")) current.push("Stories"); }
                                                                        else { current = current.filter(x => x !== "Stories"); }
                                                                        const newVal = current.join(', ');
                                                                        setCustomTextFields(prev => ({
                                                                            ...prev,
                                                                            [vKey]: { ...prev[vKey], [c.id]: newVal }
                                                                        }));
                                                                    }}
                                                                /> Stories
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-indigo-600"
                                                                    checked={(fields[c.id] || "").includes("Feed")}
                                                                    onChange={(e) => {
                                                                        let current = fields[c.id] ? fields[c.id].split(', ') : [];
                                                                        if (e.target.checked) { if (!current.includes("Feed")) current.push("Feed"); }
                                                                        else { current = current.filter(x => x !== "Feed"); }
                                                                        const newVal = current.join(', ');
                                                                        setCustomTextFields(prev => ({
                                                                            ...prev,
                                                                            [vKey]: { ...prev[vKey], [c.id]: newVal }
                                                                        }));
                                                                    }}
                                                                /> Feed
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <Input 
                                                            type="text" 
                                                            className="h-9 bg-slate-900 border-slate-700 text-xs text-white" 
                                                            value={fields[c.id] || ''} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setCustomTextFields(prev => ({
                                                                    ...prev,
                                                                    [vKey]: { ...prev[vKey], [c.id]: val }
                                                                }));
                                                            }} 
                                                            placeholder={`${c.name}`} 
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Valor extra (caso o cliente não tenha coluna de valor) */}
                                        {!activeClient?.columns.some((col: any) => col.name.toLowerCase().includes('valor') || col.name.toLowerCase().includes('preço') || col.name.toLowerCase().includes('preco')) && (
                                            <div className="w-32 shrink-0">
                                                <Input 
                                                    className="h-9 bg-slate-900 border-slate-700 text-xs text-white" 
                                                    value={fields["_extraValor"] || ''} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCustomTextFields(prev => ({
                                                            ...prev,
                                                            [vKey]: { ...prev[vKey], _extraValor: val }
                                                        }));
                                                    }} 
                                                    placeholder="R$ 0,00" 
                                                />
                                            </div>
                                        )}

                                        {/* Observações - GOS por linha */}
                                        <div className="w-56 shrink-0">
                                            <Input 
                                                className="h-9 bg-slate-900 border-slate-700 text-xs text-white" 
                                                value={importObservacoesMap[vKey] || ''} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setImportObservacoesMap(prev => ({ ...prev, [vKey]: val }));
                                                }} 
                                                placeholder="Observações GOS..." 
                                            />
                                        </div>

                                        {/* Contém Vídeo por linha */}
                                        <div className="w-24 shrink-0 flex items-center justify-center h-9 bg-slate-900/60 border border-slate-700/60 rounded">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300 w-full h-full justify-center select-none">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                                                    checked={!!importContemVideoMap[vKey]} 
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setImportContemVideoMap(prev => ({ ...prev, [vKey]: checked }));
                                                    }} 
                                                />
                                                Sim
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rodapé / Botão de Confirmação */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                        <Button 
                            variant="outline" 
                            onClick={() => setImportModalOpen(false)}
                            disabled={isImporting}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleExecuteImport}
                            disabled={isImporting}
                            className="!bg-indigo-600 hover:!bg-indigo-700 !text-white font-semibold"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importando para o ClickUp...
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-4 h-4 mr-2" />
                                    Confirmar Importação ({vehiclesToImport.length})
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL DE DETALHES DO VEÍCULO (Ao clicar na linha) */}
            {selectedVehicle && (
                <Modal
                    isOpen={!!selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    title={`${selectedVehicle.markName} ${selectedVehicle.modelName}`}
                    className="max-w-4xl h-[90vh]"
                >
                    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">
                                    {selectedVehicle.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVehicle.saleValue) : "Sob consulta"}
                                </h2>
                                <p className="text-slate-300 font-medium text-sm mb-0.5">
                                    {selectedVehicle.versionName}
                                </p>
                                <p className="text-slate-400 text-xs">
                                    {selectedVehicle.year} - {selectedVehicle.km?.toLocaleString('pt-BR')} km - {selectedVehicle.color}
                                </p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                {!importedTracking[String(selectedVehicle.vehicleExternalKey)] ? (
                                    <Button 
                                        onClick={() => openImportModal([selectedVehicle])}
                                        className="!bg-indigo-600 hover:!bg-indigo-700 !text-white w-full md:w-auto font-semibold shadow-md"
                                    >
                                        <UploadCloud className="w-4 h-4 mr-2" />
                                        Importar Veículo
                                    </Button>
                                ) : (
                                    <div className="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>ClickUp: #{importedTracking[String(selectedVehicle.vehicleExternalKey)].taskId}</span>
                                    </div>
                                )}

                                <Button 
                                    onClick={() => handleDownloadImages(parsePictures(selectedVehicle.pictureJs))}
                                    disabled={isDownloading || parsePictures(selectedVehicle.pictureJs).length === 0}
                                    variant="outline"
                                    className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 w-full md:w-auto"
                                >
                                    {isDownloading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Baixar Fotos ({parsePictures(selectedVehicle.pictureJs).length})
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Câmbio</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.transmissionName || "N/A"}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Combustível</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.fuelName || "N/A"}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Placa / Final</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.plate || (selectedVehicle.finalPlate ? `Final ${selectedVehicle.finalPlate}` : "N/A")}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Categoria</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.subCategoryName || "N/A"}</p>
                            </div>
                        </div>

                        {/* Opcionais / Itens */}
                        {parseItems(selectedVehicle.itemJs).length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-2">Opcionais do Veículo</h3>
                                <div className="flex flex-wrap gap-2">
                                    {parseItems(selectedVehicle.itemJs).map((item: any, idx: number) => (
                                        <span key={idx} className="bg-slate-800/80 border border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-md">
                                            {typeof item === 'string' ? item : (item.value || item.Descricao || item.name || item.descricao || JSON.stringify(item))}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedVehicle.description && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-2">Descrição do Anúncio</h3>
                                <div className="bg-slate-800/30 p-4 rounded-lg text-sm text-slate-400 whitespace-pre-wrap border border-slate-700/30">
                                    {selectedVehicle.description}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2 text-indigo-400" />
                                Galeria de Imagens
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {parsePictures(selectedVehicle.pictureJs).map((pic: any, i: number) => (
                                    <div key={i} className="aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-slate-700 relative group">
                                        <img 
                                            src={pic.Link} 
                                            alt={`Foto ${i + 1}`} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                className="h-8 w-8 !bg-indigo-600 hover:!bg-indigo-700 !text-white shadow-lg"
                                                onClick={() => downloadSingleImage(pic.Link, i)}
                                                disabled={downloadingSingle === i}
                                            >
                                                {downloadingSingle === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                                            {i + 1}
                                        </div>
                                    </div>
                                ))}
                                {parsePictures(selectedVehicle.pictureJs).length === 0 && (
                                    <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                                        Nenhuma imagem disponível para este veículo.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL PARA VINCULAR TAREFA DO CLICKUP */}
            {linkModalVehicle && (
                <Modal
                    isOpen={!!linkModalVehicle}
                    onClose={() => !isLinking && setLinkModalVehicle(null)}
                    title="Vincular Tarefa do ClickUp"
                    className="max-w-md"
                >
                    <div className="space-y-4 pt-2">
                        <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs text-slate-300 space-y-1">
                            <p className="font-bold text-white text-sm">
                                {linkModalVehicle.markName} {linkModalVehicle.modelName}
                            </p>
                            <p className="text-slate-400">
                                {linkModalVehicle.year} • {linkModalVehicle.km ? `${linkModalVehicle.km.toLocaleString('pt-BR')} km` : '0 km'} • {linkModalVehicle.plate || 'Sem placa'}
                            </p>
                            <p className="text-emerald-400 font-semibold pt-1">
                                {linkModalVehicle.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(linkModalVehicle.saleValue) : 'Sob consulta'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                ID da Tarefa do ClickUp ou Link da Tarefa
                            </label>
                            <Input 
                                placeholder="Ex: 86akrwxt9 ou https://app.clickup.com/t/..."
                                value={manualTaskIdInput}
                                onChange={(e) => setManualTaskIdInput(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-white text-sm h-10"
                                autoFocus
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Você pode colar apenas o ID da tarefa (ex: 86akrwxt9) ou o link completo do ClickUp.
                            </p>
                        </div>

                        {importedTracking[String(linkModalVehicle.vehicleExternalKey)] && (
                            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs text-indigo-300 flex items-center justify-between">
                                <span>Atualmente vinculado a: <strong>#{importedTracking[String(linkModalVehicle.vehicleExternalKey)].taskId}</strong></span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleUnlink}
                                    disabled={isLinking}
                                    className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Unlink className="w-3.5 h-3.5 mr-1" />
                                    Desvincular
                                </Button>
                            </div>
                        )}

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                            <Button
                                variant="outline"
                                onClick={() => setLinkModalVehicle(null)}
                                disabled={isLinking}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmLink}
                                disabled={isLinking || !manualTaskIdInput.trim()}
                                className="!bg-indigo-600 hover:!bg-indigo-700 !text-white font-semibold"
                            >
                                {isLinking ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Vinculando...
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4 mr-2" />
                                        Salvar Vínculo
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
