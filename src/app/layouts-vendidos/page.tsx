"use client";

import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { LayoutClientManager } from "@/components/features/LayoutClientManager";
import { LayoutDynamicTable } from "@/components/features/LayoutDynamicTable";
import { ImageEditor } from "@/components/features/ImageEditor";
import { Button } from "@/components/ui/button";
import { Settings, Send, Loader2, Sparkles, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import LayoutAnalyticsView from "@/components/dashboard/LayoutAnalyticsView";

export default function LayoutsVendidosPage() {
    const { user, layoutClients } = useStore();
    const [viewMode, setViewMode] = useState<"analytics" | "generator" | "admin">("analytics");

    // Generator State
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [tableData, setTableData] = useState<Record<string, any>[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

    // Image Editor State
    const [editorState, setEditorState] = useState<{
        isOpen: boolean;
        imageUrl: string | null;
        Target: { row: number; col: string; index: number } | null;
    }>({ isOpen: false, imageUrl: null, Target: null });

    if (!user) return null;

    const activeClient = layoutClients.find((c) => c.id === selectedClientId);

    const handleImageUpload = async (row: number, col: string, files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (e.target?.result) {
                    const base64Str = e.target.result as string;
                    const { uploadImage } = await import("@/lib/supabase");
                    const publicUrl = await uploadImage(base64Str, 'temp-files', '');

                    if (publicUrl) {
                        setTableData(prev => {
                            const newData = [...prev];
                            const currentRow = { ...newData[row] };
                            currentRow[col] = publicUrl;
                            newData[row] = currentRow;
                            return newData;
                        });

                        setEditorState({
                            isOpen: true,
                            imageUrl: publicUrl,
                            Target: { row, col, index: 0 }
                        });
                    } else {
                        alert("Erro ao fazer upload da imagem.");
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditImage = (row: number, col: string, url: string, index: number) => {
        setEditorState({
            isOpen: true,
            imageUrl: url,
            Target: { row, col, index },
        });
    };

    const handleRemoveImage = (row: number, col: string, index: number) => {
        setTableData(prev => {
            const newData = [...prev];
            const currentRow = { ...newData[row] };
            currentRow[col] = "";
            newData[row] = currentRow;
            return newData;
        });
    };

    const handleEditorSave = async (processedImage: string) => {
        if (editorState.Target) {
            const { row, col } = editorState.Target;
            const { uploadImage } = await import("@/lib/supabase");
            const publicUrl = await uploadImage(processedImage, 'temp-files', '');

            if (publicUrl) {
                setTableData(prev => {
                    const newData = [...prev];
                    const currentRow = { ...newData[row] };
                    currentRow[col] = publicUrl;
                    newData[row] = currentRow;
                    return newData;
                });
            } else {
                alert("Erro ao salvar imagem processada.");
            }
        }
    };

    const handleGenerate = async () => {
        if (!activeClient) return;
        if (tableData.length === 0) return alert("A tabela está vazia.");

        setIsSubmitting(true);
        setSubmitStatus("idle");

        try {
            const payload = {
                client: activeClient.name,
                data: tableData,
                timestamp: new Date().toISOString()
            };

            const proxyUrl = "/api/proxy-webhook";
            const res = await fetch(proxyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: activeClient.webhookUrl,
                    payload: payload
                })
            });

            if (res.ok) {
                setSubmitStatus("success");
                setTableData([]);
                setTimeout(() => setSubmitStatus("idle"), 3000);
            } else {
                const errorText = await res.text();
                alert(`Erro no Webhook (Status ${res.status}): ${errorText}`);
                setSubmitStatus("error");
            }
        } catch (e) {
            alert("Erro Detalhado: " + (e as Error).message);
            setSubmitStatus("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center">
                        {viewMode === "analytics" ? "Layouts Vendidos: Dashboard" :
                            viewMode === "admin" ? "Layouts Vendidos: Configuração" :
                                "Layouts Vendidos: Operação"}
                        <Sparkles className="ml-2 text-indigo-400 w-6 h-6 animate-pulse" />
                    </h1>
                    <p className="text-muted-foreground">
                        {viewMode === "analytics"
                            ? "Acompanhe as métricas de layouts gerados."
                            : viewMode === "admin"
                                ? "Configure seus clientes e modelos de layout."
                                : "Gere e dispare layouts para seus clientes."}
                    </p>
                </div>

                <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex self-start md:self-auto space-x-1 overflow-x-auto max-w-full">
                    <button
                        onClick={() => setViewMode("analytics")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "analytics" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setViewMode("generator")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "generator" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Operação
                    </button>
                    {user.role === "master" && (
                        <button
                            onClick={() => setViewMode("admin")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "admin" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            <Settings className="w-4 h-4" />
                            Configuração
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8">
                {viewMode === "analytics" ? (
                    <LayoutAnalyticsView />
                ) : viewMode === "admin" ? (
                    <div className="animate-in fade-in duration-500">
                        <LayoutClientManager />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-indigo-500/20">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/3">
                                    <label className="text-sm font-medium text-gray-300 mb-2 block">Selecione o Cliente</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                            value={selectedClientId}
                                            onChange={(e) => {
                                                setSelectedClientId(e.target.value);
                                                setTableData([]);
                                            }}
                                        >
                                            <option value="" disabled>-- Escolha uma empresa --</option>
                                            {[...layoutClients].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                                            <Settings size={14} />
                                        </div>
                                    </div>
                                </div>

                                {activeClient && (
                                    <div className="flex-1 pb-1">
                                        <p className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded inline-block">
                                            Webhook Ativo: ...{activeClient.webhookUrl.slice(-15)}
                                        </p>
                                    </div>
                                )}

                                <div className="w-full md:w-auto">
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={!activeClient || isSubmitting || tableData.length === 0}
                                        className={`w-full md:w-auto shadow-lg transition-all !text-slate-950 font-bold ${submitStatus === 'success' ? '!bg-green-400 hover:!bg-green-500' : '!bg-indigo-400 hover:!bg-indigo-500'}`}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : submitStatus === 'success' ? (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                        ) : submitStatus === 'error' ? (
                                            <AlertCircle className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Send className="w-4 h-4 mr-2" />
                                        )}
                                        {isSubmitting ? "Enviando..." : submitStatus === 'success' ? "Enviado!" : submitStatus === 'error' ? "Erro (Tentar Novamente)" : "Gerar Layouts"}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {selectedClientId && activeClient ? (
                            <LayoutDynamicTable
                                client={activeClient}
                                data={tableData}
                                onChange={setTableData}
                                onImageUpload={handleImageUpload}
                                onEditImage={handleEditImage}
                                onRemoveImage={handleRemoveImage}
                            />
                        ) : (
                            <div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p>Selecione um cliente para começar o preenchimento.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ImageEditor
                isOpen={editorState.isOpen}
                onClose={() => setEditorState(prev => ({ ...prev, isOpen: false }))}
                imageUrl={editorState.imageUrl}
                onSave={handleEditorSave}
            />
        </div>
    );
}
