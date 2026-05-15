'use client';

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
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

export default function GlobalScheduleWidget() {
    const [posts, setPosts] = useState<GlobalScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const result = await fetchGlobalScheduledPostsAction();
                if (result.success && result.data) {
                    // Group by date, vehicle and company to avoid showing duplicates for carousels
                    const groups: Record<string, GlobalScheduledPost> = {};
                    result.data.forEach((img: any) => {
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
                    
                    const sorted = Object.values(groups).sort((a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime());
                    setPosts(sorted);
                }
            } catch (error) {
                console.error("Error fetching global schedule:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) {
        return (
            <Card className="bg-gray-900/50 border-white/5 p-6 flex flex-col h-[400px]">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
                    Próximas Postagens (Global)
                </h3>
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
            </Card>
        );
    }

    if (posts.length === 0) {
        return (
            <Card className="bg-gray-900/50 border-white/5 p-6 flex flex-col h-[400px]">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
                    Próximas Postagens (Global)
                </h3>
                <div className="flex-1 flex justify-center items-center text-gray-500 text-sm">
                    Nenhuma postagem agendada para os próximos dias.
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-gray-900/50 border-white/5 p-6 flex flex-col h-full max-h-[500px]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center shrink-0">
                <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
                Cronograma Global
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {posts.map((post) => {
                    const scheduledDate = new Date(post.data_agendamento);
                    const isPast = scheduledDate < new Date();
                    const isNext = !isPast && new Date().getTime() - scheduledDate.getTime() < 0; // The closest in the future

                    return (
                        <div key={post.id} className={`p-3 rounded-lg border ${isPast ? 'bg-white/5 border-white/5' : 'bg-indigo-900/20 border-indigo-500/20'} relative`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-xs font-bold text-indigo-400">{post.nome_empresa}</p>
                                    <p className="text-sm font-bold text-white truncate max-w-[200px]" title={post.veiculo_gerado}>
                                        {post.veiculo_gerado}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-bold ${isPast ? 'text-gray-400' : 'text-indigo-300'}`}>
                                        {format(scheduledDate, "dd/MM", { locale: ptBR })}
                                    </p>
                                    <p className={`text-sm font-bold ${isPast ? 'text-gray-500' : 'text-white'}`}>
                                        {format(scheduledDate, "HH:mm")}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                                <div className="flex-1 bg-black/20 rounded py-1 px-2 flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Face</span>
                                    {post.publicado ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    ) : (
                                        isPast ? <XCircle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3 text-yellow-500" />
                                    )}
                                </div>
                                <div className="flex-1 bg-black/20 rounded py-1 px-2 flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Insta</span>
                                    {post.publicado_instagram ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    ) : (
                                        (isPast && post.publicado) ? <XCircle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3 text-gray-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
