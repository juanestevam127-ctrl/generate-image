import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoveUp, MoveDown, Trash2, Plus, Calendar as CalendarIcon, Clock, Send, ChevronLeft, ChevronRight, Loader2, Info, LayoutTemplate, Type, History, Filter, Search, MoreVertical, Edit2 } from "lucide-react";
import { getProxiedUrl } from "@/lib/imageProxy";

import { useStore, Client } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ImageEditor } from "@/components/features/ImageEditor";
import { CoverPickerModal } from "@/components/features/CoverPickerModal";
import { serverUploadImage } from "@/app/actions";
import { uploadFile } from "@/lib/supabase";
import { 
    fetchSchedulerImagesAction, 
    updateSchedulerRecordAction, 
    deleteSchedulerImageAction, 
    insertSchedulerPostAction,
    updateGroupFormatAction,
    fetchAllScheduledPostsAction 
} from "@/app/actions/scheduler";
import { cn } from "@/lib/utils";
import { 
    processScheduledPosts, 
    checkSchedulingConflicts, 
    ScheduledPost, 
    SchedulingConflict, 
    POST_TYPE_CONFIG,
    getPostDelay 
} from "@/lib/schedulingUtils";

interface PostImage {
    id: number;
    created_at: string;
    nome_empresa: string;
    imagem: string; // URL
    formato: string;
    descricao: string | null;
    publicado: boolean;
    veiculo_gerado: string | null;
    data_agendamento: string | null;
    ordem: number;
}

interface GroupedPost {
    id: string; // Unique ID for the group
    veiculo_gerado: string;
    formato: string;
    images: PostImage[];
    caption: string;
    postType: string;
    created_at: string;
    reelsCover?: string;
}

export function PostScheduler({ client }: { client: Client }) {
    const [groupedPosts, setGroupedPosts] = useState<GroupedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewFilter, setViewFilter] = useState<"FEED" | "STORY" | "REELS">("FEED");

    // Scheduling State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [currentPost, setCurrentPost] = useState<GroupedPost | null>(null);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);
    const [allScheduledPosts, setAllScheduledPosts] = useState<ScheduledPost[]>([]);
    const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);

    const isVideo = (url: string) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
        return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
    };

    // Carousel State
    const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

    // Manual Post State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPostFormat, setNewPostFormat] = useState<"FEED" | "STORY" | "REELS">("FEED");
    const [newPostType, setNewPostType] = useState("ESTATICA");
    const [newPostVehicle, setNewPostVehicle] = useState("");

    // Sequential Editing State
    const [editQueue, setEditQueue] = useState<File[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentEditBase64, setCurrentEditBase64] = useState<string | null>(null);
    const [activePostId, setActivePostId] = useState<string | null>(null);

    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    // Cover Picker State
    const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
    const [coverPickerPost, setCoverPickerPost] = useState<GroupedPost | null>(null);

    // Caption Saving State
    const [savingCaptions, setSavingCaptions] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchImages();
    }, [client.name]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const result = await fetchSchedulerImagesAction(client.name);

            if (!result.success) throw new Error(result.error);

            const rawImages = (result.data || []) as PostImage[];

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
                        caption: img.descricao || "",
                        postType: format === "REELS" || format === "VENDIDO REELS" 
                            ? "REELS"
                            : (format === "FEED" || format === "VENDIDO FEED"
                                ? (rawImages.filter(i => i.veiculo_gerado === vehicle && i.formato === format).length > 1 ? "CARROSSEL" : "ESTATICA")
                                : "IMAGEM"),
                        created_at: img.created_at
                    };
                }
                groups[key].images.push(img);
                if (img.descricao?.includes("REELS_COVER:")) {
                    const match = img.descricao.match(/REELS_COVER:(https?:\/\/\S+)/);
                    if (match) groups[key].reelsCover = match[1];
                }
            });

            setGroupedPosts(Object.values(groups));
        } catch (error) {
            console.error("Error fetching images:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async (post: GroupedPost) => {
        setCurrentPost(post);
        setScheduleDate("");
        setScheduleTime("");
        setConflicts([]);
        setIsScheduleModalOpen(true);
        
        // Fetch all scheduled posts to check for conflicts via server action
        const rawPosts = await fetchAllScheduledPostsAction();
        const processedPosts = processScheduledPosts(rawPosts);
        setAllScheduledPosts(processedPosts);
    };

    // Conflict Check Effect
    useEffect(() => {
        if (currentPost && scheduleDate && scheduleTime) {
            const proposedTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
            const currentPostIds = currentPost.images.map(img => img.id).filter(id => typeof id === 'number') as number[];
            const foundConflicts = checkSchedulingConflicts(
                proposedTime,
                currentPost.postType,
                allScheduledPosts,
                currentPostIds
            );
            setConflicts(foundConflicts);
        } else {
            setConflicts([]);
        }
    }, [scheduleDate, scheduleTime, currentPost, allScheduledPosts]);

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
        setSavingCaptions(prev => ({ ...prev, [postId]: true }));
        
        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: newCaption } : p));

        const post = groupedPosts.find(p => p.id === postId);
        if (post) {
            const imageIds = post.images.map(img => img.id).filter(id => typeof id === 'number') as number[];
            if (imageIds.length > 0) {
                const result = await updateSchedulerRecordAction(imageIds, { descricao: newCaption });
                if (!result.success) console.error("Error updating caption in server:", result.error);
            }
        }
        setSavingCaptions(prev => ({ ...prev, [postId]: false }));
    };

    // Debounced caption update
    const captionTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const updateCaption = (postId: string, newCaption: string) => {
        // Update local state immediately
        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: newCaption } : p));
        setSavingCaptions(prev => ({ ...prev, [postId]: true }));

        // Debounce DB sync
        if (captionTimeoutRef.current[postId]) clearTimeout(captionTimeoutRef.current[postId]);
        captionTimeoutRef.current[postId] = setTimeout(() => {
            updateCaptionBase(postId, newCaption);
        }, 2000); // Increased to 2s for better UX, but handleSchedule will force it
    };
    const updatePostType = (postId: string, newType: string) => {
        const post = groupedPosts.find(p => p.id === postId);
        if (post && newType !== "CARROSSEL" && newType !== "REELS" && post.images.length > 1) {
            alert(`Para mudar para ${newType}, você deve remover as outras imagens e deixar apenas uma.`);
            return;
        }
        if (post && newType === "REELS" && post.images.filter(img => isVideo(img.imagem)).length > 1) {
            alert(`Para Reels, você deve ter apenas um vídeo. Remova os vídeos extras.`);
            return;
        }
        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, postType: newType } : p));

        // Persist format change via server
        const newFormat = newType === "REELS" ? "REELS" : (post?.formato === "REELS" ? "FEED" : post?.formato || "FEED");
        if (post) {
            updateGroupFormatAction(client.name, post.veiculo_gerado, post.formato, newFormat)
                .then(result => {
                    if (!result.success) console.error("Error updating format in server:", result.error);
                    else {
                        setGroupedPosts(prev => prev.map(p => p.id === postId ? { ...p, formato: newFormat } : p));
                    }
                });
        }
    };

    const moveImage = async (postId: string, fromIndex: number, toIndex: number) => {
        setGroupedPosts(prev => {
            const newPosts = prev.map(p => {
                if (p.id !== postId) return p;
                const newImages = [...p.images];
                const [movedItem] = newImages.splice(fromIndex, 1);
                newImages.splice(toIndex, 0, movedItem);

                // Update orders in memory
                const reorderedImages = newImages.map((img, idx) => ({ ...img, ordem: idx }));

                // Persist order via server
                Promise.all(reorderedImages.map(img =>
                    updateSchedulerRecordAction(img.id as number, { ordem: img.ordem })
                )).catch(err => console.error("Error updating order in server:", err));

                return { ...p, images: reorderedImages };
            });
            return newPosts;
        });
        // Reset index to ensure we stay on the moved image or visible area
        setCarouselIndices(prev => ({ ...prev, [postId]: toIndex }));
    };

    const prepareNextInQueue = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setCurrentEditBase64(e.target.result as string);
                setIsEditorOpen(true);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleUploadFile = async (postId: string, file: File, isCover: boolean = false, customOrder?: number) => {
        setIsScheduling(true);
        setUploadProgress(prev => ({ ...prev, [postId]: 0 }));
        try {
            // Use client-side direct upload to bypass Next.js 1MB Server Action payload limit for large videos
            const publicUrl = await uploadFile(file, 'temp-files', '', (progress) => {
                setUploadProgress(prev => ({ ...prev, [postId]: progress }));
            });
            
            if (publicUrl) {
                const post = groupedPosts.find(p => p.id === postId);
                if (!post) return null;

                const nextOrder = customOrder !== undefined ? customOrder : post.images.length;

                const result = await insertSchedulerPostAction([{
                    nome_empresa: client.name,
                    imagem: publicUrl,
                    formato: post.formato,
                    descricao: isCover ? `REELS_COVER:${publicUrl}` : post.caption,
                    publicado: false,
                    veiculo_gerado: post.veiculo_gerado,
                    adicionado_manualmente: true,
                    ordem: nextOrder
                }]);

                if (!result.success) throw new Error(result.error);

                if (result.data && result.data[0]) {
                    const dbImg = result.data[0] as PostImage;
                    setGroupedPosts(prev => prev.map(p => {
                        if (p.id === postId) {
                            const newImages = [...p.images, dbImg];
                            return {
                                ...p,
                                images: newImages,
                                postType: (p.formato === "FEED" || p.formato === "VENDIDO FEED") && newImages.length > 1 && p.postType !== "REELS" ? "CARROSSEL" : p.postType
                            };
                        }
                        return p;
                    }));
                    setCarouselIndices(prev => ({ ...prev, [postId]: post.images.length }));
                    return dbImg;
                }
            }
            return null;
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Erro ao fazer upload do arquivo.");
            return null;
        } finally {
            setIsScheduling(false);
            setUploadProgress(prev => {
                const n = { ...prev };
                delete n[postId];
                return n;
            });
        }
    };

    const handleSelectCover = async (postId: string, imageBase64: string) => {
        setIsScheduling(true);
        setUploadProgress(prev => ({ ...prev, [postId]: 0 }));
        try {
            const post = groupedPosts.find(p => p.id === postId);
            if (!post) return;

            const uploadResult = await serverUploadImage(imageBase64, 'temp-files');
            if (uploadResult.success && uploadResult.url) {
                const publicUrl = uploadResult.url;
                const nextOrder = post.images.length;
                const result = await insertSchedulerPostAction([{
                    nome_empresa: client.name,
                    imagem: publicUrl,
                    formato: post.formato,
                    descricao: `REELS_COVER:${publicUrl}`,
                    publicado: false,
                    veiculo_gerado: post.veiculo_gerado,
                    adicionado_manualmente: true,
                    ordem: nextOrder
                }]);

                if (!result.success) throw new Error(result.error);

                if (result.data && result.data[0]) {
                    const dbImg = result.data[0] as PostImage;
                    setGroupedPosts(prev => prev.map(p => {
                        if (p.id === postId) {
                            const newImages = [...p.images, dbImg];
                            return {
                                ...p,
                                images: newImages,
                                postType: p.postType
                            };
                        }
                        return p;
                    }));
                }
            }
        } catch (error) {
            console.error("Error setting cover:", error);
            alert("Erro ao salvar a capa do Reels.");
        } finally {
            setIsScheduling(false);
        }
    };

    const handleAddImage = async (postId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const post = groupedPosts.find(p => p.id === postId);
        if (!post) return;

        const filesArray = Array.from(files);

        // Validation based on post type
        if (post.postType !== "CARROSSEL" && filesArray.length > 1) {
            alert("Este tipo de postagem aceita apenas uma imagem/vídeo. Mude para CARROSSEL para adicionar mais.");
            return;
        }

        if (post.postType !== "CARROSSEL" && post.images.length >= 1) {
            alert("Este tipo de postagem aceita apenas uma imagem/vídeo. Mude para CARROSSEL para adicionar mais.");
            return;
        }

        // Handle multiple files
        if (filesArray.length > 0) {
            const images = filesArray.filter(f => !isVideo(f.name));
            const videos = filesArray.filter(f => isVideo(f.name));

            // 1. Process videos (upload directly)
            if (videos.length > 0) {
                setIsScheduling(true);
                setUploadProgress(prev => ({ ...prev, [postId]: 0 }));
                
                try {
                    let completedCount = 0;
                    for (const file of videos) {
                        await handleUploadFile(postId, file);
                        completedCount++;
                        const totalProgress = Math.round((completedCount * 100) / videos.length);
                        setUploadProgress(prev => ({ ...prev, [postId]: totalProgress }));
                    }
                } catch (err) {
                    console.error("Error uploading videos:", err);
                } finally {
                    setIsScheduling(false);
                }
            }

            // 2. Process images (sequential editor)
            if (images.length > 0) {
                setEditQueue(images);
                setActivePostId(postId);
                await prepareNextInQueue(images[0]);
            }
        }
    };

    const handleSaveEditedImage = async (croppedBase64: string) => {
        if (!activePostId) return;

        const post = groupedPosts.find(p => String(p.id) === String(activePostId));
        if (!post) return;

        setIsScheduling(true);
        try {
            const uploadResult = await serverUploadImage(croppedBase64, 'temp-files');
            if (uploadResult.success && uploadResult.url) {
                const publicUrl = uploadResult.url;
                const nextOrder = post.images.length;

                const result = await insertSchedulerPostAction([{
                    nome_empresa: client.name,
                    imagem: publicUrl,
                    formato: post.formato,
                    descricao: post.caption,
                    publicado: false,
                    veiculo_gerado: post.veiculo_gerado,
                    adicionado_manualmente: true,
                    ordem: nextOrder
                }]);

                if (!result.success) throw new Error(result.error);

                if (result.data && result.data[0]) {
                    const dbImg = result.data[0] as PostImage;
                    setGroupedPosts(prev => prev.map(p => {
                        if (String(p.id) === String(activePostId)) {
                            const newImages = [...p.images, dbImg];
                            return {
                                ...p,
                                images: newImages,
                                postType: (p.formato === "FEED" || p.formato === "VENDIDO FEED") && newImages.length > 1 && p.postType !== "REELS" ? "CARROSSEL" : p.postType
                            };
                        }
                        return p;
                    }));
                    setCarouselIndices(prev => ({ ...prev, [String(activePostId)]: post.images.length }));
                }
            } else if (uploadResult.success === false) {
                throw new Error(uploadResult.error || "Erro no upload.");
            }
        } catch (error: any) {
            console.error("Error saving edited image:", error);
            alert("Erro ao salvar imagem: " + error.message);
        } finally {
            setIsScheduling(false);
            
            // Critical Fix: Always close the editor after an action
            setIsEditorOpen(false);
            setCurrentEditBase64(null);

            // Handle the queue progression
            const newQueue = [...editQueue];
            newQueue.shift();
            setEditQueue(newQueue);
            
            if (newQueue.length > 0) {
                // If more images, reopen for the next one after a tiny delay
                setTimeout(() => {
                    prepareNextInQueue(newQueue[0]);
                }, 100);
            } else {
                setActivePostId(null);
            }
        }
    };

    const removeImageFromPost = async (postId: string, imgIndex: number) => {
        const post = groupedPosts.find(p => p.id === postId);
        if (!post) return;

        const imgToDelete = post.images[imgIndex];

        // Delete from DB if it has a real ID
        if (typeof imgToDelete.id === 'number') {
            const result = await deleteSchedulerImageAction(imgToDelete.id);
            if (!result.success) {
                console.error("Error deleting image from server:", result.error);
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

    const handleSchedule = async (isInstant: boolean = false) => {
        if (!currentPost) return;

        const webhookAgendar = "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/agendar_postagem";
        
        if (!client.facebookId || !client.instagramId || !client.token) {
            alert("Não tem todas informações de ids e token necessarias para fazer a publicação.");
            return;
        }

        if (!isInstant && (!scheduleDate || !scheduleTime)) {
            alert("Selecione data e hora.");
            return;
        }

        setIsScheduling(true);
        try {
            // Force save caption if pending
            if (captionTimeoutRef.current[currentPost.id]) {
                clearTimeout(captionTimeoutRef.current[currentPost.id]);
                delete captionTimeoutRef.current[currentPost.id];
                await updateCaptionBase(currentPost.id, currentPost.caption);
            }

            // Respect Brasilia Timezone (UTC-3)
            let scheduledDateTime: Date;
            if (isInstant) {
                scheduledDateTime = new Date();
            } else {
                scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
            }

            if (isInstant) {
                const payload = {
                    client: client.name,
                    facebook_id: client.facebookId,
                    instagram_id: client.instagramId,
                    token: client.token,
                    images: currentPost.images.map(img => img.imagem),
                    video: currentPost.images.find(img => isVideo(img.imagem))?.imagem,
                    reels_cover: currentPost.images.find(img => !isVideo(img.imagem))?.imagem,
                    description: currentPost.caption,
                    format: currentPost.formato,
                    post_type: currentPost.postType,
                    scheduled_at: scheduledDateTime.toISOString(),
                    scheduled_at_local: "",
                    timezone: "America/Sao_Paulo",
                    timezone_offset: scheduledDateTime.getTimezoneOffset(),
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

                const selectedIds = currentPost.images
                    .map(img => img.id)
                    .filter(id => typeof id === 'number');

                if (selectedIds.length > 0) {
                    const result = await updateSchedulerRecordAction(selectedIds, { 
                        publicado: true,
                        descricao: currentPost.caption 
                    });

                    if (!result.success) console.error("Error updating published status via server:", result.error);
                }
            } else {
                // Scheduling for later: Update DB only
                const selectedIds = currentPost.images
                    .map(img => img.id)
                    .filter(id => typeof id === 'number');

                if (selectedIds.length > 0) {
                    const result = await updateSchedulerRecordAction(selectedIds, { 
                        data_agendamento: scheduledDateTime.toISOString(),
                        descricao: currentPost.caption 
                    });

                    if (!result.success) throw new Error(result.error);
                }
            }

            // Remove from local state
            setGroupedPosts(prev => prev.filter(p => p.id !== currentPost.id));

            alert(isInstant ? "Postagem enviada com sucesso!" : "Agendamento realizado com sucesso! O post será processado automaticamente no horário selecionado.");
            setIsScheduleModalOpen(false);
            setScheduleDate("");
            setScheduleTime("");
            setCurrentPost(null);

        } catch (error) {
            console.error("Scheduling error:", error);
            alert("Erro ao realizar a operação: " + (error as Error).message);
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

    const filteredPosts = groupedPosts.filter(p => {
        if (viewFilter === "STORY") {
            return p.formato === "STORY" || p.formato === "STORIES";
        }
        return p.formato === viewFilter;
    });

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
                        onClick={() => setViewFilter("REELS")}
                        className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${viewFilter === "REELS" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        REELS
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
                                        isVideo(post.images[currentIndex].imagem) ? (
                                            <video
                                                src={getProxiedUrl(post.images[currentIndex].imagem)}
                                                className="w-full h-full object-contain"
                                                controls
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={getProxiedUrl(post.images[currentIndex].imagem)}
                                                alt="Post"
                                                className="w-full h-full object-contain"
                                            />
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-zinc-900/50">
                                            <Plus size={48} className="opacity-20 mb-2" />
                                            <p className="text-sm font-medium opacity-50">Nenhuma imagem adicionada</p>
                                        </div>
                                    )}

                                    {/* Upload Progress Overlay */}
                                    {uploadProgress[post.id] !== undefined && (
                                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                                            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                                <div 
                                                    className="h-full bg-indigo-500 transition-all duration-300" 
                                                    style={{ width: `${uploadProgress[post.id]}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                                                Carregando... {uploadProgress[post.id]}%
                                            </p>
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
                                        </>
                                    )}

                                    {totalImages > 0 && (
                                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {totalImages > 1 && (
                                                <>
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
                                                </>
                                            )}
                                            <button
                                                onClick={() => removeImageFromPost(post.id, currentIndex)}
                                                className="w-8 h-8 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-500"
                                                title="Remover item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Empty Post Placeholder */}
                                    {/* (Moved logic above for better safety) */}

                                    {/* Add Image Button */}

                                    {/* Add Image Button */}
                                    {((post.postType === "CARROSSEL") || (post.images.length === 0) || (post.postType === "REELS" && post.images.length < 2)) && (
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            {(post.formato === "REELS" || post.formato === "VENDIDO REELS") && (
                                                <>
                                                    {post.images.some(img => isVideo(img.imagem)) ? (
                                                        <button 
                                                            onClick={() => {
                                                                setCoverPickerPost(post);
                                                                setIsCoverPickerOpen(true);
                                                            }}
                                                            className="h-10 px-4 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 font-bold text-xs"
                                                        >
                                                            CAPA REELS
                                                        </button>
                                                    ) : (
                                                        <label className="cursor-pointer">
                                                            <div className="h-10 px-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 font-bold text-xs">
                                                                SÓ VÍDEO
                                                            </div>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="video/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleUploadFile(post.id, file);
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </>
                                            )}
                                            <label className="cursor-pointer">
                                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 font-bold">
                                                    <Plus size={20} />
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*,video/*"
                                                    multiple={post.postType === "CARROSSEL"}
                                                    onChange={(e) => handleAddImage(post.id, e.target.files)}
                                                />
                                            </label>
                                        </div>
                                    )}

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
                                            {totalImages > 0 ? currentIndex + 1 : 0} / {totalImages} Imagem(ns)
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                            {format(new Date(post.created_at), "dd MMM yyyy", { locale: ptBR })}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <textarea
                                            value={post.caption}
                                            onChange={(e) => updateCaption(post.id, e.target.value)}
                                            placeholder="Escreva uma legenda..."
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-gray-200 resize-y focus:ring-1 focus:ring-indigo-500 p-3 min-h-[100px]"
                                        />
                                        {savingCaptions[post.id] && (
                                            <div className="absolute bottom-2 right-2 flex items-center space-x-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/5">
                                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                                                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Salvando...</span>
                                            </div>
                                        )}
                                    </div>

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
                                <div className="w-16 h-16 rounded-md overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                                    {isVideo(currentPost.images[0].imagem) ? (
                                        <video src={currentPost.images[0].imagem} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={currentPost.images[0].imagem} className="w-full h-full object-cover" />
                                    )}
                                </div>
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
                        <Button variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => handleSchedule(true)}
                            disabled={isScheduling}
                            className="!bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold"
                        >
                            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Enviar Agora
                        </Button>
                        <Button
                            onClick={() => handleSchedule(false)}
                            disabled={isScheduling}
                            className="!bg-green-400 hover:!bg-green-500 !text-slate-950 font-bold"
                        >
                            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
                            Agendar
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
                                            setNewPostFormat("REELS");
                                            setNewPostType("REELS");
                                        }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${newPostFormat === "REELS" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                                    >
                                        REELS
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
                                    {newPostFormat === "REELS" ? (
                                        <option value="REELS" className="bg-[#1a1a1a]">VÍDEO</option>
                                    ) : newPostFormat === "FEED" ? (
                                        <>
                                            <option value="ESTATICA" className="bg-[#1a1a1a]">ESTÁTICA</option>
                                            <option value="CARROSSEL" className="bg-[#1a1a1a]">CARROSSEL</option>
                                        </>
                                    ) : (
                                        <option value="IMAGEM" className="bg-[#1a1a1a]">IMAGEM</option>
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
            <ImageEditor
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditQueue([]);
                    setActivePostId(null);
                }}
                imageUrl={currentEditBase64}
                onSave={handleSaveEditedImage}
                isSaving={isScheduling}
            />

            {/* Cover Picker Modal */}
            {coverPickerPost && (
                <CoverPickerModal
                    isOpen={isCoverPickerOpen}
                    onClose={() => {
                        setIsCoverPickerOpen(false);
                        setCoverPickerPost(null);
                    }}
                    videoUrl={coverPickerPost.images.find(img => isVideo(img.imagem))?.imagem || ""}
                    onSelect={(image) => handleSelectCover(coverPickerPost.id, image)}
                />
            )}
        </div>
    );
}
