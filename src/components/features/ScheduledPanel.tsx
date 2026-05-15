import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Trash2, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getProxiedUrl } from "@/lib/imageProxy";

import { Client } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchScheduledPanelPostsAction, cancelScheduledPostAction, updateSchedulerRecordAction } from "@/app/actions/scheduler";

interface PostImage {
    id: number;
    created_at: string;
    nome_empresa: string;
    imagem: string; // URL
    formato: string;
    descricao: string | null;
    publicado: boolean;
    postado?: boolean;
    publicado_instagram?: boolean;
    veiculo_gerado: string | null;
    data_agendamento: string | null;
    ordem: number;
}

interface GroupedScheduledPost {
    id: string;
    veiculo_gerado: string;
    formato: string;
    data_agendamento: string;
    images: PostImage[];
    caption: string;
    postType: string;
    publicado: boolean;
    postado: boolean;
    publicado_instagram: boolean;
}

export function ScheduledPanel({ client, isSold = false }: { client: Client; isSold?: boolean }) {
    const [groupedPosts, setGroupedPosts] = useState<GroupedScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const checkIsVideo = (url: string) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
        return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
    };

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const result = await fetchScheduledPanelPostsAction(client.name, isSold);
            if (!result.success) throw new Error(result.error);

            const rawImages = (result.data || []) as PostImage[];

            // Group by data_agendamento, veiculo_gerado, formato
            const groups: Record<string, GroupedScheduledPost> = {};

            rawImages.forEach(img => {
                if (!img.data_agendamento) return;
                
                const vehicle = img.veiculo_gerado || "Sem Veículo";
                const formatStr = img.formato || "FEED";
                // Group key based on time and vehicle and format
                const key = `${img.data_agendamento}-${vehicle}-${formatStr}`;

                if (!groups[key]) {
                    groups[key] = {
                        id: key,
                        veiculo_gerado: vehicle,
                        formato: formatStr,
                        data_agendamento: img.data_agendamento,
                        images: [],
                        caption: img.descricao || "",
                        postType: formatStr === "REELS" || formatStr === "VENDIDO REELS" 
                            ? "REELS"
                            : (formatStr.includes("FEED")
                                ? (rawImages.filter(i => i.veiculo_gerado === vehicle && i.formato === formatStr && i.data_agendamento === img.data_agendamento).length > 1 ? "CARROSSEL" : "ESTATICA")
                                : "IMAGEM"),
                        publicado: img.publicado || false,
                        postado: img.postado || false,
                        publicado_instagram: img.publicado_instagram || false,
                    };
                }
                groups[key].images.push(img);
            });

            setGroupedPosts(Object.values(groups).sort((a, b) => new Date(b.data_agendamento).getTime() - new Date(a.data_agendamento).getTime()));
        } catch (error) {
            console.error("Error fetching scheduled posts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [client.name, isSold]);

    const handleCancelSchedule = async (post: GroupedScheduledPost) => {
        if (!confirm("Tem certeza que deseja cancelar este agendamento? Ele voltará para a aba de agendamento.")) return;
        
        setActionLoading(post.id);
        try {
            const ids = post.images.map(img => img.id);
            const result = await cancelScheduledPostAction(ids);
            if (!result.success) throw new Error(result.error);
            
            // Remove from list
            setGroupedPosts(prev => prev.filter(p => p.id !== post.id));
            alert("Agendamento cancelado com sucesso!");
        } catch (error) {
            console.error("Cancel error:", error);
            alert("Erro ao cancelar agendamento.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleResendWebhook = async (post: GroupedScheduledPost) => {
        if (!confirm("Tem certeza que deseja tentar postar novamente agora?")) return;

        const webhookAgendar = "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/agendar_postagem";
        
        if (!client.facebookId || !client.instagramId || !client.token) {
            alert("Não tem todas informações de ids e token necessarias para fazer a publicação.");
            return;
        }

        setActionLoading(post.id);
        try {
            const scheduledDateTime = new Date(); // Post NOW

            const payload = {
                client: client.name,
                facebook_id: client.facebookId,
                instagram_id: client.instagramId,
                token: client.token,
                images: post.images.map(img => img.imagem),
                video: post.images.find(img => checkIsVideo(img.imagem))?.imagem,
                reels_cover: post.images.find(img => !checkIsVideo(img.imagem))?.imagem,
                description: post.caption,
                format: post.formato,
                post_type: post.postType,
                scheduled_at: scheduledDateTime.toISOString(),
                scheduled_at_local: "",
                timezone: "America/Sao_Paulo",
                timezone_offset: scheduledDateTime.getTimezoneOffset(),
                is_carousel: post.postType === "CARROSSEL",
                veiculo_gerado: post.veiculo_gerado
            };

            const res = await fetch("/api/proxy-webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: webhookAgendar,
                    payload: payload
                })
            });

            if (!res.ok) throw new Error("Falha ao enviar para o webhook");

            const selectedIds = post.images.map(img => img.id);

            // Update to indicate we triggered webhook again
            await updateSchedulerRecordAction(selectedIds, { 
                publicado: true,
                postado: false, // Reset status to check again if it posts
                publicado_instagram: false
            });

            alert("Webhook enviado com sucesso para tentar a postagem novamente!");
            fetchPosts(); // Refresh list to update status
        } catch (error) {
            console.error("Webhook error:", error);
            alert("Erro ao reenviar o webhook: " + (error as Error).message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (groupedPosts.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                <p>Nenhuma postagem agendada ou no painel.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Painel de Controle de Postagens</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedPosts.map(post => {
                    const scheduledDate = new Date(post.data_agendamento);
                    const isPast = scheduledDate < new Date();
                    const firstImage = post.images[0];

                    return (
                        <Card key={post.id} className="bg-zinc-900 border-white/10 overflow-hidden shadow-xl flex flex-col">
                            {/* Image Header */}
                            <div className="relative h-40 bg-black flex items-center justify-center">
                                {firstImage && (
                                    checkIsVideo(firstImage.imagem) ? (
                                        <video src={getProxiedUrl(firstImage.imagem)} className="w-full h-full object-cover opacity-60" />
                                    ) : (
                                        <img src={getProxiedUrl(firstImage.imagem)} className="w-full h-full object-cover opacity-60" alt="Preview" />
                                    )
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                                    <p className="text-white font-bold truncate text-sm">{post.veiculo_gerado}</p>
                                    <p className="text-gray-300 text-xs">{post.formato} • {post.postType}</p>
                                </div>
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-white flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {format(scheduledDate, "dd/MM HH:mm", { locale: ptBR })}
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="p-4 flex-1 flex flex-col space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 rounded p-2 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Gatilho (Webhook)</p>
                                        <div className="flex items-center justify-center mt-1">
                                            {post.publicado ? <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" /> : <Clock className="w-4 h-4 text-yellow-500 mr-1" />}
                                            <span className="text-xs font-medium text-white">{post.publicado ? "Disparado" : "Aguardando"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded p-2 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Facebook</p>
                                        <div className="flex items-center justify-center mt-1">
                                            {post.postado ? <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" /> : (isPast && post.publicado ? <XCircle className="w-4 h-4 text-red-500 mr-1" /> : <Clock className="w-4 h-4 text-gray-500 mr-1" />)}
                                            <span className="text-xs font-medium text-white">{post.postado ? "Postado" : (isPast && post.publicado ? "Falhou" : "Pendente")}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded p-2 text-center col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Instagram</p>
                                        <div className="flex items-center justify-center mt-1">
                                            {post.publicado_instagram ? <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" /> : (isPast && post.publicado ? <XCircle className="w-4 h-4 text-red-500 mr-1" /> : <Clock className="w-4 h-4 text-gray-500 mr-1" />)}
                                            <span className="text-xs font-medium text-white">{post.publicado_instagram ? "Postado" : (isPast && post.publicado ? "Falhou" : "Pendente")}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-2 pt-2">
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-8 text-xs border-white/10 hover:bg-white/10"
                                        onClick={() => handleCancelSchedule(post)}
                                        disabled={actionLoading === post.id}
                                    >
                                        {actionLoading === post.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1 text-red-400" />}
                                        Cancelar Agendamento
                                    </Button>
                                    <Button 
                                        className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={() => handleResendWebhook(post)}
                                        disabled={actionLoading === post.id}
                                    >
                                        {actionLoading === post.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                                        Tentar Postar Novamente
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
