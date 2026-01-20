import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Check, Loader2, Send } from "lucide-react";

import { useStore, Client } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface PostImage {
    id: number;
    created_at: string;
    nome_empresa: string;
    imagem: string; // URL
    formato: string;
    descricao: string;
    publicado: boolean;
}

export function PostScheduler({ client }: { client: Client }) {
    const [images, setImages] = useState<PostImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Scheduling State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [description, setDescription] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);

    useEffect(() => {
        fetchImages();
    }, [client.name]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            // Fetch un-published images for this company
            const { data, error } = await supabase
                .from("publicacoes_design_online")
                .select("*")
                .eq("nome_empresa", client.name)
                .eq("publicado", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setImages(data || []);
        } catch (error) {
            console.error("Error fetching images:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleOpenModal = () => {
        setDescription("");
        setScheduleDate("");
        setScheduleTime("");
        setIsScheduleModalOpen(true);
    };

    const handleSchedule = async () => {
        if (!client.webhookPostagens) {
            alert("Configure o Webhook de Postagens nas configurações do cliente.");
            return;
        }
        if (!scheduleDate || !scheduleTime) {
            alert("Selecione data e hora.");
            return;
        }

        setIsScheduling(true);
        try {
            const selectedImages = images.filter(img => selectedIds.includes(img.id));
            const imageUrls = selectedImages.map(img => img.imagem);
            const descriptions = selectedImages.map(img => img.descricao).join("\n\n");

            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

            const payload = {
                client: client.name,
                images: imageUrls,
                description: descriptions, // Concatenated descriptions
                format: selectedImages[0]?.formato || "feed", // Assume first format or default
                scheduled_at: scheduledDateTime.toISOString(),
                is_carousel: selectedImages.length > 1
            };

            // Send to Webhook
            const res = await fetch(client.webhookPostagens, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Falha ao enviar para o webhook");

            // Mark as published in Supabase (Optimistic update)
            const { error } = await supabase
                .from("publicacoes_design_online")
                .update({ publicado: true })
                .in("id", selectedIds);

            if (error) console.error("Error updating published status:", error);

            alert("Agendamento enviado com sucesso!");
            setIsScheduleModalOpen(false);
            setSelectedIds([]);
            fetchImages(); // Refresh list

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Imagens Disponíveis</h2>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.length} selecionada(s)
                    </span>
                    <Button
                        disabled={selectedIds.length === 0}
                        onClick={handleOpenModal}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        Agendar Postagem
                    </Button>
                </div>
            </div>

            {images.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>Nenhuma imagem pendente para este cliente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            onClick={() => toggleSelection(img.id)}
                            className={cn(
                                "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 aspect-square",
                                selectedIds.includes(img.id)
                                    ? "border-green-500 ring-2 ring-green-500/20"
                                    : "border-transparent hover:border-white/20"
                            )}
                        >
                            <img
                                src={img.imagem}
                                alt="Post"
                                className="w-full h-full object-cover"
                            />

                            {/* Overlay Info */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <p className="text-xs text-white font-medium capitalize">{img.formato}</p>
                                <p className="text-[10px] text-gray-300 line-clamp-2">{img.descricao}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {format(new Date(img.created_at), "dd/MM/yyyy HH:mm")}
                                </p>
                            </div>

                            {/* Checkmark */}
                            {selectedIds.includes(img.id) && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                                    <Check size={12} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Schedule Modal */}
            <Modal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                title="Agendar Postagem"
                className="max-w-md"
            >
                <div className="space-y-6">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-sm text-gray-300 mb-2">
                            Você está agendando <span className="text-white font-bold">{selectedIds.length}</span> imagem(ns)
                            {selectedIds.length > 1 && " como Carrossel"}.
                        </p>
                        <div className="flex -space-x-2 overflow-hidden py-2">
                            {images.filter(i => selectedIds.includes(i.id)).slice(0, 5).map(i => (
                                <img key={i.id} src={i.imagem} className="w-10 h-10 rounded-full border-2 border-background object-cover" />
                            ))}
                            {selectedIds.length > 5 && (
                                <div className="w-10 h-10 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-xs text-white">
                                    +{selectedIds.length - 5}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Legenda / Descrição</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="flex w-full rounded-md border border-input bg-black/20 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                            placeholder="Escreva a legenda para esta postagem..."
                        />
                    </div>

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
                            className="!bg-green-600 hover:!bg-green-700 !text-white font-bold"
                        >
                            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Confirmar Agendamento
                        </Button>
                    </div>
                </div>
            </Modal >
        </div >
    );
}
