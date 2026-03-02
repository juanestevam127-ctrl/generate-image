import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Check, Loader2, Send, Plus, Trash2, MoveUp, MoveDown } from "lucide-react";

import { useStore, Client } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { supabase, uploadImage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface PostImage {
    id: number;
    created_at: string;
    nome_empresa: string;
    imagem: string; // URL
    formato: string;
    descricao: string | null;
    publicado: boolean;
    veiculo_gerado: string | null;
}

interface GroupedPost {
    id: string; // Unique ID for the group
    veiculo_gerado: string;
    formato: string;
    images: PostImage[];
    caption: string;
    postType: string;
    created_at: string;
}

export function PostScheduler({ client }: { client: Client }) {
    const [groupedPosts, setGroupedPosts] = useState<GroupedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewFilter, setViewFilter] = useState<"FEED" | "STORY">("FEED");

    // Scheduling State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [currentPost, setCurrentPost] = useState<GroupedPost | null>(null);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);

    // Carousel State
    const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

    // Manual Post State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPostFormat, setNewPostFormat] = useState<"FEED" | "STORY">("FEED");
    const [newPostType, setNewPostType] = useState("ESTATICA");
    const [newPostVehicle, setNewPostVehicle] = useState("");

    useEffect(() => {
        fetchImages();
    }, [client.name]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("publicacoes_design_online")
                .select("*")
                .eq("nome_empresa", client.name)
                .eq("publicado", false)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const rawImages = (data || []) as PostImage[];

            // Group by veiculo_gerado and formato
            const groups: Record<string, GroupedPost> = {};

            rawImages.forEach(img => {
                const vehicle = img.veiculo_gerado || "Sem Veículo";
                const format = img.formato || "FEED";
                const key = `${vehicle}-${format}`;

                if (!groups[key]) {
                    groups[key] = {
                        id: key,
                        veiculo_gerado: vehicle,
                        formato: format,
                        images: [],
                        caption: img.descricao || client.captionTemplate || "",
                        postType: format === "FEED"
                            ? (rawImages.filter(i => i.veiculo_gerado === vehicle && i.formato === format).length > 1 ? "CARROSSEL" : "ESTATICA")
                            : "IMAGEM",
                        created_at: img.created_at
                    };
                }
                groups[key].images.push(img);
            });

            setGroupedPosts(Object.values(groups));
        } catch (error) {
            console.error("Error fetching images:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (post: GroupedPost) => {
        setCurrentPost(post);
        setScheduleDate("");
        setScheduleTime("");
        setIsScheduleModalOpen(true);
    };

    const nextImage = (postId: string, total: number) => {
        setCarouselIndices(prev => ({
            ...prev,
            [postId]: ((prev[postId] || 0) + 1) % total
        }));
    };

    const prevImage = (postId: string, total: number) => {
        setCarouselIndices(prev => ({
            ...prev,
            [postId]: ((prev[postId] || 0) - 1 + total) % total
        }));
    };

    const updateCaptionBase = async (postId: string, newCaption: string) => {
        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: newCaption } : p));

        const post = groupedPosts.find(p => p.id === postId);
        if (post) {
            const { error } = await supabase
                .from("publicacoes_design_online")
                .update({ descricao: newCaption })
                .eq("nome_empresa", client.name)
                .eq("veiculo_gerado", post.veiculo_gerado)
                .eq("formato", post.formato);

            if (error) console.error("Error updating caption in DB:", error);
        }
    };

    // Debounced caption update
    const captionTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const updateCaption = (postId: string, newCaption: string) => {
        // Update local state immediately
        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: newCaption } : p));

        // Debounce DB sync
        if (captionTimeoutRef.current[postId]) clearTimeout(captionTimeoutRef.current[postId]);
        captionTimeoutRef.current[postId] = setTimeout(() => {
            updateCaptionBase(postId, newCaption);
        }, 1000);
    };

    const updatePostType = (postId: string, newType: string) => {
        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, postType: newType } : p));
    };

    const moveImage = (postId: string, fromIndex: number, toIndex: number) => {
        setGroupedPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const newImages = [...p.images];
            const [movedItem] = newImages.splice(fromIndex, 1);
            newImages.splice(toIndex, 0, movedItem);
            return { ...p, images: newImages };
        }));
        // Reset index to ensure we stay on the moved image or visible area
        setCarouselIndices(prev => ({ ...prev, [postId]: toIndex }));
    };

    const handleAddImage = async (postId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result) {
                const base64Str = e.target.result as string;
                const publicUrl = await uploadImage(base64Str, 'temp-files', '');

                if (publicUrl) {
                    const post = groupedPosts.find(p => p.id === postId);
                    if (!post) return;

                    // Persist to DB
                    const { data: inserted, error } = await supabase
                        .from("publicacoes_design_online")
                        .insert([{
                            nome_empresa: client.name,
                            imagem: publicUrl,
                            formato: post.formato,
                            descricao: post.caption,
                            publicado: false,
                            veiculo_gerado: post.veiculo_gerado
                        }])
                        .select();

                    if (error) {
                        console.error("Error persisting image to DB:", error);
                        return;
                    }

                    const dbImg = inserted[0] as PostImage;

                    setGroupedPosts(prev => prev.map(p => {
                        if (p.id !== postId) return p;
                        const newImages = [...p.images, dbImg];
                        return {
                            ...p,
                            images: newImages,
                            postType: p.formato === "FEED" && newImages.length > 1 ? "CARROSSEL" : p.postType
                        };
                    }));

                    // Show the newly added image
                    setGroupedPosts(current => {
                        const postAfterImg = current.find(p => p.id === postId);
                        if (postAfterImg) {
                            setCarouselIndices(prev => ({ ...prev, [postId]: postAfterImg.images.length - 1 }));
                        }
                        return current;
                    });
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const removeImageFromPost = async (postId: string, imgIndex: number) => {
        const post = groupedPosts.find(p => p.id === postId);
        if (!post) return;

        const imgToDelete = post.images[imgIndex];

        // Delete from DB if it has a real ID
        if (typeof imgToDelete.id === 'number') {
            const { error } = await supabase
                .from("publicacoes_design_online")
                .delete()
                .eq("id", imgToDelete.id);

            if (error) {
                console.error("Error deleting image from DB:", error);
                return;
            }
        }

        setGroupedPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            if (p.images.length <= 1) {
                // Keep the group but empty (so user can add more or title stays)
                return { ...p, images: [] };
            }
            const newImages = [...p.images];
            newImages.splice(imgIndex, 1);
            return { ...p, images: newImages };
        }));
        setCarouselIndices(prev => ({ ...prev, [postId]: 0 }));
    };

    const handleCreateManualPost = () => {
        const id = `manual-${Date.now()}`;
        const newPost: GroupedPost = {
            id,
            veiculo_gerado: newPostVehicle || "Nova Postagem",
            formato: newPostFormat,
            images: [],
            caption: client.captionTemplate || "",
            postType: newPostType,
            created_at: new Date().toISOString()
        };
        setGroupedPosts(prev => [newPost, ...prev]);
        setViewFilter(newPostFormat);
        setIsCreateModalOpen(false);
        setNewPostVehicle("");
    };

    const handleSchedule = async () => {
        if (!currentPost) return;

        const webhookAgendar = "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/agendar_postagem";

        if (!scheduleDate || !scheduleTime) {
            alert("Selecione data e hora.");
            return;
        }

        setIsScheduling(true);
        try {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

            const payload = {
                client: client.name,
                facebook_id: client.facebookId,
                instagram_id: client.instagramId,
                token: client.token,
                images: currentPost.images.map(img => img.imagem),
                description: currentPost.caption,
                format: currentPost.formato,
                post_type: currentPost.postType,
                scheduled_at: scheduledDateTime.toISOString(),
                is_carousel: currentPost.postType === "CARROSSEL",
                veiculo_gerado: currentPost.veiculo_gerado
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

            // For manual posts, items won't have numeric numeric IDs. Filter only real IDs.
            const selectedIds = currentPost.images
                .map(img => img.id)
                .filter(id => typeof id === 'number');

            if (selectedIds.length > 0) {
                const { error } = await supabase
                    .from("publicacoes_design_online")
                    .update({ publicado: true })
                    .in("id", selectedIds);

                if (error) console.error("Error updating published status:", error);
            }

            alert("Agendamento enviado com sucesso!");
            setIsScheduleModalOpen(false);
            setCurrentPost(null);
            fetchImages();

        } catch (error) {
            console.error("Scheduling error:", error);
            alert("Erro ao agendar: " + (error as Error).message);
        } finally {
            setIsScheduling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const filteredPosts = groupedPosts.filter(p => p.formato === viewFilter);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setViewFilter("FEED")}
                        className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${viewFilter === "FEED" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        FEED
                    </button>
                    <button
                        onClick={() => setViewFilter("STORY")}
                        className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${viewFilter === "STORY" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        STORY
                    </button>
                </div>

                <div className="flex items-center space-x-4">
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-green-500 hover:bg-green-600 text-slate-950 font-bold px-4 h-9"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        NOVA POSTAGEM
                    </Button>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        InstaFeed: {viewFilter}
                    </h2>
                </div>
            </div>

            {filteredPosts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>Nenhum conteúdo {viewFilter.toLowerCase()} disponível para este cliente.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-8">
                    {filteredPosts.map((post) => {
                        const currentIndex = carouselIndices[post.id] || 0;
                        const totalImages = post.images.length;

                        return (
                            <Card key={post.id} className="w-full max-w-[500px] bg-black border-white/10 overflow-hidden shadow-2xl">
                                {/* Header */}
                                <div className="p-3 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white">
                                                {client.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white leading-none">{client.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{post.veiculo_gerado}</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleOpenModal(post)}
                                        size="sm"
                                        className="h-8 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold px-4"
                                    >
                                        Agendar
                                    </Button>
                                </div>

                                {/* Image Area */}
                                <div className="relative aspect-square bg-zinc-900 group">
                                    {post.images[currentIndex] ? (
                                        <img
                                            src={post.images[currentIndex].imagem}
                                            alt="Post"
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-zinc-900/50">
                                            <Plus size={48} className="opacity-20 mb-2" />
                                            <p className="text-sm font-medium opacity-50">Nenhuma imagem adicionada</p>
                                        </div>
                                    )}

                                    {totalImages > 1 && (
                                        <>
                                            <button
                                                onClick={() => prevImage(post.id, totalImages)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {"<"}
                                            </button>
                                            <button
                                                onClick={() => nextImage(post.id, totalImages)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {">"}
                                            </button>

                                            {/* Reorder controls */}
                                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => moveImage(post.id, currentIndex, currentIndex - 1)}
                                                    disabled={currentIndex === 0}
                                                    className="w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/90"
                                                    title="Mover para trás"
                                                >
                                                    <MoveUp size={14} className="-rotate-90" />
                                                </button>
                                                <button
                                                    onClick={() => moveImage(post.id, currentIndex, currentIndex + 1)}
                                                    disabled={currentIndex === totalImages - 1}
                                                    className="w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/90"
                                                    title="Mover para frente"
                                                >
                                                    <MoveDown size={14} className="-rotate-90" />
                                                </button>
                                                <button
                                                    onClick={() => removeImageFromPost(post.id, currentIndex)}
                                                    className="w-8 h-8 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-500"
                                                    title="Remover imagem"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* Empty Post Placeholder */}
                                    {/* (Moved logic above for better safety) */}

                                    {/* Add Image Button */}

                                    {/* Add Image Button */}
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <label className="cursor-pointer">
                                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700">
                                                <Plus size={20} />
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleAddImage(post.id, e.target.files)}
                                            />
                                        </label>
                                    </div>

                                    {/* Indicator */}
                                    {totalImages > 1 && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5">
                                            {post.images.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? "bg-white scale-125" : "bg-white/30"}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Caption Area */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center space-x-4 text-white">
                                        <div className="font-bold flex-1">
                                            {currentIndex + 1} / {totalImages} Imagem(ns)
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                            {format(new Date(post.created_at), "dd MMM yyyy", { locale: ptBR })}
                                        </div>
                                    </div>

                                    <textarea
                                        value={post.caption}
                                        onChange={(e) => updateCaption(post.id, e.target.value)}
                                        placeholder="Escreva uma legenda..."
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-gray-200 resize-y focus:ring-1 focus:ring-indigo-500 p-3 min-h-[100px]"
                                    />

                                    <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                                        {post.formato === "FEED" ? (
                                            <>
                                                {["ESTATICA", "CARROSSEL", "REELS"].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => updatePostType(post.id, type)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${post.postType === type ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </>
                                        ) : (
                                            <>
                                                {["IMAGEM", "VIDEO"].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => updatePostType(post.id, type)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${post.postType === type ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Schedule Modal */}
            <Modal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                title="Confirmar Agendamento"
                className="max-w-md"
            >
                <div className="space-y-6">
                    {currentPost && (
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                            <p className="text-sm text-gray-300 mb-2 font-medium">Resumo do Post</p>
                            <div className="flex items-center space-x-4">
                                <img src={currentPost.images[0].imagem} className="w-16 h-16 rounded-md object-cover border border-white/10" />
                                <div>
                                    <p className="text-white font-bold text-sm truncate w-48">{currentPost.veiculo_gerado}</p>
                                    <p className="text-xs text-indigo-400 font-bold">{currentPost.formato} • {currentPost.postType} • {currentPost.images.length} item(ns)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Data</label>
                            <Input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Horário</label>
                            <Input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSchedule}
                            disabled={isScheduling}
                            className="!bg-green-400 hover:!bg-green-500 !text-slate-950 font-bold"
                        >
                            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Confirmar Agendamento
                        </Button>
                    </div>
                </div>
            </Modal >

            {/* Create Post Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Nova Postagem Manual"
                className="max-w-md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 uppercase text-[10px] tracking-wider">Veículo / Título</label>
                            <Input
                                placeholder="Ex: CRETA 2024"
                                value={newPostVehicle}
                                onChange={(e) => setNewPostVehicle(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 uppercase text-[10px] tracking-wider">Formato</label>
                                <div className="flex bg-white/5 p-1 rounded-md border border-white/10">
                                    <button
                                        onClick={() => {
                                            setNewPostFormat("FEED");
                                            setNewPostType("ESTATICA");
                                        }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${newPostFormat === "FEED" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                                    >
                                        FEED
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewPostFormat("STORY");
                                            setNewPostType("IMAGEM");
                                        }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${newPostFormat === "STORY" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                                    >
                                        STORY
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 uppercase text-[10px] tracking-wider">Tipo</label>
                                <select
                                    value={newPostType}
                                    onChange={(e) => setNewPostType(e.target.value)}
                                    className="w-full h-9 bg-white/5 border border-white/10 rounded-md px-3 text-[11px] font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.75rem center',
                                        backgroundSize: '1rem'
                                    }}
                                >
                                    {newPostFormat === "FEED" ? (
                                        <>
                                            <option value="ESTATICA" className="bg-[#1a1a1a]">ESTÁTICA</option>
                                            <option value="CARROSSEL" className="bg-[#1a1a1a]">CARROSSEL</option>
                                            <option value="REELS" className="bg-[#1a1a1a]">REELS</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="IMAGEM" className="bg-[#1a1a1a]">IMAGEM</option>
                                            <option value="VIDEO" className="bg-[#1a1a1a]">VÍDEO</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
                        <Button
                            onClick={handleCreateManualPost}
                            className="bg-green-500 hover:bg-green-600 text-slate-950 font-bold px-8 shadow-lg shadow-green-500/20 active:scale-95 transition-all uppercase tracking-tight"
                        >
                            CRIAR POSTAGEM
                        </Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
