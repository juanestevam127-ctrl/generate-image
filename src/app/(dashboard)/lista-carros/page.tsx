"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/lib/store-context";
import {
    ControleRelatorioMelinaItem,
    getRelatoriosMelinaAction,
    getUazapiTokenAction,
    saveUazapiTokenAction,
    dispararRelatorioMelinaItemAction,
    dispararLoteRelatoriosMelinaAction,
    deleteRelatorioMelinaItemAction
} from "@/app/actions/relatorioMelina";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
    Loader2,
    RefreshCw,
    Send,
    Calendar as CalendarIcon,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    MessageSquare,
    Eye,
    Key,
    Save,
    Trash2,
    ShieldAlert,
    Phone,
    UserCheck,
    FileText,
    ChevronLeft,
    ChevronRight,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ListaCarrosPage() {
    const { user } = useStore();

    // Dados
    const [items, setItems] = useState<ControleRelatorioMelinaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Token UAZAPI
    const [uazapiToken, setUazapiToken] = useState("");
    const [isSavingToken, setIsSavingToken] = useState(false);
    const [isEditingToken, setIsEditingToken] = useState(false);

    // Filtros e Navegação
    const [selectedDate, setSelectedDate] = useState<string>(""); // YYYY-MM-DD
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"todos" | "sucesso" | "pendente" | "falha">("todos");

    // Modal de Visualização da Mensagem
    const [viewingItem, setViewingItem] = useState<ControleRelatorioMelinaItem | null>(null);

    // Estados de Ações
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [isSendingBatch, setIsSendingBatch] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // 1. Carregar dados e Token
    const loadData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const [relRes, tokRes] = await Promise.all([
                getRelatoriosMelinaAction(),
                getUazapiTokenAction()
            ]);

            if (relRes.success && relRes.data) {
                setItems(relRes.data);

                // Se não tiver data selecionada, seleciona o dia mais recente que possui registros ou hoje
                if (!selectedDate) {
                    if (relRes.data.length > 0) {
                        const mostRecent = relRes.data[0].created_at.split("T")[0];
                        setSelectedDate(mostRecent);
                    } else {
                        setSelectedDate(new Date().toISOString().split("T")[0]);
                    }
                }
            }

            if (tokRes.success && tokRes.token) {
                setUazapiToken(tokRes.token);
            }
        } catch (e: any) {
            console.error("Erro ao carregar lista de carros:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Salvar Token
    const handleSaveToken = async () => {
        if (!uazapiToken.trim()) return alert("Preencha o token da UAZAPI.");
        setIsSavingToken(true);
        try {
            const res = await saveUazapiTokenAction(uazapiToken);
            if (res.success) {
                alert("Token da UAZAPI salvo com sucesso!");
                setIsEditingToken(false);
            } else {
                alert("Erro ao salvar token: " + res.error);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setIsSavingToken(false);
        }
    };

    // 2. Mapeamento de Datas no Calendário com contadores
    const datesMap = useMemo(() => {
        const map: Record<string, { total: number; sucessos: number; falhas: number; pendentes: number }> = {};

        items.forEach((item) => {
            if (!item.created_at) return;
            const dateKey = item.created_at.split("T")[0]; // YYYY-MM-DD
            if (!map[dateKey]) {
                map[dateKey] = { total: 0, sucessos: 0, falhas: 0, pendentes: 0 };
            }

            map[dateKey].total++;

            const relOk = item["mensagem_relatório_enviada"];
            const melOk = item.mensagem_melina_enviada;

            if (relOk === true && melOk === true) {
                map[dateKey].sucessos++;
            } else if (relOk === false || melOk === false) {
                map[dateKey].falhas++;
            } else {
                map[dateKey].pendentes++;
            }
        });

        return map;
    }, [items]);

    // Ordenar datas distintas disponíveis
    const availableDates = useMemo(() => {
        const keys = Object.keys(datesMap);
        keys.sort((a, b) => b.localeCompare(a));
        return keys;
    }, [datesMap]);

    // 3. Itens filtrados para o dia selecionado
    const dayItems = useMemo(() => {
        if (!selectedDate) return [];
        return items.filter((item) => item.created_at?.startsWith(selectedDate));
    }, [items, selectedDate]);

    // 4. Itens filtrados por busca e status
    const filteredItems = useMemo(() => {
        return dayItems.filter((item) => {
            // Busca
            const q = searchTerm.toLowerCase();
            const matchClient = (item.cliente_enviado || "").toLowerCase().includes(q);
            const matchPhone = (item.telefone_grupo || "").toLowerCase().includes(q);
            const matchRel = (item.mensagem_relatorio || "").toLowerCase().includes(q);
            if (searchTerm && !matchClient && !matchPhone && !matchRel) return false;

            // Status
            const relOk = item["mensagem_relatório_enviada"];
            const melOk = item.mensagem_melina_enviada;
            const isFullSuccess = relOk === true && melOk === true;
            const hasFailure = relOk === false || melOk === false;
            const isPending = relOk === null || melOk === null;

            if (statusFilter === "sucesso") return isFullSuccess;
            if (statusFilter === "falha") return hasFailure;
            if (statusFilter === "pendente") return isPending && !hasFailure;

            return true;
        });
    }, [dayItems, searchTerm, statusFilter]);

    // 5. Contadores do dia selecionado
    const dayStats = useMemo(() => {
        let total = dayItems.length;
        let sucessos = 0;
        let falhas = 0;
        let pendentes = 0;

        dayItems.forEach((i) => {
            const relOk = i["mensagem_relatório_enviada"];
            const melOk = i.mensagem_melina_enviada;
            if (relOk === true && melOk === true) sucessos++;
            else if (relOk === false || melOk === false) falhas++;
            else pendentes++;
        });

        return { total, sucessos, falhas, pendentes };
    }, [dayItems]);

    // 6. Ação: Disparar individual
    const handleDispararItem = async (id: number) => {
        if (!uazapiToken) {
            return alert("Configure e salve o token da UAZAPI antes de disparar.");
        }

        setSendingId(id);
        try {
            const res = await dispararRelatorioMelinaItemAction(id, uazapiToken);
            if (res.success) {
                // Atualizar estado local
                const nowIso = new Date().toISOString();
                setItems((prev) =>
                    prev.map((i) =>
                        i.id === id
                            ? {
                                  ...i,
                                  "mensagem_relatório_enviada": true,
                                  mensagem_melina_enviada: true,
                                  horario_mensagem_relatorio_enviada: nowIso,
                                  horario_mensagem_melina_enviada: nowIso
                              }
                            : i
                    )
                );
                alert("Mensagens disparadas com sucesso!");
            } else {
                alert(`Erro no disparo: ${res.error}`);
                await loadData(true);
            }
        } catch (e: any) {
            alert("Erro ao disparar: " + e.message);
        } finally {
            setSendingId(null);
        }
    };

    // 7. Ação: Disparar em lote todos que não foram 100% enviados
    const handleDispararPendentesDoDia = async () => {
        if (!uazapiToken) {
            return alert("Configure e salve o token da UAZAPI antes de disparar.");
        }

        const pendentes = dayItems.filter(
            (i) => i["mensagem_relatório_enviada"] !== true || i.mensagem_melina_enviada !== true
        );

        if (pendentes.length === 0) {
            return alert("Todos os registros deste dia já foram enviados com sucesso!");
        }

        if (!confirm(`Deseja disparar as mensagens para os ${pendentes.length} cliente(s) pendentes deste dia?`)) {
            return;
        }

        setIsSendingBatch(true);
        try {
            const ids = pendentes.map((p) => p.id);
            const res = await dispararLoteRelatoriosMelinaAction(ids, uazapiToken);
            if (res.success) {
                alert(
                    `Disparo em lote concluído!\nSucessos: ${res.sucessos}\nFalhas: ${res.falhas}`
                );
            } else {
                alert("Erro no disparo em lote: " + res.error);
            }
            await loadData(true);
        } catch (e: any) {
            alert("Erro ao processar lote: " + e.message);
        } finally {
            setIsSendingBatch(false);
        }
    };

    // 8. Deletar registro
    const handleDeleteItem = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este registro?")) return;
        setDeletingId(id);
        try {
            const res = await deleteRelatorioMelinaItemAction(id);
            if (res.success) {
                setItems((prev) => prev.filter((i) => i.id !== id));
            } else {
                alert("Erro ao deletar: " + res.error);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setDeletingId(null);
        }
    };

    // Restringir a master
    if (!user || user.role !== "master") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
                <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
                <p className="text-gray-400 max-w-md">
                    Esta tela é exclusiva para administradores com nível de acesso Master.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
            {/* Topo / Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-xl">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                        <MessageSquare className="w-6 h-6 text-indigo-400" />
                        Lista de Carros & Relatórios Melina
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Acompanhe os disparos de conferência de veículos e envie mensagens aos grupos dos clientes.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 h-10"
                    >
                        {refreshing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-400" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2 text-indigo-400" />
                        )}
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Bloco de Configuração do Token UAZAPI */}
            <Card className="bg-slate-900/60 border-slate-800 shadow-md">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Key className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 max-w-xl">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-300">
                                    Token UAZAPI (Disparo WhatsApp)
                                </label>
                                {!isEditingToken && uazapiToken && (
                                    <button
                                        onClick={() => setIsEditingToken(true)}
                                        className="text-[11px] text-indigo-400 hover:underline"
                                    >
                                        Alterar token
                                    </button>
                                )}
                            </div>
                            {isEditingToken || !uazapiToken ? (
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Input
                                        type="password"
                                        value={uazapiToken}
                                        onChange={(e) => setUazapiToken(e.target.value)}
                                        placeholder="Cole aqui seu token da UAZAPI..."
                                        className="h-9 bg-slate-950 border-slate-700 text-xs text-white"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSaveToken}
                                        disabled={isSavingToken}
                                        className="!bg-indigo-600 hover:!bg-indigo-700 !text-white h-9 px-3 text-xs shrink-0"
                                    >
                                        {isSavingToken ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Save className="w-3.5 h-3.5 mr-1" />
                                        )}
                                        Salvar
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                                    ••••••••••••••••••••••••{uazapiToken.slice(-6)}
                                    <span className="ml-2 text-emerald-400 font-sans text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                        Ativo
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-400 md:text-right border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                        Dispara via: <code className="text-indigo-300">https://designonline.uazapi.com/send/text</code>
                    </div>
                </CardContent>
            </Card>

            {/* SELETOR DE DATAS / CALENDÁRIO VISUAL */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <CalendarIcon className="w-4 h-4 text-indigo-400" />
                        <span>Dias com Disparos Registrados</span>
                    </div>

                    {/* Input de Data Personalizada */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Ir para data:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Pílulas de Datas com contadores */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
                    {availableDates.length > 0 ? (
                        availableDates.map((dStr) => {
                            const isSelected = selectedDate === dStr;
                            const stats = datesMap[dStr];

                            // Formatar exibição (ex: Seg, 30/10)
                            const [ano, mes, dia] = dStr.split("-");
                            const dObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
                            const weekday = dObj.toLocaleDateString("pt-BR", { weekday: "short" });
                            const isMonday = dObj.getDay() === 1;

                            return (
                                <button
                                    key={dStr}
                                    onClick={() => setSelectedDate(dStr)}
                                    className={cn(
                                        "flex flex-col items-start px-3.5 py-2 rounded-lg border text-left transition-all shrink-0 min-w-[125px]",
                                        isSelected
                                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10"
                                            : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                                            {weekday} {isMonday && "⭐"}
                                        </span>
                                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                            {stats.total}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold mt-0.5">
                                        {dia}/{mes}
                                    </span>

                                    {/* Badges de Status do Dia */}
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                                        {stats.sucessos > 0 && (
                                            <span className="text-emerald-400 font-semibold flex items-center">
                                                ● {stats.sucessos} ok
                                            </span>
                                        )}
                                        {stats.falhas > 0 && (
                                            <span className="text-red-400 font-semibold flex items-center">
                                                ● {stats.falhas} erro
                                            </span>
                                        )}
                                        {stats.pendentes > 0 && (
                                            <span className="text-amber-400 font-semibold flex items-center">
                                                ● {stats.pendentes} pend
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <p className="text-xs text-slate-500 py-2">
                            Nenhum registro encontrado ainda. Quando o fluxo automatizado inserir clientes na tabela, eles aparecerão aqui.
                        </p>
                    )}
                </div>
            </div>

            {/* Painel de Métricas do Dia Selecionado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                    <span className="text-xs font-medium text-slate-400">Total de Clientes</span>
                    <p className="text-2xl font-bold text-white mt-1">{dayStats.total}</p>
                </div>
                <div className="bg-slate-900 border border-emerald-500/20 p-3.5 rounded-xl">
                    <span className="text-xs font-medium text-emerald-400">Enviados com Sucesso</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{dayStats.sucessos}</p>
                </div>
                <div className="bg-slate-900 border border-red-500/20 p-3.5 rounded-xl">
                    <span className="text-xs font-medium text-red-400">Com Falha no Disparo</span>
                    <p className="text-2xl font-bold text-red-400 mt-1">{dayStats.falhas}</p>
                </div>
                <div className="bg-slate-900 border border-amber-500/20 p-3.5 rounded-xl">
                    <span className="text-xs font-medium text-amber-400">Pendentes</span>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{dayStats.pendentes}</p>
                </div>
            </div>

            {/* Barra de Filtros e Disparo em Lote */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Campo de Busca */}
                    <div className="relative min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Buscar cliente, grupo, texto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-800 border-slate-700 pl-9 text-xs text-white h-9"
                        />
                    </div>

                    {/* Filtros de Status */}
                    <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
                        <button
                            onClick={() => setStatusFilter("todos")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-md font-medium transition-colors",
                                statusFilter === "todos"
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Todos ({dayItems.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter("sucesso")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-md font-medium transition-colors",
                                statusFilter === "sucesso"
                                    ? "bg-emerald-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Sucesso ({dayStats.sucessos})
                        </button>
                        <button
                            onClick={() => setStatusFilter("falha")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-md font-medium transition-colors",
                                statusFilter === "falha"
                                    ? "bg-red-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Falhas ({dayStats.falhas})
                        </button>
                        <button
                            onClick={() => setStatusFilter("pendente")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-md font-medium transition-colors",
                                statusFilter === "pendente"
                                    ? "bg-amber-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Pendentes ({dayStats.pendentes})
                        </button>
                    </div>
                </div>

                {/* Botão de Disparo em Lote */}
                {dayStats.falhas + dayStats.pendentes > 0 && (
                    <Button
                        size="sm"
                        onClick={handleDispararPendentesDoDia}
                        disabled={isSendingBatch}
                        className="!bg-emerald-600 hover:!bg-emerald-700 !text-white text-xs h-9 font-semibold shadow-lg shadow-emerald-600/20"
                    >
                        {isSendingBatch ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 mr-1.5" />
                        )}
                        Reenviar Pendentes/Falhas ({dayStats.falhas + dayStats.pendentes})
                    </Button>
                )}
            </div>

            {/* TABELA DE REGISTROS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4">Cliente</th>
                                <th className="py-3 px-4">Grupo WhatsApp</th>
                                <th className="py-3 px-4">Msg Relatório</th>
                                <th className="py-3 px-4">Msg Melina</th>
                                <th className="py-3 px-4">Horário Disparo</th>
                                <th className="py-3 px-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                                        Carregando registros...
                                    </td>
                                </tr>
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                    const relOk = item["mensagem_relatório_enviada"];
                                    const melOk = item.mensagem_melina_enviada;
                                    const isSending = sendingId === item.id;
                                    const isDeleting = deletingId === item.id;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                            {/* Cliente */}
                                            <td className="py-3.5 px-4 font-semibold text-slate-100">
                                                <div className="flex flex-col">
                                                    <span>{item.cliente_enviado || "Sem Nome"}</span>
                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                        ID #{item.id}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Grupo WhatsApp */}
                                            <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                    <span className="truncate max-w-[200px]" title={item.telefone_grupo || ""}>
                                                        {item.telefone_grupo || "—"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Relatório */}
                                            <td className="py-3.5 px-4">
                                                {relOk === true ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                                                    </span>
                                                ) : relOk === false ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                                                        <XCircle className="w-3.5 h-3.5" /> Falha
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                                                        <Clock className="w-3.5 h-3.5" /> Pendente
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Melina */}
                                            <td className="py-3.5 px-4">
                                                {melOk === true ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                                                    </span>
                                                ) : melOk === false ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                                                        <XCircle className="w-3.5 h-3.5" /> Falha
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                                                        <Clock className="w-3.5 h-3.5" /> Pendente
                                                    </span>
                                                )}
                                            </td>

                                            {/* Horários */}
                                            <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap font-mono">
                                                {item.horario_mensagem_relatorio_enviada ? (
                                                    <div>
                                                        <span>Rel: {new Date(item.horario_mensagem_relatorio_enviada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                                        {item.horario_mensagem_melina_enviada && (
                                                            <span className="block text-[11px] text-slate-500">
                                                                Mel: {new Date(item.horario_mensagem_melina_enviada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>

                                            {/* Ações */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Botão Ver Mensagens */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setViewingItem(item)}
                                                        className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
                                                        title="Ver texto das mensagens"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                                                        Ver
                                                    </Button>

                                                    {/* Botão Disparar / Reenviar */}
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleDispararItem(item.id)}
                                                        disabled={isSending}
                                                        className={cn(
                                                            "h-8 px-2.5 text-xs font-semibold",
                                                            relOk && melOk
                                                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                                                : "!bg-indigo-600 hover:!bg-indigo-700 !text-white"
                                                        )}
                                                        title="Disparar relatório e melina via UAZAPI"
                                                    >
                                                        {isSending ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Send className="w-3.5 h-3.5 mr-1" />
                                                        )}
                                                        {relOk && melOk ? "Reenviar" : "Disparar"}
                                                    </Button>

                                                    {/* Botão Excluir */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        disabled={isDeleting}
                                                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                                        title="Remover registro"
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-500">
                                        Nenhum registro encontrado para este filtro/dia.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE VISUALIZAÇÃO DAS MENSAGENS */}
            {viewingItem && (
                <Modal
                    isOpen={!!viewingItem}
                    onClose={() => setViewingItem(null)}
                    title={`Mensagens de: ${viewingItem.cliente_enviado || "Cliente"}`}
                >
                    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                            <span className="text-slate-400">Grupo de Destino:</span>{" "}
                            <strong className="text-indigo-300 font-mono">
                                {viewingItem.telefone_grupo || "Não informado"}
                            </strong>
                        </div>

                        {/* Mensagem 1: Relatório de Veículos */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> 1. Mensagem do Relatório
                                </label>
                                {viewingItem["mensagem_relatório_enviada"] ? (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                                        Enviado
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold">
                                        Pendente / Falha
                                    </span>
                                )}
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                                {viewingItem.mensagem_relatorio || "(Sem conteúdo na mensagem do relatório)"}
                            </div>
                        </div>

                        {/* Mensagem 2: Mensagem da Melina */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5" /> 2. Mensagem da Atendente (Melina)
                                </label>
                                {viewingItem.mensagem_melina_enviada ? (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                                        Enviado
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold">
                                        Pendente / Falha
                                    </span>
                                )}
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                                {viewingItem.mensagem_melina || "(Sem conteúdo na mensagem da Melina)"}
                            </div>
                        </div>

                        {/* Rodapé do Modal */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <Button
                                variant="outline"
                                onClick={() => setViewingItem(null)}
                                className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                                Fechar
                            </Button>
                            <Button
                                onClick={() => {
                                    const id = viewingItem.id;
                                    setViewingItem(null);
                                    handleDispararItem(id);
                                }}
                                className="!bg-indigo-600 hover:!bg-indigo-700 !text-white"
                            >
                                <Send className="w-4 h-4 mr-1.5" />
                                Disparar Agora
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
