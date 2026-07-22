"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BarChart2, Eye, Play, Facebook, Instagram, ShieldAlert, CheckCircle2, XCircle, Search } from "lucide-react";

interface StoryPost {
    id: number;
    created_at: string;
    nome_cliente: string;
    nome_veiculo: string;
    id_tarefa: string;
    url_imagem: string;
    postado: boolean;
    rede_social: "FACEBOOK" | "INSTAGRAM" | string;
}

interface ClientSummary {
    nome_cliente: string;
    totalVeiculos: number;
    postadoFace: number;
    naoPostadoFace: number;
    postadoInsta: number;
    naoPostadoInsta: number;
}

export default function ControleStoriesPage() {
    const { user } = useStore();
    const [posts, setPosts] = useState<StoryPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClientFilter, setSelectedClientFilter] = useState("");

    const fetchStoriesData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const { data, error } = await supabase
                .from("design_online_stories_veiculos")
                .select("*")
                .order("created_at", { ascending: false })
                .range(0, 5000);

            if (error) throw error;
            setPosts((data || []) as StoryPost[]);
        } catch (err: any) {
            console.error("Erro ao carregar dados do design_online_stories_veiculos:", err);
            alert("Erro ao buscar dados do banco de dados: " + err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStoriesData();
    }, []);

    // Restringir acesso apenas a administradores master
    if (!user || user.role !== "master") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
                <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
                <p className="text-gray-400 max-w-md">
                    Desculpe, esta página está disponível apenas para administradores com nível de acesso Master.
                </p>
            </div>
        );
    }

    // 1. Processar dados para a visualização agrupada por cliente (Métricas)
    const clientSummaries: Record<string, ClientSummary> = {};

    // Agrupar itens por veículo para contar veículos únicos
    const vehicleKeysByClient: Record<string, Set<string>> = {};

    posts.forEach((post) => {
        const cName = post.nome_cliente || "Sem Cliente";
        const vName = post.nome_veiculo || "Sem Veículo";

        if (!clientSummaries[cName]) {
            clientSummaries[cName] = {
                nome_cliente: cName,
                totalVeiculos: 0,
                postadoFace: 0,
                naoPostadoFace: 0,
                postadoInsta: 0,
                naoPostadoInsta: 0,
            };
        }

        if (!vehicleKeysByClient[cName]) {
            vehicleKeysByClient[cName] = new Set();
        }
        vehicleKeysByClient[cName].add(`${vName}-${post.id_tarefa}`);

        const summary = clientSummaries[cName];
        if (post.rede_social === "FACEBOOK") {
            if (post.postado) summary.postadoFace++;
            else summary.naoPostadoFace++;
        } else if (post.rede_social === "INSTAGRAM") {
            if (post.postado) summary.postadoInsta++;
            else summary.naoPostadoInsta++;
        }
    });

    // Atribuir o total de veículos únicos para cada cliente
    Object.keys(clientSummaries).forEach((cName) => {
        clientSummaries[cName].totalVeiculos = vehicleKeysByClient[cName]?.size || 0;
    });

    const summariesList = Object.values(clientSummaries).sort((a, b) =>
        a.nome_cliente.localeCompare(b.nome_cliente)
    );

    // Obter todos os clientes únicos para popular o filtro do histórico
    const uniqueClients = Array.from(
        new Set(posts.map((p) => p.nome_cliente || "Sem Cliente"))
    ).sort();

    // 2. Agrupar postagens detalhadas por veículo + id_tarefa para exibição na tabela/cards
    const groupedVehicles: Record<string, {
        nome_cliente: string;
        nome_veiculo: string;
        id_tarefa: string;
        url_imagem: string;
        created_at: string;
        facebookPostado: boolean | null;
        facebookId: number | null;
        instagramPostado: boolean | null;
        instagramId: number | null;
    }> = {};

    posts.forEach((post) => {
        const vKey = `${post.nome_cliente}||${post.nome_veiculo}||${post.id_tarefa}`;

        if (!groupedVehicles[vKey]) {
            groupedVehicles[vKey] = {
                nome_cliente: post.nome_cliente || "Sem Cliente",
                nome_veiculo: post.nome_veiculo || "Sem Veículo",
                id_tarefa: post.id_tarefa || "",
                url_imagem: post.url_imagem || "",
                created_at: post.created_at,
                facebookPostado: null,
                facebookId: null,
                instagramPostado: null,
                instagramId: null,
            };
        }

        const item = groupedVehicles[vKey];
        if (post.rede_social === "FACEBOOK") {
            item.facebookPostado = post.postado;
            item.facebookId = post.id;
        } else if (post.rede_social === "INSTAGRAM") {
            item.instagramPostado = post.postado;
            item.instagramId = post.id;
        }
    });

    // Filtrar a lista detalhada para mostrar APENAS o que NÃO foi postado (pelo menos uma rede social pendente/falsa)
    const filteredGroupedVehicles = Object.values(groupedVehicles).filter((v) => {
        // Verifica se tem pelo menos uma rede social marcada como pendente (false)
        const hasPendingFacebook = v.facebookPostado === false;
        const hasPendingInstagram = v.instagramPostado === false;
        const isPending = hasPendingFacebook || hasPendingInstagram;

        if (!isPending) return false;

        const matchSearch =
            v.nome_veiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.id_tarefa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase());

        const matchClient = !selectedClientFilter || v.nome_cliente === selectedClientFilter;

        return matchSearch && matchClient;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                        <BarChart2 className="text-indigo-400 w-8 h-8" />
                        Controle de Postagens - Stories Clientes
                    </h1>
                    <p className="text-muted-foreground">
                        Acompanhe o status e a publicação dos stories nas redes sociais. Os dados expiram diariamente às 23h.
                    </p>
                </div>
                <Button
                    onClick={() => fetchStoriesData(true)}
                    disabled={refreshing}
                    variant="outline"
                    className="self-start md:self-auto border-white/10 hover:bg-white/5 text-white"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
                    Atualizar Dados
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <>
                    {/* Resumo por Clientes */}
                    <div className="grid grid-cols-1 gap-6">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Painel de Métricas de Clientes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {summariesList.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-muted-foreground bg-white/5 border border-dashed border-white/10 rounded-xl">
                                    Nenhum dado de cliente disponível hoje.
                                </div>
                            ) : (
                                summariesList.map((summary) => (
                                    <Card key={summary.nome_cliente} className="p-4 bg-black/40 border-white/10 flex flex-col justify-between">
                                        <div>
                                            <p className="text-base font-bold text-indigo-400 truncate mb-3">{summary.nome_cliente}</p>
                                            
                                            <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                                <div className="bg-white/5 p-2 rounded">
                                                    <p className="text-lg font-bold text-white">{summary.totalVeiculos}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">Veículos</p>
                                                </div>
                                                <div className="bg-green-500/5 border border-green-500/10 p-2 rounded">
                                                    <p className="text-lg font-bold text-green-400">
                                                        {summary.postadoFace + summary.postadoInsta}
                                                    </p>
                                                    <p className="text-[9px] text-green-500 font-bold uppercase">Postados</p>
                                                </div>
                                                <div className="bg-red-500/5 border border-red-500/10 p-2 rounded">
                                                    <p className="text-lg font-bold text-red-400">
                                                        {summary.naoPostadoFace + summary.naoPostadoInsta}
                                                    </p>
                                                    <p className="text-[9px] text-red-500 font-bold uppercase">Pendentes</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-t border-white/5 pt-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 flex items-center gap-1.5"><Facebook size={12} className="text-blue-400" /> Facebook:</span>
                                                    <span className="font-semibold text-white">
                                                        {summary.postadoFace} / {summary.postadoFace + summary.naoPostadoFace} postados
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 flex items-center gap-1.5"><Instagram size={12} className="text-pink-400" /> Instagram:</span>
                                                    <span className="font-semibold text-white">
                                                        {summary.postadoInsta} / {summary.postadoInsta + summary.naoPostadoInsta} postados
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Filtros e Busca */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="relative w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Buscar veículo ou tarefa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-md h-10 pl-9 pr-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                        </div>

                        <div className="w-full md:w-60">
                            <select
                                value={selectedClientFilter}
                                onChange={(e) => setSelectedClientFilter(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Todos os Clientes</option>
                                {uniqueClients.map((client) => (
                                    <option key={client} value={client}>{client}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Lista Detalhada */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Histórico de Stories do Dia</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredGroupedVehicles.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-muted-foreground bg-white/5 border border-dashed border-white/10 rounded-xl">
                                    Nenhum veículo encontrado com os filtros selecionados.
                                </div>
                            ) : (
                                filteredGroupedVehicles.map((vehicle) => (
                                    <Card key={`${vehicle.nome_cliente}-${vehicle.nome_veiculo}-${vehicle.id_tarefa}`} className="p-4 bg-black/40 border-white/10 flex gap-4">
                                        {/* Imagem do Story */}
                                        {vehicle.url_imagem && (
                                            <div className="w-20 h-28 rounded-lg overflow-hidden relative border border-white/10 shrink-0 bg-black">
                                                <img
                                                    src={vehicle.url_imagem}
                                                    alt={vehicle.nome_veiculo}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Informações */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase truncate">
                                                        {vehicle.nome_cliente}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 font-bold bg-white/5 px-1.5 py-0.5 rounded">
                                                        Tarefa: {vehicle.id_tarefa}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-white truncate mt-1" title={vehicle.nome_veiculo}>
                                                    {vehicle.nome_veiculo}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    Gerado às: {new Date(vehicle.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}h
                                                </p>
                                            </div>

                                            {/* Status das Redes Sociais */}
                                            <div className="flex gap-3 mt-4">
                                                {/* Facebook Status */}
                                                <div className="flex-1 bg-black/30 rounded py-1.5 px-2.5 flex justify-between items-center border border-white/5">
                                                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Facebook size={10} className="text-blue-400" /> FACE</span>
                                                    {vehicle.facebookPostado === true ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                    ) : vehicle.facebookPostado === false ? (
                                                        <XCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                                    ) : (
                                                        <span className="text-[8px] text-gray-500 font-bold">N/A</span>
                                                    )}
                                                </div>

                                                {/* Instagram Status */}
                                                <div className="flex-1 bg-black/30 rounded py-1.5 px-2.5 flex justify-between items-center border border-white/5">
                                                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Instagram size={10} className="text-pink-400" /> INSTA</span>
                                                    {vehicle.instagramPostado === true ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                    ) : vehicle.instagramPostado === false ? (
                                                        <XCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                                    ) : (
                                                        <span className="text-[8px] text-gray-500 font-bold">N/A</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
