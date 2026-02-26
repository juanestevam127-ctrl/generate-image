"use client";

import { useEffect, useState } from "react";
import { useStore, LayoutClient } from "@/lib/store-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Send,
    CheckCircle,
    XCircle,
    Loader2,
    RefreshCcw,
    History,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface TriggerStatus {
    status: "idle" | "loading" | "success" | "error";
    lastResult?: string;
    timestamp?: string;
}

export default function LayoutOperationPage() {
    const { layoutClients } = useStore();
    const [statuses, setStatuses] = useState<Record<string, TriggerStatus>>({});

    // Fetch last trigger statuses for all clients on mount
    useEffect(() => {
        const fetchLastStatuses = async () => {
            if (layoutClients.length === 0) return;

            const { data, error } = await supabase
                .from("design_online_layouts_disparos")
                .select("id, cliente_id, status, created_at")
                .in("cliente_id", layoutClients.map(c => c.id))
                .order("created_at", { ascending: false });

            if (!error && data) {
                const latestMap: Record<string, TriggerStatus> = {};
                // Since data is ordered by created_at DESC, we only take the first one for each client
                data.forEach(log => {
                    if (!latestMap[log.cliente_id]) {
                        latestMap[log.cliente_id] = {
                            status: log.status === "success" ? "success" : "error",
                            timestamp: new Date(log.created_at).toLocaleString('pt-BR'),
                        };
                    }
                });
                setStatuses(prev => ({ ...prev, ...latestMap }));
            }
        };

        fetchLastStatuses();
    }, [layoutClients]);

    const handleTrigger = async (client: LayoutClient) => {
        setStatuses(prev => ({ ...prev, [client.id]: { status: "loading" } }));

        const payload = {
            nome_cliente: client.nome_cliente,
            instagram_user_id: client.instagram_user_id,
            instagram_token: client.instagram_token,
            facebook_user_id: client.facebook_user_id,
            facebook_token: client.facebook_token,
            modelo_feed_id: client.modelo_feed_id,
            modelo_stories_id: client.modelo_stories_id,
            tabela: {
                texto: client.texto,
                imagem_url: client.imagem_url,
                checkbox_ativo: client.checkbox_ativo
            },
            json_cliente: client.json_cliente
        };

        try {
            const res = await fetch("/api/proxy-webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: client.webhook_url,
                    payload: payload
                })
            });

            const status = res.ok ? "success" : "error";
            const timestamp = new Date().toLocaleString('pt-BR');

            // Log to Supabase
            await supabase.from("design_online_layouts_disparos").insert([{
                cliente_id: client.id,
                nome_cliente: client.nome_cliente,
                status: status,
                payload: payload,
                error_message: res.ok ? null : await res.text()
            }]);

            setStatuses(prev => ({
                ...prev,
                [client.id]: { status, timestamp }
            }));

        } catch (error) {
            console.error(error);
            const timestamp = new Date().toLocaleString('pt-BR');
            setStatuses(prev => ({
                ...prev,
                [client.id]: { status: "error", timestamp, lastResult: (error as Error).message }
            }));
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Operação de Layouts</h1>
                <p className="text-muted-foreground">Dispare webhooks manualmente para cada cliente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {layoutClients.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <p className="text-gray-500">Nenhum cliente cadastrado. Vá em Configuração para adicionar.</p>
                    </div>
                ) : (
                    layoutClients.map(client => {
                        const s = statuses[client.id] || { status: "idle" };

                        return (
                            <Card key={client.id} className="p-6 bg-gray-900/60 border-white/10 hover:border-indigo-500/40 transition-all flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-1">{client.nome_cliente}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                                            <span className="truncate max-w-[150px]">{client.webhook_url}</span>
                                        </div>
                                    </div>
                                    {s.status !== "idle" && (
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                            s.status === "success" ? "bg-green-500/10 text-green-400" :
                                                s.status === "error" ? "bg-red-500/10 text-red-400" :
                                                    s.status === "loading" ? "bg-indigo-500/10 text-indigo-400" : ""
                                        )}>
                                            {s.status === "success" && <CheckCircle size={12} />}
                                            {s.status === "error" && <XCircle size={12} />}
                                            {s.status === "loading" && <RefreshCcw size={12} className="animate-spin" />}
                                            {s.status === "success" ? "Disparado" : s.status === "error" ? "Erro" : "Processando"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3 mt-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5">
                                        <div className="w-12 h-12 rounded bg-gray-800 overflow-hidden">
                                            {client.imagem_url ? (
                                                <img src={client.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <History size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[11px] text-gray-500 mb-1">Conteúdo principal:</p>
                                            <p className="text-xs text-gray-300 truncate">{client.texto || "Nenhum texto definido"}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded bg-white/5 border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Modelo Feed</p>
                                            <p className="text-xs text-white font-mono truncate">{client.modelo_feed_id || "N/A"}</p>
                                        </div>
                                        <div className="p-2 rounded bg-white/5 border border-white/5">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Modelo Stories</p>
                                            <p className="text-xs text-white font-mono truncate">{client.modelo_stories_id || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-gray-500">Último envio:</span>
                                        <span className="text-gray-400">{s.timestamp || "Nunca"}</span>
                                    </div>

                                    <Button
                                        onClick={() => handleTrigger(client)}
                                        disabled={s.status === "loading"}
                                        className={cn(
                                            "w-full font-bold shadow-lg transition-all",
                                            s.status === "success" ? "bg-green-500 hover:bg-green-600 text-white" :
                                                s.status === "error" ? "bg-red-500 hover:bg-red-600 text-white" :
                                                    "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        )}
                                    >
                                        {s.status === "loading" ? (
                                            <Loader2 size={16} className="mr-2 animate-spin" />
                                        ) : (
                                            <Send size={16} className="mr-2" />
                                        )}
                                        {s.status === "loading" ? "Enviando..." : "Disparar Webhook"}
                                    </Button>

                                    {s.status === "error" && s.lastResult && (
                                        <p className="text-[10px] text-red-400 mt-1 text-center italic">{s.lastResult}</p>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
