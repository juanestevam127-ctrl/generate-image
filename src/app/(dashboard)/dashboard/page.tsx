"use client";

import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { ClientManager } from "@/components/features/ClientManager";
import { DynamicTable } from "@/components/features/DynamicTable";
import { ImageEditor } from "@/components/features/ImageEditor";
import { Button } from "@/components/ui/button";
import { Settings, Send, Loader2, Sparkles, CheckCircle, AlertCircle, BarChart3, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserManager } from "@/components/features/UserManager";
import { PostScheduler } from "@/components/features/PostScheduler";
import AnalyticsView from "@/components/dashboard/AnalyticsView";
import { uploadImage } from "@/lib/supabase";
import { Modal } from "@/components/ui/modal";

export default function DashboardPage() {
    const { user, clients } = useStore();
    const [viewMode, setViewMode] = useState<"analytics" | "generator" | "scheduler" | "admin">("analytics");
    const [previewImage, setPreviewImage] = useState<{ url: string, title: string } | null>(null);

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

    const activeClient = clients.find((c) => c.id === selectedClientId);

    const handleImageUpload = async (row: number, col: string, files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (e.target?.result) {
                    const base64Str = e.target.result as string;
                    const publicUrl = await uploadImage(base64Str, 'temp-files');
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
                        alert("Erro ao fazer upload da imagem via servidor.");
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
            const publicUrl = await uploadImage(processedImage, 'temp-files');
            if (publicUrl) {
                setTableData(prev => {
                    const newData = [...prev];
                    const currentRow = { ...newData[row] };
                    currentRow[col] = publicUrl;
                    newData[row] = currentRow;
                    return newData;
                });
                setEditorState({ isOpen: false, imageUrl: null, Target: null });
            } else {
                alert("Erro ao salvar imagem processada via servidor.");
            }
        }
    };

    const handleGenerate = async () => {
        if (!activeClient) return;
        if (tableData.length === 0) return alert("A tabela está vazia.");

        const checkboxCols = activeClient.columns.filter(col => col.type === "checkbox");
        for (let i = 0; i < tableData.length; i++) {
            const row = tableData[i];
            for (const col of checkboxCols) {
                const value = row[col.id];
                if (!value || String(value).trim() === "") {
                    return alert(`Erro na linha ${i + 1}: Você precisa selecionar pelo menos uma opção na coluna "${col.name}".`);
                }
            }
        }

        setIsSubmitting(true);
        setSubmitStatus("idle");

        try {
            const payload = {
                client: activeClient.name,
                data: tableData,
                timestamp: new Date().toISOString()
            };

            const res = await fetch("/api/proxy-webhook", {
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
                setSubmitStatus("error");
            }
        } catch (e) {
            console.error(e);
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
                        {viewMode === "analytics" ? "Dashboard" :
                            viewMode === "admin" ? "Adminstração" :
                                viewMode === "scheduler" ? "Agendar Postagens" :
                                    "Gerenciamento de Imagens"}
                        {viewMode === "generator" && <Sparkles className="ml-2 text-yellow-400 w-6 h-6 animate-pulse" />}
                    </h1>
                    <p className="text-muted-foreground">
                        {viewMode === "analytics" ? "Métricas e performance." : viewMode === "admin" ? "Gerencie seus clientes e a estrutura de dados." : viewMode === "scheduler" ? "Agendar e organizar postagens." : "Automação e gestão de imagens."}
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
                    <button
                        onClick={() => setViewMode("scheduler")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "scheduler" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        Agendar
                    </button>
                    {user.role === "master" && (
                        <button
                            onClick={() => setViewMode("admin")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "admin" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            Configuração
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8">
                {viewMode === "analytics" ? (
                    <AnalyticsView />
                ) : viewMode === "admin" ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        <ClientManager />
                        <div className="border-t border-white/10" />
                        <UserManager />
                    </div>
                ) : viewMode === "scheduler" ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/3">
                                    <label className="text-sm font-medium text-gray-300 mb-2 block">Selecione o Cliente para Agendar</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                            value={selectedClientId}
                                            onChange={(e) => setSelectedClientId(e.target.value)}
                                        >
                                            <option value="" disabled>-- Escolha uma empresa --</option>
                                            {[...clients]
                                                .filter(c => c.clienteAtivo !== false)
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                        </select>
                                        <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                                            <Settings size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {selectedClientId && activeClient ? (
                            <PostScheduler client={activeClient} />
                        ) : (
                            <div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p>Selecione um cliente para visualizar as imagens.</p>
                            </div>
                        )}
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
                                            {[...clients]
                                                .filter(c => c.clienteAtivo !== false)
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                        </select>
                                        <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                                            <Settings size={14} />
                                        </div>
                                    </div>
                                </div>

                                {activeClient && (
                                    <div className="flex-1 pb-1 flex flex-col gap-1">
                                        <p className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded inline-block self-start">
                                            Webhook Ativo: ...{activeClient.webhookUrl.slice(-15)}
                                        </p>
                                        {(activeClient.guideStories || activeClient.guideFeed) && (
                                            <div className="flex gap-2 mt-1">
                                                {activeClient.guideStories && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[10px] bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
                                                        onClick={() => setPreviewImage({ url: activeClient.guideStories!, title: `Guia Stories - ${activeClient.name}` })}
                                                    >
                                                        <ImageIcon className="w-3 h-3 mr-1" /> Guia Stories
                                                    </Button>
                                                )}
                                                {activeClient.guideFeed && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[10px] bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"
                                                        onClick={() => setPreviewImage({ url: activeClient.guideFeed!, title: `Guia Feed - ${activeClient.name}` })}
                                                    >
                                                        <ImageIcon className="w-3 h-3 mr-1" /> Guia Feed
                                                    </Button>
                                                )}
                                            </div>
                                        )}
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
                                        {isSubmitting ? "Enviando..." : submitStatus === 'success' ? "Enviado!" : submitStatus === 'error' ? "Erro (Tentar Novamente)" : "Gerar Imagens"}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {selectedClientId && activeClient ? (
                            <DynamicTable
                                client={activeClient}
                                data={tableData}
                                onChange={setTableData}
                                onImageUpload={handleImageUpload}
                                onEditImage={handleEditImage}
                                onRemoveImage={handleRemoveImage}
                            />
                        ) : (
                            <div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p>Selecione um cliente para começar.</p>
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

            <Modal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                title={previewImage?.title || "Visualizar Guia"}
                className="max-w-4xl"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-full relative overflow-hidden rounded-lg border border-border bg-black/40">
                        {previewImage && (
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-h-[70vh] w-auto mx-auto object-contain"
                            />
                        )}
                    </div>
                    <Button onClick={() => setPreviewImage(null)}>Fechar</Button>
                </div>
            </Modal>
        </div>
    );
}
