'use client';

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchGlobalScheduledPostsAction } from "@/app/actions/scheduler";
import { Card } from "@/components/ui/card";

interface GlobalScheduledPost {
    id: string;
    veiculo_gerado: string;
    formato: string;
    data_agendamento: string;
    nome_empresa: string;
    publicado: boolean;
    publicado_instagram: boolean;
}

function getTodayBrazil(): string {
    const now = new Date();
    const brazil = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const yyyy = brazil.getFullYear();
    const mm = String(brazil.getMonth() + 1).padStart(2, '0');
    const dd = String(brazil.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function GlobalScheduleWidget({ isSold = false }: { isSold?: boolean }) {
    const [selectedDate, setSelectedDate] = useState<string>(getTodayBrazil());
    const [posts, setPosts] = useState<GlobalScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async (date: string) => {
        setLoading(true);
        try {
            const result = await fetchGlobalScheduledPostsAction(date);
            if (result.success && result.data) {
                // Group by date+vehicle+company to deduplicate carousel images
                const groups: Record<string, GlobalScheduledPost> = {};
                result.data.forEach((img: any) => {
                    const isSoldFormat = img.formato && img.formato.toUpperCase().startsWith("VENDIDO ");
                    
                    // Filter based on the dashboard context
                    if (isSold ? !isSoldFormat : isSoldFormat) {
                        return;
                    }

                    const vehicle = img.veiculo_gerado || "Sem Veículo";
                    const key = `${img.data_agendamento}-${vehicle}-${img.nome_empresa}`;
                    if (!groups[key]) {
                        groups[key] = {
                            id: key,
                            veiculo_gerado: vehicle,
                            formato: img.formato,
                            data_agendamento: img.data_agendamento,
                            nome_empresa: img.nome_empresa,
                            publicado: img.publicado || false,
                            publicado_instagram: img.publicado_instagram || false,
                        };
                    }
                });
                const sorted = Object.values(groups).sort(
                    (a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime()
                );
                setPosts(sorted);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error("Error fetching global schedule:", error);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts(selectedDate);
    }, [selectedDate]);

    const today = getTodayBrazil();

    const formattedSelectedDate = format(new Date(`${selectedDate}T12:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR });
    const isToday = selectedDate === today;

    const totalPosts = posts.length;
    const postedFace = posts.filter(p => p.publicado).length;
    const postedInsta = posts.filter(p => p.publicado_instagram).length;

    return (
        <Card className="bg-gray-900/50 border-white/5 p-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
                    Cronograma Global
                </h3>
                {isToday && (
                    <span className="text-xs bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-full px-2 py-0.5 font-semibold">
                        HOJE
                    </span>
                )}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-4 bg-black/20 rounded-lg p-2">
                <button
                    onClick={() => setSelectedDate(d => addDays(d, -1))}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-transparent text-white text-sm text-center border-none outline-none cursor-pointer [color-scheme:dark]"
                    />
                </div>
                <button
                    onClick={() => setSelectedDate(d => addDays(d, 1))}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Formatted date label */}
            <p className="text-xs text-gray-400 capitalize text-center mb-3">{formattedSelectedDate}</p>

            {/* Stats bar */}
            {!loading && totalPosts > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-white/5 rounded p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
                        <p className="text-lg font-bold text-white">{totalPosts}</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Face</p>
                        <p className="text-lg font-bold text-green-400">{postedFace}</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Insta</p>
                        <p className="text-lg font-bold text-green-400">{postedInsta}</p>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex-1 flex justify-center items-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
            ) : posts.length === 0 ? (
                <div className="flex-1 flex justify-center items-center py-12 text-gray-500 text-sm">
                    Nenhuma postagem agendada para este dia.
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto pr-1 max-h-[500px] custom-scrollbar">
                    {posts.map((post) => {
                        const scheduledDate = new Date(post.data_agendamento);
                        const now = new Date();
                        const isPast = scheduledDate < now;

                        return (
                            <div
                                key={post.id}
                                className={`p-3 rounded-lg border transition-colors ${
                                    post.publicado && post.publicado_instagram
                                        ? 'bg-green-900/10 border-green-500/20'
                                        : isPast && !post.publicado
                                        ? 'bg-red-900/10 border-red-500/20'
                                        : 'bg-indigo-900/10 border-indigo-500/15'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0 mr-3">
                                        <p className="text-xs font-bold text-indigo-400 truncate">{post.nome_empresa}</p>
                                        <p className="text-sm font-bold text-white truncate" title={post.veiculo_gerado}>
                                            {post.veiculo_gerado}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{post.formato}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-sm font-bold ${isPast ? 'text-gray-400' : 'text-white'}`}>
                                            {format(scheduledDate, "HH:mm")}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <div className="flex-1 bg-black/20 rounded py-1 px-2 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold">FACE</span>
                                        {post.publicado
                                            ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                                            : isPast
                                            ? <XCircle className="w-3 h-3 text-red-500" />
                                            : <Clock className="w-3 h-3 text-yellow-500" />
                                        }
                                    </div>
                                    <div className="flex-1 bg-black/20 rounded py-1 px-2 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold">INSTA</span>
                                        {post.publicado_instagram
                                            ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                                            : isPast && post.publicado
                                            ? <XCircle className="w-3 h-3 text-red-500" />
                                            : <Clock className="w-3 h-3 text-gray-500" />
                                        }
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
