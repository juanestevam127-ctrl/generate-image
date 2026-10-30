"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/lib/store-context";
import {
    ControleRelatorioMelinaItem,
    getRelatoriosMelinaAction,
    getUazapiTokenAction,
    saveUazapiTokenAction,
    getAllowedUsersListaCarrosAction,
    saveAllowedUsersListaCarrosAction,
    getAllSystemUsersAction,
    dispararRelatorioMelinaItemAction,
    dispararLoteRelatoriosMelinaAction,
    deleteRelatorioMelinaItemAction
} from "@/app/actions/relatorioMelina";
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
    Users,
    Check,
    AlertCircle,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ListaCarrosPage() {
    const { user } = useStore();
    const isMaster = user?.role === "master";

    // Dados principais
    const [items, setItems] = useState<ControleRelatorioMelinaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Permissões de Acesso (para usuários não master)
    const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    // Gerenciador de Usuários Permitidos (Apenas Master)
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<{ email: string; name: string | null; role: string }[]>([]);
    const [selectedAllowedEmails, setSelectedAllowedEmails] = useState<string[]>([]);
    const [isSavingUsers, setIsSavingUsers] = useState(false);

    // Modal de Configuração do Token (Apenas Master)
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [uazapiToken, setUazapiToken] = useState("");
    const [isSavingToken, setIsSavingToken] = useState(false);

    // Filtros e Seleção
    const [selectedDate, setSelectedDate] = useState<string>(""); // YYYY-MM-DD
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"todos" | "sucesso" | "pendente" | "falha">("todos");

    // Modal de Visualização da Mensagem
    const [viewingItem, setViewingItem] = useState<ControleRelatorioMelinaItem | null>(null);

    // Estados de Ações
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [isSendingBatch, setIsSendingBatch] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // 1. Carregamento inicial
    const loadData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const [relRes, tokRes, allowedRes] = await Promise.all([
                getRelatoriosMelinaAction(),
                isMaster ? getUazapiTokenAction() : Promise.resolve({ success: true, token: "" }),
                getAllowedUsersListaCarrosAction()
            ]);

            const allowedList = allowedRes.success && allowedRes.data ? allowedRes.data : [];
            setAllowedUsers(allowedList);

            const userEmail = (user?.email || "").toLowerCase();
            const canView = isMaster || allowedList.includes(userEmail);
            setHasAccess(canView);

            if (relRes.success && relRes.data) {
                setItems(relRes.data);

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
    }, [user?.email, isMaster]);

    // Abrir modal de gerenciar usuários permitidos
    const handleOpenUsersModal = async () => {
        setIsUsersModalOpen(true);
        try {
            const res = await getAllSystemUsersAction();
            if (res.success && res.data) {
                setAllUsers(res.data);
            }
            setSelectedAllowedEmails([...allowedUsers]);
        } catch (e) {
            console.error(e);
        }
    };

    // Salvar usuários permitidos
    const handleSaveAllowedUsers = async () => {
        setIsSavingUsers(true);
        try {
            const res = await saveAllowedUsersListaCarrosAction(selectedAllowedEmails);
            if (res.success) {
                setAllowedUsers(selectedAllowedEmails);
                setIsUsersModalOpen(false);
                alert("Permissões de usuários salvas com sucesso!");
            } else {
                alert("Erro ao salvar permissões: " + res.error);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setIsSavingUsers(false);
        }
    };

    // Salvar Token (Admin)
    const handleSaveToken = async () => {
        if (!uazapiToken.trim()) return alert("Preencha o token da UAZAPI.");
        setIsSavingToken(true);
        try {
            const res = await saveUazapiTokenAction(uazapiToken);
            if (res.success) {
                alert("Token da UAZAPI salvo com sucesso!");
                setIsTokenModalOpen(false);
            } else {
                alert("Erro ao salvar token: " + res.error);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setIsSavingToken(false);
        }
    };

    // Mapeamento de datas no calendário
    const datesMap = useMemo(() => {
        const map: Record<string, { total: number; sucessos: number; falhas: number; pendentes: number }> = {};

        items.forEach((item) => {
            if (!item.created_at) return;
            const dateKey = item.created_at.split("T")[0];
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

    const availableDates = useMemo(() => {
        const keys = Object.keys(datesMap);
        keys.sort((a, b) => b.localeCompare(a));
        return keys;
    }, [datesMap]);

    // Registros do dia selecionado
    const dayItems = useMemo(() => {
        if (!selectedDate) return [];
        return items.filter((item) => item.created_at?.startsWith(selectedDate));
    }, [items, selectedDate]);

    // Filtragem por busca e status
    const filteredItems = useMemo(() => {
        return dayItems.filter((item) => {
            const q = searchTerm.toLowerCase();
            const matchClient = (item.cliente_enviado || "").toLowerCase().includes(q);
            const matchPhone = (item.telefone_grupo || "").toLowerCase().includes(q);
            const matchRel = (item.mensagem_relatorio || "").toLowerCase().includes(q);
            if (searchTerm && !matchClient && !matchPhone && !matchRel) return false;

            const relOk = item["mensagem_relatório_enviada"];
            const melOk = item.mensagem_melina_enviada;
            const isFullSuccess = relOk === true && melOk === true;
            const hasFailure = relOk === false || melOk === false;
            const isPending = (relOk === null || melOk === null) && !hasFailure;

            if (statusFilter === "sucesso") return isFullSuccess;
            if (statusFilter === "falha") return hasFailure;
            if (statusFilter === "pendente") return isPending;

            return true;
        });
    }, [dayItems, searchTerm, statusFilter]);

    // Métricas do dia selecionado
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

    // Disparar individual
    const handleDispararItem = async (id: number) => {
        setSendingId(id);
        try {
            const res = await dispararRelatorioMelinaItemAction(id);
            if (res.success) {
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

    // Disparar em lote todos os pendentes/falhas do dia
    const handleDispararPendentesDoDia = async () => {
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
            const res = await dispararLoteRelatoriosMelinaAction(ids);
            if (res.success) {
                alert(`Disparo em lote concluído!\nSucessos: ${res.sucessos}\nFalhas: ${res.falhas}`);
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

    // Deletar registro
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

    // Verificação de permissão de acesso
    if (loading && hasAccess === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <p className="text-sm text-slate-400">Verificando permissões de acesso...</p>
            </div>
        );
    }

    if (hasAccess === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <ShieldAlert className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
                <h1 className="text-2xl font-bold text-white mb-2">Acesso Não Autorizado</h1>
                <p className="text-slate-400 max-w-md text-sm">
                    Você não possui permissão para visualizar a Lista de Carros. Solicite acesso ao administrador.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
            {/* Header Moderno e Clean */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Lista de Carros</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Conferência e disparos automatizados de veículos nos grupos de WhatsApp dos clientes.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Botões restritos ao Admin Master */}
                    {isMaster && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenUsersModal}
                                className="border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 h-9 text-xs"
                            >
                                <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                                Liberar Acesso ({allowedUsers.length})
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsTokenModalOpen(true)}
                                className="border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 h-9 text-xs"
                            >
                                <Key className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                                Configurar Token UAZAPI
                            </Button>
                        </>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-9 text-xs"
                    >
                        {refreshing ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-400" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                        )}
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* SELETOR DE DIAS / TIMELINE MODERNA */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-semibold text-slate-200">Histórico de Disparos por Data</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Selecionar data:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {availableDates.length > 0 ? (
                        availableDates.map((dStr) => {
                            const isSelected = selectedDate === dStr;
                            const stats = datesMap[dStr];

                            const [ano, mes, dia] = dStr.split("-");
                            const dObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
                            const weekday = dObj.toLocaleDateString("pt-BR", { weekday: "short" });
                            const isMonday = dObj.getDay() === 1;

                            return (
                                <button
                                    key={dStr}
                                    onClick={() => setSelectedDate(dStr)}
                                    className={cn(
                                        "flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 min-w-[130px]",
                                        isSelected
                                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                                            : "bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span
                                            className={cn(
                                                "text-[10px] uppercase font-bold tracking-wider",
                                                isSelected ? "text-indigo-200" : "text-slate-400"
                                            )}
                                        >
                                            {weekday} {isMonday && "⭐"}
                                        </span>
                                        <span
                                            className={cn(
                                                "text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold",
                                                isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
                                            )}
                                        >
                                            {stats.total}
                                        </span>
                                    </div>
                                    <span className="text-base font-extrabold mt-0.5">
                                        {dia}/{mes}
                                    </span>

                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-medium">
                                        {stats.sucessos > 0 && (
                                            <span className={isSelected ? "text-emerald-200" : "text-emerald-400"}>
                                                ● {stats.sucessos} ok
                                            </span>
                                        )}
                                        {stats.falhas > 0 && (
                                            <span className={isSelected ? "text-red-200" : "text-red-400"}>
                                                ● {stats.falhas} erro
                                            </span>
                                        )}
                                        {stats.pendentes > 0 && (
                                            <span className={isSelected ? "text-amber-200" : "text-amber-400"}>
                                                ● {stats.pendentes} pend
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <p className="text-xs text-slate-500 py-3">
                            Nenhum disparo registrado ainda. Os registros criados pela automação aparecerão agrupados por dia aqui.
                        </p>
                    )}
                </div>
            </div>

            {/* CARDS DE RESUMO DO DIA */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                    <span className="text-xs font-medium text-slate-400">Total de Clientes</span>
                    <p className="text-2xl font-black text-white mt-1">{dayStats.total}</p>
                </div>
                <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-xl shadow-sm">
                    <span className="text-xs font-medium text-emerald-400">Disparados com Sucesso</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{dayStats.sucessos}</p>
                </div>
                <div className="bg-slate-900 border border-red-500/20 p-4 rounded-xl shadow-sm">
                    <span className="text-xs font-medium text-red-400">Falhas / Erros</span>
                    <p className="text-2xl font-black text-red-400 mt-1">{dayStats.falhas}</p>
                </div>
                <div className="bg-slate-900 border border-amber-500/20 p-4 rounded-xl shadow-sm">
                    <span className="text-xs font-medium text-amber-400">Pendentes</span>
                    <p className="text-2xl font-black text-amber-400 mt-1">{dayStats.pendentes}</p>
                </div>
            </div>

            {/* TOOLBAR: BUSCA, FILTRO E BOTÃO DE REENVIAR PENDENTES */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[260px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Buscar por cliente, grupo ou mensagem..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-800/80 border-slate-700 pl-9 text-xs text-white h-9 rounded-lg"
                        />
                    </div>

                    <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700 text-xs">
                        <button
                            onClick={() => setStatusFilter("todos")}
                            className={cn(
                                "px-3 py-1 rounded-md font-medium transition-colors",
                                statusFilter === "todos"
                                    ? "bg-indigo-600 text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Todos ({dayItems.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter("sucesso")}
                            className={cn(
                                "px-3 py-1 rounded-md font-medium transition-colors",
                                statusFilter === "sucesso"
                                    ? "bg-emerald-600 text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Sucesso ({dayStats.sucessos})
                        </button>
                        <button
                            onClick={() => setStatusFilter("falha")}
                            className={cn(
                                "px-3 py-1 rounded-md font-medium transition-colors",
                                statusFilter === "falha"
                                    ? "bg-red-600 text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Falhas ({dayStats.falhas})
                        </button>
                        <button
                            onClick={() => setStatusFilter("pendente")}
                            className={cn(
                                "px-3 py-1 rounded-md font-medium transition-colors",
                                statusFilter === "pendente"
                                    ? "bg-amber-600 text-white shadow"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Pendentes ({dayStats.pendentes})
                        </button>
                    </div>
                </div>

                {/* BOTÃO COM TEXTO ESCURO PARA ALTO CONTRASTE */}
                {dayStats.falhas + dayStats.pendentes > 0 && (
                    <Button
                        size="sm"
                        onClick={handleDispararPendentesDoDia}
                        disabled={isSendingBatch}
                        className="!bg-emerald-400 hover:!bg-emerald-300 !text-slate-950 text-xs h-9 font-bold px-4 shadow-lg shadow-emerald-500/20"
                    >
                        {isSendingBatch ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin !text-slate-950" />
                        ) : (
                            <Send className="w-4 h-4 mr-1.5 !text-slate-950" />
                        )}
                        Reenviar Pendentes/Falhas ({dayStats.falhas + dayStats.pendentes})
                    </Button>
                )}
            </div>

            {/* TABELA DE CLIENTES E DISPAROS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4">Cliente</th>
                                <th className="py-3 px-4">Grupo WhatsApp</th>
                                <th className="py-3 px-4">Relatório Veículos</th>
                                <th className="py-3 px-4">Mensagem Melina</th>
                                <th className="py-3 px-4">Horários</th>
                                <th className="py-3 px-4 text-right">Ação</th>
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
                                    const isTotalmenteEnviado = relOk === true && melOk === true;
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
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                                                    </span>
                                                ) : relOk === false ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md">
                                                        <XCircle className="w-3.5 h-3.5" /> Falha
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                                        <Clock className="w-3.5 h-3.5" /> Pendente
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Melina */}
                                            <td className="py-3.5 px-4">
                                                {melOk === true ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                                                    </span>
                                                ) : melOk === false ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md">
                                                        <XCircle className="w-3.5 h-3.5" /> Falha
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                                        <Clock className="w-3.5 h-3.5" /> Pendente
                                                    </span>
                                                )}
                                            </td>

                                            {/* Horários */}
                                            <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap font-mono">
                                                {item.horario_mensagem_relatorio_enviada ? (
                                                    <div>
                                                        <span>
                                                            Rel:{" "}
                                                            {new Date(item.horario_mensagem_relatorio_enviada).toLocaleTimeString(
                                                                "pt-BR",
                                                                { hour: "2-digit", minute: "2-digit" }
                                                            )}
                                                        </span>
                                                        {item.horario_mensagem_melina_enviada && (
                                                            <span className="block text-[11px] text-slate-500">
                                                                Mel:{" "}
                                                                {new Date(item.horario_mensagem_melina_enviada).toLocaleTimeString(
                                                                    "pt-BR",
                                                                    { hour: "2-digit", minute: "2-digit" }
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>

                                            {/* Ações */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
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

                                                    {/* REGRA: Se JÁ foi enviado com sucesso, NÃO exibe botão de reenviar */}
                                                    {isTotalmenteEnviado ? (
                                                        <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                                            <Check className="w-3.5 h-3.5 mr-1" /> Concluído
                                                        </span>
                                                    ) : (
                                                        /* Botão com texto escuro para alto contraste */
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleDispararItem(item.id)}
                                                            disabled={isSending}
                                                            className="!bg-emerald-400 hover:!bg-emerald-300 !text-slate-950 h-8 px-3 text-xs font-bold shadow-md shadow-emerald-500/10"
                                                            title="Disparar relatório e melina via UAZAPI"
                                                        >
                                                            {isSending ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin !text-slate-950" />
                                                            ) : (
                                                                <Send className="w-3.5 h-3.5 mr-1 !text-slate-950" />
                                                            )}
                                                            Disparar
                                                        </Button>
                                                    )}

                                                    {/* Botão Excluir (apenas Master) */}
                                                    {isMaster && (
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
                                                    )}
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

            {/* MODAL DE CONFIGURAÇÃO DO TOKEN (ADMIN MASTER APENAS) */}
            {isMaster && isTokenModalOpen && (
                <Modal
                    isOpen={isTokenModalOpen}
                    onClose={() => setIsTokenModalOpen(false)}
                    title="Configuração do Token UAZAPI"
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            O token abaixo é utilizado exclusivamente para autenticar o envio de mensagens de texto na
                            UAZAPI (<code className="text-indigo-300">https://designonline.uazapi.com/send/text</code>).
                            Apenas usuários administradores (Master) podem visualizar ou alterar esta chave.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Chave de API / Token
                            </label>
                            <Input
                                type="password"
                                value={uazapiToken}
                                onChange={(e) => setUazapiToken(e.target.value)}
                                placeholder="Insira o token da UAZAPI..."
                                className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <Button
                                variant="outline"
                                onClick={() => setIsTokenModalOpen(false)}
                                className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveToken}
                                disabled={isSavingToken}
                                className="!bg-emerald-400 hover:!bg-emerald-300 !text-slate-950 font-bold"
                            >
                                {isSavingToken ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                                Salvar Token
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL DE LIBERAR ACESSO A USUÁRIOS (ADMIN MASTER APENAS) */}
            {isMaster && isUsersModalOpen && (
                <Modal
                    isOpen={isUsersModalOpen}
                    onClose={() => setIsUsersModalOpen(false)}
                    title="Permissões de Acesso: Lista de Carros"
                >
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Marque os usuários comuns que devem ter permissão para visualizar e operar a tela{" "}
                            <strong>Lista de Carros</strong>. Usuários com perfil Master já possuem acesso total por padrão.
                        </p>

                        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                            {allUsers
                                .filter((u) => u.role !== "master")
                                .map((u) => {
                                    const uEmail = u.email.toLowerCase();
                                    const isChecked = selectedAllowedEmails.includes(uEmail);

                                    return (
                                        <label
                                            key={u.email}
                                            className={cn(
                                                "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-xs",
                                                isChecked
                                                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-200"
                                                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedAllowedEmails((prev) => [...prev, uEmail]);
                                                        } else {
                                                            setSelectedAllowedEmails((prev) =>
                                                                prev.filter((em) => em !== uEmail)
                                                            );
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                                                />
                                                <div>
                                                    <span className="font-semibold block">{u.name || "Sem Nome"}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase">
                                                {u.role}
                                            </span>
                                        </label>
                                    );
                                })}

                            {allUsers.filter((u) => u.role !== "master").length === 0 && (
                                <p className="text-xs text-slate-500 py-3 text-center">
                                    Nenhum usuário comum encontrado no sistema.
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <Button
                                variant="outline"
                                onClick={() => setIsUsersModalOpen(false)}
                                className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveAllowedUsers}
                                disabled={isSavingUsers}
                                className="!bg-emerald-400 hover:!bg-emerald-300 !text-slate-950 font-bold"
                            >
                                {isSavingUsers ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                ) : (
                                    <Check className="w-4 h-4 mr-1.5" />
                                )}
                                Salvar Permissões
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL DE VISUALIZAÇÃO DAS MENSAGENS COM PREVIEW ESTILO WHATSAPP */}
            {viewingItem && (
                <Modal
                    isOpen={!!viewingItem}
                    onClose={() => setViewingItem(null)}
                    title={viewingItem.cliente_enviado || "Visualização das Mensagens"}
                    className="max-w-xl mx-auto border-slate-800 bg-slate-950/95 p-0 overflow-hidden shadow-2xl"
                >
                    <div className="p-5 space-y-4">
                        {/* Destino do Envio */}
                        <div className="flex items-center justify-between bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-slate-400">Grupo WhatsApp:</span>
                                <span className="text-slate-200 font-mono font-medium">{viewingItem.telefone_grupo || "Não informado"}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">ID #{viewingItem.id}</span>
                        </div>

                        {/* Balão 1: Mensagem do Relatório */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-3 h-3 text-indigo-400" /> 1. Lista de Veículos
                                </span>
                                {viewingItem["mensagem_relatório_enviada"] ? (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
                                        Enviada
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium border border-amber-500/20">
                                        Pendente
                                    </span>
                                )}
                            </div>
                            <div className="relative bg-[#0b141a] border border-[#222e35] rounded-2xl rounded-tl-sm p-4 text-[13px] leading-relaxed text-[#e9edef] max-h-56 overflow-y-auto whitespace-pre-wrap font-sans selection:bg-emerald-500/30">
                                {viewingItem.mensagem_relatorio || <span className="text-slate-500 italic">Sem mensagem de relatório</span>}
                            </div>
                        </div>

                        {/* Balão 2: Mensagem da Melina */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserCheck className="w-3 h-3 text-pink-400" /> 2. Mensagem da Atendente
                                </span>
                                {viewingItem.mensagem_melina_enviada ? (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
                                        Enviada
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium border border-amber-500/20">
                                        Pendente
                                    </span>
                                )}
                            </div>
                            <div className="relative bg-[#0b141a] border border-[#222e35] rounded-2xl rounded-tl-sm p-4 text-[13px] leading-relaxed text-[#e9edef] whitespace-pre-wrap font-sans selection:bg-emerald-500/30">
                                {viewingItem.mensagem_melina || <span className="text-slate-500 italic">Sem mensagem da atendente</span>}
                            </div>
                        </div>

                        {/* Rodapé com botões compactos e elegantes */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingItem(null)}
                                className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs h-9 px-4 rounded-lg"
                            >
                                Fechar
                            </Button>

                            {!(viewingItem["mensagem_relatório_enviada"] && viewingItem.mensagem_melina_enviada) && (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const id = viewingItem.id;
                                        setViewingItem(null);
                                        handleDispararItem(id);
                                    }}
                                    className="!bg-emerald-400 hover:!bg-emerald-300 !text-slate-950 font-bold text-xs h-9 px-4 rounded-lg shadow-md shadow-emerald-500/20"
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5 !text-slate-950" />
                                    Disparar Agora
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
