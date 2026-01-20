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
        Target: { row: number; col: string } | null;
    }>({ isOpen: false, imageUrl: null, Target: null });

    if (!user) return null;

    const activeClient = clients.find((c) => c.id === selectedClientId);

    const handleImageUpload = (row: number, col: string, file: File) => {
        // Read file to dataURL
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setEditorState({
                    isOpen: true,
                    imageUrl: e.target.result as string,
                    Target: { row, col },
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleEditImage = (row: number, col: string, url: string) => {
        setEditorState({
            isOpen: true,
            imageUrl: url,
            Target: { row, col },
        });
    };

    const handleEditorSave = (processedImage: string) => {
        if (editorState.Target) {
            const { row, col } = editorState.Target;
            const newData = [...tableData];
            newData[row] = { ...newData[row], [col]: processedImage };
            setTableData(newData);
        }
    };

    const handleGenerate = async () => {
        if (!activeClient) return;
        if (tableData.length === 0) return alert("A tabela está vazia.");

        setIsSubmitting(true);
        setSubmitStatus("idle");

        try {
            // Process Uploads First
            const processedData = await Promise.all(tableData.map(async (row) => {
                const newRow = { ...row };
                const columnIds = Object.keys(newRow);

                for (const colId of columnIds) {
                    const value = newRow[colId];
                    // Check if value is a Base64 Image string
                    if (typeof value === 'string' && value.startsWith("data:image")) {
                        // Dynamically import to avoid server-side issues if any
                        const { uploadImage } = await import("@/lib/supabase");
                        const publicUrl = await uploadImage(value, process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'images');

                        if (publicUrl) {
                            newRow[colId] = publicUrl;
                        } else {
                            console.error("Failed to upload image for col", colId);
                            // Fallback? Keep base64 or fail? 
                            // Keeping base64 might break webhook, but better than losing data?
                            // Let's assume failure means we shouldn't send.
                            throw new Error("Falha no upload da imagem. Verifique as credenciais.");
                        }
                    }
                }
                return newRow;
            }));

            const payload = {
                client: activeClient.name,
                data: processedData,
                timestamp: new Date().toISOString()
            };

            console.log("Sending payload to", activeClient.webhookUrl, payload);

            // Execute request
            const res = await fetch(activeClient.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSubmitStatus("success");
                // Clear table
                setTableData([]);
                setTimeout(() => setSubmitStatus("idle"), 3000);
            } else {
                console.error("Webhook Error", res.status, await res.text());
                setSubmitStatus("error");
            }

        } catch (e) {
            console.error("Process Error", e);
            alert("Erro: " + (e as Error).message);
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
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "generator" ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
                    >
                        Operação
                    </button>
                    <button
                        onClick={() => setViewMode("scheduler")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "scheduler" ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
                    >
                        Agendar
                    </button>
                    {user.role === "master" && (
                        <button
                            onClick={() => setViewMode("admin")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === "admin" ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
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
                                        className={`w-full md:w-auto shadow-lg transition-all ${submitStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
