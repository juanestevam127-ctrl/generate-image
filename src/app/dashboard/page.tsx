"use client";

import { useState } from "react";
import { useStore, Client } from "@/lib/store-context";
import { ClientManager } from "@/components/features/ClientManager";
import { DynamicTable } from "@/components/features/DynamicTable";
import { ImageEditor } from "@/components/features/ImageEditor";
import { Button } from "@/components/ui/button";
import { Settings, Send, Loader2, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserManager } from "@/components/features/UserManager";
import { PostScheduler } from "@/components/features/PostScheduler";

export default function DashboardPage() {
    const { user, clients } = useStore();
    const [viewMode, setViewMode] = useState<"generator" | "scheduler" | "admin">("generator");

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
        // Handle single file (take the first one)
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (e.target?.result) {
                    const base64Str = e.target.result as string;

                    // Upload to 'temp-files' (root) immediately
                    // Dynamic import to avoid SSR issues if any, though likely fine as static
                    const { uploadImage } = await import("@/lib/supabase");
                    const publicUrl = await uploadImage(base64Str, 'temp-files', '');

                    if (publicUrl) {
                        setTableData(prev => {
                            const newData = [...prev];
                            const currentRow = { ...newData[row] };
                            currentRow[col] = publicUrl; // Update with Public URL
                            newData[row] = currentRow;
                            return newData;
                        });

                        // Auto-open Editor with the persistent URL
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
            currentRow[col] = ""; // Clear string
            newData[row] = currentRow;
            return newData;
        });
    };

    const handleEditorSave = async (processedImage: string) => {
        if (editorState.Target) {
            const { row, col } = editorState.Target;

            // Upload processed image to 'temp-files' bucket (root)
            const { uploadImage } = await import("@/lib/supabase");
            const publicUrl = await uploadImage(processedImage, 'temp-files', '');

            if (publicUrl) {
                setTableData(prev => {
                    const newData = [...prev];
                    const currentRow = { ...newData[row] };
                    currentRow[col] = publicUrl; // Update with new AI URL
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
            console.log("1. Starting processing...");

            // Data is already uploaded, just pass it through
            // We keep the map just to ensure structure consistency or if we need last minute checks
            const processedData = tableData.map(row => ({ ...row }));

            const payload = {
                client: activeClient.name,
                data: processedData,
                timestamp: new Date().toISOString()
            };

            console.log("2. Sending to proxy API...", activeClient.webhookUrl);

            // Execute request via proxy to avoid CORS
            const proxyUrl = "/api/proxy-webhook";
            const res = await fetch(proxyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: activeClient.webhookUrl,
                    payload: payload
                })
            }).catch(fetchErr => {
                console.error("Fetch API Error:", fetchErr);
                throw new Error("Erro de Conexão com a API Interna: " + fetchErr.message);
            });

            console.log("3. Proxy Response Status:", res.status);

            if (res.ok) {
                setSubmitStatus("success");
                // Clear table
                setTableData([]);
                setTimeout(() => setSubmitStatus("idle"), 3000);
            } else {
                const errorText = await res.text();
                console.error("Webhook Error Status:", res.status, "Body:", errorText);
                alert(`Erro no Webhook (Status ${res.status}): ${errorText}`);
                setSubmitStatus("error");
            }

        } catch (e) {
            console.error("DEBUG - Complete Error object:", e);
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
                        {viewMode === "admin" ? "Adminstração" : viewMode === "scheduler" ? "Agendar Postagens" : "Gerenciamento de Imagens"}
                        {viewMode === "generator" && <Sparkles className="ml-2 text-yellow-400 w-6 h-6 animate-pulse" />}
                    </h1>
                    <p className="text-muted-foreground">
                        {viewMode === "admin"
                            ? "Gerencie seus clientes e a estrutura de dados."
                            : viewMode === "scheduler"
                                ? "Organize e publique o conteúdo gerado."
                                : "Automação e gestão completa de imagens."}
                    </p>
                </div>

                <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex self-start md:self-auto space-x-1">
                    <button
                        onClick={() => setViewMode("generator")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "generator" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
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

            <div className="mt-8 animate-in fade-in duration-500">
                {viewMode === "admin" ? (
                    <div className="space-y-12">
                        <ClientManager />
                        <div className="border-t border-white/10" />
                        <UserManager />
                    </div>
                ) : viewMode === "scheduler" ? (
                    <div className="space-y-6">
                        {/* Simply reuse client selector logic or just show dropdown if needed, 
                            but based on user request "a mesma coisa (lista de clientes)"
                            so we'll reuse the selector UI or similar. 
                            Let's wrap the selector in a component to reuse? 
                            Or just duplicate the simple select for now to save time/complexity. 
                        */}
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
                                            {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
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
                                        {activeClient.webhookPostagens ? (
                                            <p className="text-xs text-green-300 bg-green-500/10 px-2 py-1 rounded inline-block">
                                                Postagens: ...{activeClient.webhookPostagens.slice(-15)}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded inline-block">
                                                Webhook de Postagens não configurado!
                                            </p>
                                        )}
                                    </div>
                                )}
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
                    <div className="space-y-6">
                        {/* Client Selector */}
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
                                                setTableData([]); // Reset data on client switch
                                            }}
                                        >
                                            <option value="" disabled>-- Escolha uma empresa --</option>
                                            {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
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
        </div>
    );
}
