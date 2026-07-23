import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Trash2, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getProxiedUrl } from "@/lib/imageProxy";

import { useStore, Client } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { fetchScheduledPanelPostsAction, cancelScheduledPostAction, updateSchedulerRecordAction, fetchAllScheduledPostsAction } from "@/app/actions/scheduler";
import { 
    processScheduledPosts, 
    checkSchedulingConflicts, 
    ScheduledPost, 
    SchedulingConflict, 
    POST_TYPE_CONFIG 
} from "@/lib/schedulingUtils";

interface PostImage {
    id: number;
    created_at: string;
    nome_empresa: string;
    imagem: string; // URL
    formato: string;
    descricao: string | null;
    publicado: boolean;
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
    publicado_instagram: boolean;
}

export function ScheduledPanel({ client, isSold = false }: { client: Client; isSold?: boolean }) {
    const { clients } = useStore();
    const [groupedPosts, setGroupedPosts] = useState<GroupedScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Edit Schedule State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<GroupedScheduledPost | null>(null);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [allScheduledPosts, setAllScheduledPosts] = useState<ScheduledPost[]>([]);
    const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);

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

            // Enforce strict client-side filtering to prevent statistics leakage
            const filteredImages = rawImages.filter(img => {
                const isSoldFormat = img.formato && img.formato.toUpperCase().startsWith("VENDIDO ");
                return isSold ? isSoldFormat : !isSoldFormat;
            });

            // Group by data_agendamento, veiculo_gerado, formato
            const groups: Record<string, GroupedScheduledPost> = {};

            filteredImages.forEach(img => {
                if (!img.data_agendamento) return;
                
                const vehicle = img.veiculo_gerado || "Sem Veículo";
                const formatStr = img.formato || "FEED";
                // Group key based on time and vehicle and format
                const key = `${img.data_agendamento}-${vehicle}-${formatStr}`;

                const cleanCaption = img.descricao || "";

                if (!groups[key]) {
                    groups[key] = {
                        id: key,
                        veiculo_gerado: vehicle,
                        formato: formatStr,
                        data_agendamento: img.data_agendamento,
                        images: [],
                        caption: cleanCaption,
                        postType: formatStr === "REELS" || formatStr === "VENDIDO REELS" 
                            ? "REELS"
                            : (formatStr.includes("FEED")
                                ? (filteredImages.filter(i => i.veiculo_gerado === vehicle && i.formato === formatStr && i.data_agendamento === img.data_agendamento).length > 1 ? "CARROSSEL" : "ESTATICA")
                                : "IMAGEM"),
                        publicado: img.publicado || false,
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

    const handleOpenEditModal = async (post: GroupedScheduledPost) => {
        setEditingPost(post);
        const dt = new Date(post.data_agendamento);
        // Format to local timezone YYYY-MM-DD and HH:mm
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        const hh = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        setScheduleDate(`${yyyy}-${mm}-${dd}`);
        setScheduleTime(`${hh}:${min}`);
        setConflicts([]);
        setIsEditModalOpen(true);
        
        const rawPosts = await fetchAllScheduledPostsAction();
        const processedPosts = processScheduledPosts(rawPosts);
        setAllScheduledPosts(processedPosts);
    };

    useEffect(() => {
        if (editingPost && scheduleDate && scheduleTime) {
            const proposedTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
            const currentPostIds = editingPost.images.map(img => img.id);
            const foundConflicts = checkSchedulingConflicts(
                proposedTime,
                editingPost.postType,
                allScheduledPosts,
                currentPostIds,
                client.divisao_developrs
            );
            setConflicts(foundConflicts);
        } else {
            setConflicts([]);
        }
    }, [scheduleDate, scheduleTime, editingPost, allScheduledPosts]);

    const handleSaveSchedule = async () => {
        if (!editingPost) return;
        if (!scheduleDate || !scheduleTime) {
            alert("Selecione data e hora.");
            return;
        }

        setActionLoading(editingPost.id);
        setIsEditModalOpen(false);
        try {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
            const selectedIds = editingPost.images.map(img => img.id);             const result = await updateSchedulerRecordAction(selectedIds, { 
                data_agendamento: scheduledDateTime.toISOString(),
                webhook_disparado: false
            });

            if (!result.success) throw new Error(result.error);
            
            alert("Horário atualizado com sucesso!");
            fetchPosts();
        } catch (error) {
            console.error("Update schedule error:", error);
            alert("Erro ao atualizar o horário: " + (error as Error).message);
        } finally {
            setActionLoading(null);
            setEditingPost(null);
        }
    };

    const handleResendWebhook = async (post: GroupedScheduledPost) => {
        if (!confirm("Tem certeza que deseja tentar postar novamente agora?")) return;

        const isPostSold = isSold || (post.formato && post.formato.toUpperCase().startsWith("VENDIDO "));

        // Webhook: sold posts use a different endpoint
        const webhookAgendar = isPostSold
            ? "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/postagens-vendidos"
            : "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/agendar_postagem";

        // For sold posts, credentials (facebookId/instagramId/token) must be looked up
        // from the regular clients list (Gerenciar Imagens), NOT from the sold client.
        let facebookId: string | undefined;
        let instagramId: string | undefined;
        let token: string | undefined;

        if (isPostSold) {
            const regularClient = clients.find(
                (c) => c.name.toLowerCase() === client.name.toLowerCase()
            );
            facebookId = regularClient?.facebookId;
            instagramId = regularClient?.instagramId;
            token = regularClient?.token;
        } else {
            facebookId = client.facebookId;
            instagramId = client.instagramId;
            token = client.token;
        }

        if (!facebookId || !instagramId || !token) {
            alert("Não tem todas informações de ids e token necessarias para fazer a publicação. Configure-as no Gerenciar Imagens.");
            return;
        }

        setActionLoading(post.id);
        try {
            const scheduledDateTime = new Date(); // Post NOW

            const payload = {
                client: client.name,
                facebook_id: facebookId,
                instagram_id: instagramId,
                token: token,
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

            await updateSchedulerRecordAction(selectedIds, { 
                publicado: false, // Reset so webhook logic can update it
                publicado_instagram: false,
                webhook_disparado: true
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
            <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Estatísticas das Postagens</h2>
            
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
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Facebook</p>
                                        <div className="flex items-center justify-center mt-1">
                                            {post.publicado ? <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" /> : (isPast ? <XCircle className="w-4 h-4 text-red-500 mr-1" /> : <Clock className="w-4 h-4 text-yellow-500 mr-1" />)}
                                            <span className="text-xs font-medium text-white">{post.publicado ? "Postado" : (isPast ? "Falhou" : "Aguardando")}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded p-2 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Instagram</p>
                                        <div className="flex items-center justify-center mt-1">
                                            {post.publicado_instagram ? <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" /> : (isPast && post.publicado ? <XCircle className="w-4 h-4 text-red-500 mr-1" /> : <Clock className="w-4 h-4 text-gray-500 mr-1" />)}
                                            <span className="text-xs font-medium text-white">{post.publicado_instagram ? "Postado" : (isPast && post.publicado ? "Falhou" : "Pendente")}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-2 pt-2">
                                    <div className="flex space-x-2">
                                        <Button 
                                            variant="outline" 
                                            className="w-1/2 h-8 text-[10px] sm:text-xs border-white/10 hover:bg-white/10 px-1"
                                            onClick={() => handleCancelSchedule(post)}
                                            disabled={actionLoading === post.id}
                                        >
                                            {actionLoading === post.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1 text-red-400" />}
                                            Cancelar
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="w-1/2 h-8 text-[10px] sm:text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-1"
                                            onClick={() => handleOpenEditModal(post)}
                                            disabled={actionLoading === post.id}
                                        >
                                            <Clock className="w-3 h-3 mr-1" />
                                            Horário
                                        </Button>
                                    </div>
                                    <Button 
                                        className="w-full h-8 text-xs !bg-indigo-600 hover:!bg-indigo-700 !text-white"
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

            {/* Edit Schedule Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Mudar Horário do Agendamento"
                className="max-w-md"
            >
                <div className="space-y-6">
                    {editingPost && (
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                            <p className="text-sm text-gray-300 mb-2 font-medium">Resumo do Post</p>
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-md overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                                    {checkIsVideo(editingPost.images[0].imagem) ? (
                                        <video src={editingPost.images[0].imagem} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={editingPost.images[0].imagem} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm truncate w-48">{editingPost.veiculo_gerado}</p>
                                    <p className="text-xs text-indigo-400 font-bold">{editingPost.formato} • {editingPost.postType} • {editingPost.images.length} item(ns)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Nova Data</label>
                            <Input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Novo Horário</label>
                            <Input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                    </div>

                    {/* Conflict Warnings */}
                    {conflicts.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg space-y-2">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-wider flex items-center">
                                <Clock className="w-3 h-3 mr-2" />
                                Conflito de Horário Detectado
                            </p>
                            {conflicts.map((conflict, idx) => (
                                <p key={idx} className="text-gray-300 text-[11px] leading-relaxed">
                                    {conflict.reason}
                                </p>
                            ))}
                            <p className="text-red-400/80 text-[10px] italic mt-2">
                                Para evitar bloqueios da Meta, escolha um horário com maior intervalo.
                            </p>
                        </div>
                    )}

                    {/* Delay Info */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-lg">
                        <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-2">Intervalos Recomendados</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400">
                            {Object.entries(POST_TYPE_CONFIG).filter(([key]) => ["CARROSSEL", "REELS", "ESTATICA"].includes(key)).map(([key, cfg]) => (
                                <div key={key} className="flex justify-between border-b border-white/5 py-1">
                                    <span>{cfg.label}:</span>
                                    <span className="text-indigo-300 font-bold">{cfg.delay} min</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSaveSchedule}
                            disabled={actionLoading === editingPost?.id}
                            className="!bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold"
                        >
                            {actionLoading === editingPost?.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Salvar Horário
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
