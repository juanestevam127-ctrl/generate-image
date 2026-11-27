"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash, Edit, Save, X, Type, Image as ImageIcon, ArrowUp, ArrowDown, CheckSquare, Search, Filter } from "lucide-react";
import { useStore, Client, ColumnDefinition, ColumnType, ClientLayout } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFile } from "@/lib/supabase";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNextDivisaoAction } from "@/app/actions/clients";
import { ClientLayoutsEditor } from "./ClientLayoutsEditor";

export function ClientManager() {
    const { clients, addClient, updateClient, deleteClient } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Filtros da Lista de Clientes
    const [searchFilter, setSearchFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("todos");

    // Form State
    const [name, setName] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookPostagens, setWebhookPostagens] = useState("");
    const [prompt, setPrompt] = useState("");
    const [captionTemplate, setCaptionTemplate] = useState("");
    const [pastaVeiculos, setPastaVeiculos] = useState("🚗 Artes | Veículos");
    const [facebookId, setFacebookId] = useState("");
    const [instagramId, setInstagramId] = useState("");
    const [token, setToken] = useState("");
    const [columns, setColumns] = useState<ColumnDefinition[]>([]);
    const [layouts, setLayouts] = useState<ClientLayout[]>([]);
    const [nextGroupAndSchedule, setNextGroupAndSchedule] = useState<{ divisao_developrs: number; horario_developers: string } | null>(null);
    const [guideStories, setGuideStories] = useState("");
    const [guideStoriesSegSab, setGuideStoriesSegSab] = useState("");
    const [guideStoriesSegunda, setGuideStoriesSegunda] = useState("");
    const [guideStoriesSabado, setGuideStoriesSabado] = useState("");
    const [guideFeed, setGuideFeed] = useState("");
    const [clienteAtivo, setClienteAtivo] = useState(true);
    const [storiesQuartaSextaDomingo, setStoriesQuartaSextaDomingo] = useState(true);
    const [isUploading, setIsUploading] = useState<{ stories: boolean; storiesSegSab: boolean; storiesSegunda: boolean; storiesSabado: boolean; feed: boolean }>({ stories: false, storiesSegSab: false, storiesSegunda: false, storiesSabado: false, feed: false });
    const [idClickup, setIdClickup] = useState("");
    const [clickupTarefaId, setClickupTarefaId] = useState("");
    const [webhookStoriesSegQuarSex, setWebhookStoriesSegQuarSex] = useState("");
    const [integracaoTipo, setIntegracaoTipo] = useState("none");
    const [bndvExternalKey, setBndvExternalKey] = useState("");
    const [bndvPassword, setBndvPassword] = useState("");
    const [bndvCustomerKey, setBndvCustomerKey] = useState("");
    const [boomToken, setBoomToken] = useState("");
    const [boomCustomerKey, setBoomCustomerKey] = useState("");
    const [boomUrl, setBoomUrl] = useState("");
    const [lojaConectadaToken, setLojaConectadaToken] = useState("");
    const [autocertoUsername, setAutocertoUsername] = useState("");
    const [autocertoPassword, setAutocertoPassword] = useState("");
    const [revendaMaisUrl, setRevendaMaisUrl] = useState("");
    const [nomeGrupoWhatsapp, setNomeGrupoWhatsapp] = useState("");
    const [numeroGrupoWhatsapp, setNumeroGrupoWhatsapp] = useState("");
    const [uazapiGroups, setUazapiGroups] = useState<{ name: string; jid: string }[]>([]);
    const [isLoadingUazapiGroups, setIsLoadingUazapiGroups] = useState(false);
    const [activeTab, setActiveTab] = useState("geral");

    // NocoDB State
    const [nocoBases, setNocoBases] = useState<{ id: string; title: string }[]>([]);
    const [isLoadingNocoBases, setIsLoadingNocoBases] = useState(false);
    const [nocoTables, setNocoTables] = useState<{ id: string; title: string }[]>([]);
    const [isLoadingNocoTables, setIsLoadingNocoTables] = useState(false);

    // Clickup Clients data
    const [clickupClients, setClickupClients] = useState<{id: string, name: string}[]>([]);
    const [isLoadingClickup, setIsLoadingClickup] = useState(false);

    // Fetch NocoDB Bases
    useEffect(() => {
        if (integracaoTipo === "NOCODB" && nocoBases.length === 0) {
            setIsLoadingNocoBases(true);
            import("@/app/actions/estoque").then(({ getNocoDbBasesAction }) => {
                getNocoDbBasesAction().then(res => {
                    if (res.success && res.data) setNocoBases(res.data);
                }).finally(() => setIsLoadingNocoBases(false));
            });
        }
    }, [integracaoTipo, nocoBases.length]);

    // Fetch NocoDB Tables when Base changes
    useEffect(() => {
        if (integracaoTipo === "NOCODB" && boomCustomerKey) {
            setIsLoadingNocoTables(true);
            import("@/app/actions/estoque").then(({ getNocoDbTablesAction }) => {
                getNocoDbTablesAction(boomCustomerKey).then(res => {
                    if (res.success && res.data) setNocoTables(res.data);
                }).finally(() => setIsLoadingNocoTables(false));
            });
        } else {
            setNocoTables([]);
        }
    }, [integracaoTipo, boomCustomerKey]);

    // Fetch ClickUp Clients on mount
    useEffect(() => {
        let mounted = true;
        const fetchClickup = async () => {
            setIsLoadingClickup(true);
            const { getClickupClientsAction } = await import("@/app/actions/clickup");
            const res = await getClickupClientsAction();
            if (mounted && res.success && res.data) {
                setClickupClients(res.data);
            }
            if (mounted) setIsLoadingClickup(false);
        };
        const fetchUazapiGroups = async () => {
            setIsLoadingUazapiGroups(true);
            const { getUazapiGroupsAction } = await import("@/app/actions/clients");
            const res = await getUazapiGroupsAction();
            if (mounted && res.success && res.data) {
                setUazapiGroups(res.data);
            }
            if (mounted) setIsLoadingUazapiGroups(false);
        };
        fetchClickup();
        fetchUazapiGroups();
        return () => { mounted = false; };
    }, []);

    const openNewClientModal = () => {
        setEditingClient(null);
        setName("");
        setWebhookUrl("");
        setWebhookPostagens("");
        setPrompt("");
        setCaptionTemplate("");
        setPastaVeiculos("🚗 Artes | Veículos");
        setFacebookId("");
        setInstagramId("");
        setToken("");
        setGuideStories("");
        setGuideStoriesSegSab("");
        setGuideStoriesSegunda("");
        setGuideStoriesSabado("");
        setGuideFeed("");
        setClienteAtivo(true);
        setStoriesQuartaSextaDomingo(true);
        setIdClickup("");
        setWebhookStoriesSegQuarSex("");
        setIntegracaoTipo("none");
        setBndvExternalKey("");
        setBndvPassword("");
        setBndvCustomerKey("");
        setBoomToken("");
        setBoomCustomerKey("");
        setBoomUrl("");
        setLojaConectadaToken("");
        setAutocertoUsername("");
        setAutocertoPassword("");
        setRevendaMaisUrl("");
        setNomeGrupoWhatsapp("");
        setNumeroGrupoWhatsapp("");
        setColumns([{ id: crypto.randomUUID(), name: "Título", type: "text" }]); // Default column
        setLayouts([]);
        setIsModalOpen(true);
        
        // Fetch next division for display
        getNextDivisaoAction().then(res => {
            if (res.success && res.data) setNextGroupAndSchedule(res.data);
        });
    };

    const openEditClientModal = (client: Client) => {
        setEditingClient(client);
        setName(client.name);
        setWebhookUrl(client.webhookUrl);
        setWebhookPostagens(client.webhookPostagens || "");
        setPrompt(client.prompt || "");
        setCaptionTemplate(client.captionTemplate || "");
        setPastaVeiculos(client.pasta_veiculos || "🚗 Artes | Veículos");
        setFacebookId(client.facebookId || "");
        setInstagramId(client.instagramId || "");
        setToken(client.token || "");
        setGuideStories(client.guideStories || "");
        setGuideStoriesSegSab(client.guideStoriesSegSab || "");
        setGuideStoriesSegunda(client.guideStoriesSegunda || "");
        setGuideStoriesSabado(client.guideStoriesSabado || "");
        setGuideFeed(client.guideFeed || "");
        setClienteAtivo(client.clienteAtivo ?? true);
        setStoriesQuartaSextaDomingo(client.storiesQuartaSextaDomingo ?? (client.clienteAtivo !== false));
        setIdClickup(client.idClickup || "");
        setClickupTarefaId(client.clickupTarefaId || "");
        setWebhookStoriesSegQuarSex(client.webhookStoriesSegQuarSex || "");
        setIntegracaoTipo(client.integracaoTipo || "none");
        setBndvExternalKey(client.bndvExternalKey || "");
        setBndvPassword(client.bndvPassword || "");
        setBndvCustomerKey(client.bndvCustomerKey || "");
        setBoomToken(client.boomToken || "");
        setBoomCustomerKey(client.boomCustomerKey || "");
        setBoomUrl(client.boomUrl || "");
        setLojaConectadaToken(client.lojaConectadaToken || "");
        setAutocertoUsername(client.autocertoUsername || "");
        setAutocertoPassword(client.autocertoPassword || "");
        setRevendaMaisUrl(client.revendaMaisUrl || "");
        setNomeGrupoWhatsapp(client.nomeGrupoWhatsapp || "");
        setNumeroGrupoWhatsapp(client.numeroGrupoWhatsapp || "");
        setColumns([...client.columns]);
        setLayouts(client.layouts ? [...client.layouts] : []);
        setIsUploading({ stories: false, storiesSegSab: false, storiesSegunda: false, storiesSabado: false, feed: false });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!name) return alert("Preencha o nome do cliente");

        const FIXED_WEBHOOK = "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/autodesign-geracao-imagens";

        const clientData = {
            name,
            webhookUrl: FIXED_WEBHOOK,
            webhookPostagens,
            prompt,
            captionTemplate,
            pasta_veiculos: pastaVeiculos,
            facebookId,
            instagramId,
            token,
            guideStories,
            guideStoriesSegSab,
            guideStoriesSegunda,
            guideStoriesSabado,
            guideFeed,
            clienteAtivo,
            storiesQuartaSextaDomingo,
            idClickup,
            clickupTarefaId,
            webhookStoriesSegQuarSex: "",
            integracaoTipo,
            bndvExternalKey,
            bndvPassword,
            bndvCustomerKey,
            boomToken,
            boomCustomerKey,
            boomUrl,
            lojaConectadaToken,
            autocertoUsername,
            autocertoPassword,
            revendaMaisUrl,
            nomeGrupoWhatsapp,
            numeroGrupoWhatsapp,
            columns: columns.filter((c) => c.name.trim() !== ""),
            layouts: layouts.map(l => ({
                ...l,
                columns: l.columns.filter((c) => c.name.trim() !== "")
            })),
        };

        try {
            if (editingClient) {
                await updateClient(editingClient.id, clientData);
            } else {
                await addClient(clientData);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Save Client Error:", error);
            alert("Erro ao salvar cliente.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'stories' | 'storiesSegSab' | 'storiesSegunda' | 'storiesSabado' | 'feed') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(prev => ({ ...prev, [type]: true }));
        try {
            const url = await uploadFile(file, 'imagens-sem-exclusao');
            if (url) {
                if (type === 'stories') setGuideStories(url);
                else if (type === 'storiesSegSab') setGuideStoriesSegSab(url);
                else if (type === 'storiesSegunda') setGuideStoriesSegunda(url);
                else if (type === 'storiesSabado') setGuideStoriesSabado(url);
                else setGuideFeed(url);
            }
        } catch (error) {
            console.error("Upload Error:", error);
            alert("Erro ao subir imagem.");
        } finally {
            setIsUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    // Column Management
    const addColumn = (type: ColumnType) => {
        setColumns([
            ...columns,
            { id: crypto.randomUUID(), name: `Nova Coluna (${type})`, type },
        ]);
    };

    const updateColumn = (id: string, updates: Partial<ColumnDefinition>) => {
        setColumns((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const removeColumn = (id: string) => {
        setColumns((prev) => prev.filter((c) => c.id !== id));
    };

    const moveColumn = (index: number, direction: "up" | "down") => {
        const newColumns = [...columns];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newColumns.length) {
            [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
            setColumns(newColumns);
        }
    };

    // Estatísticas de clientes
    const totalAtivos = useMemo(() => clients.filter(c => c.clienteAtivo !== false).length, [clients]);
    const totalInativos = useMemo(() => clients.filter(c => c.clienteAtivo === false).length, [clients]);
    const totalGeral = clients.length;

    // Clientes filtrados
    const filteredClients = useMemo(() => {
        return [...clients]
            .filter(c => {
                // Filtro de status
                if (statusFilter === "ativos" && c.clienteAtivo === false) return false;
                if (statusFilter === "inativos" && c.clienteAtivo !== false) return false;

                // Filtro de pesquisa por nome
                if (searchFilter.trim()) {
                    const term = searchFilter.toLowerCase();
                    return c.name.toLowerCase().includes(term);
                }
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, statusFilter, searchFilter]);

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        Gerenciamento de Clientes
                    </h2>
                    {/* Contadores de Clientes */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>Total: <strong className="text-white font-mono">{totalGeral}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Ativos: <strong className="text-emerald-400 font-mono">{totalAtivos}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            Inativos: <strong className="text-red-400 font-mono">{totalInativos}</strong>
                        </span>
                    </div>
                </div>

                <Button onClick={openNewClientModal} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20">
                    <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-black/30 p-2.5 rounded-xl border border-white/5">
                {/* Campo de Busca */}
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Buscar por nome do cliente..."
                        className="pl-9 h-9 bg-black/40 border-white/10 text-xs focus:border-indigo-500"
                    />
                    {searchFilter && (
                        <button
                            onClick={() => setSearchFilter("")}
                            className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filtro por Status */}
                <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 self-stretch sm:self-auto justify-center">
                    <button
                        onClick={() => setStatusFilter("todos")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === "todos" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                    >
                        Todos ({totalGeral})
                    </button>
                    <button
                        onClick={() => setStatusFilter("ativos")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === "ativos" ? "bg-emerald-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                    >
                        Ativos ({totalAtivos})
                    </button>
                    <button
                        onClick={() => setStatusFilter("inativos")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === "inativos" ? "bg-red-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                    >
                        Inativos ({totalInativos})
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                    <Card key={client.id} className="relative group overflow-hidden border-white/5 hover:border-indigo-500/50 transition-colors">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg text-white">{client.name}</h3>
                                    {client.clienteAtivo === false ? (
                                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 uppercase font-bold">Inativo</span>
                                    ) : (
                                        client.storiesQuartaSextaDomingo !== false && (
                                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase font-bold" title="Stories Qua/Sex/Dom Ativo">
                                                Qua/Sex/Dom
                                            </span>
                                        )
                                    )}
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={() => openEditClientModal(client)}>
                                        <Edit size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-400" onClick={() => {
                                        if (confirm("Excluir cliente?")) deleteClient(client.id);
                                    }}>
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-4" title={client.webhookUrl}>
                                Webhook: {client.webhookUrl}
                            </p>
                             <div className="flex flex-wrap gap-2 mb-4">
                                 {client.layouts && client.layouts.length > 0 ? (
                                     client.layouts.map((lay) => (
                                         <span key={lay.id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-xs text-indigo-300 border border-indigo-500/20">
                                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5" />
                                             {lay.nome} ({lay.tipo})
                                         </span>
                                     ))
                                 ) : (
                                     client.columns.map((col) => (
                                         <span key={col.id} className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 text-xs text-gray-300 border border-white/10">
                                             {col.type === "image" ? <ImageIcon size={10} className="mr-1 text-purple-400" /> :
                                                 col.type === "checkbox" ? <CheckSquare size={10} className="mr-1 text-green-400" /> :
                                                     <Type size={10} className="mr-1 text-blue-400" />}
                                             {col.name}
                                         </span>
                                     ))
                                 )}
                             </div>
                             
                             {client.divisao_developrs && (
                                 <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                     <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Divisão Developers</span>
                                     <div className="flex gap-2">
                                         <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                                             Grupo {client.divisao_developrs}
                                         </span>
                                         {client.horario_developers && (
                                             <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                                 {client.horario_developers}
                                             </span>
                                         )}
                                     </div>
                                 </div>
                             )}
                         </CardContent>
                    </Card>
                ))}
                {clients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
                        Nenhum cliente cadastrado.
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClient ? "Editar Cliente" : "Novo Cliente"}
                className="max-w-6xl w-[95vw] h-[95vh]"
            >
                <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                    {!editingClient && nextGroupAndSchedule && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-sm text-indigo-300 font-medium tracking-tight">Este cliente será adicionado ao:</span>
                            <div className="flex gap-2">
                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-indigo-900/20 animate-pulse">
                                    Grupo {nextGroupAndSchedule.divisao_developrs}
                                </span>
                                <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-emerald-900/20 animate-pulse">
                                    {nextGroupAndSchedule.horario_developers}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Nome do Cliente</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Nike"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold flex items-center justify-between">
                                <span>Nome Grupo WhatsApp</span>
                                {isLoadingUazapiGroups && <span className="text-[10px] text-indigo-400 font-normal animate-pulse">Carregando grupos Uazapi...</span>}
                            </label>
                            <div className="space-y-1.5">
                                <select
                                    value={uazapiGroups.some(g => g.name === nomeGrupoWhatsapp) ? nomeGrupoWhatsapp : ""}
                                    onChange={(e) => {
                                        const selectedName = e.target.value;
                                        setNomeGrupoWhatsapp(selectedName);
                                        const found = uazapiGroups.find(g => g.name === selectedName);
                                        if (found) {
                                            setNumeroGrupoWhatsapp(found.jid);
                                        }
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">-- Selecionar da Uazapi --</option>
                                    {uazapiGroups.map((g, idx) => (
                                        <option key={`${g.jid}-${idx}`} value={g.name}>{g.name}</option>
                                    ))}
                                </select>
                                <Input
                                    value={nomeGrupoWhatsapp}
                                    onChange={(e) => setNomeGrupoWhatsapp(e.target.value)}
                                    placeholder="Ou digite o nome do grupo..."
                                    className="text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Número Grupo WhatsApp (JID)</label>
                            <Input
                                value={numeroGrupoWhatsapp}
                                onChange={(e) => setNumeroGrupoWhatsapp(e.target.value)}
                                placeholder="Ex: 120363411569517157@g.us"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Vincular com ClickUp (Serviços)</label>
                            <select
                                value={clickupTarefaId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setClickupTarefaId(val);
                                    setIdClickup(val);
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isLoadingClickup}
                            >
                                <option value="">Não vincular</option>
                                {clickupClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">ClickUp ID (ID da Tarefa)</label>
                            <Input
                                value={idClickup}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setIdClickup(val);
                                    setClickupTarefaId(val);
                                }}
                                placeholder="Ex: 86ady0z1m"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Pasta de Veículos no Google Drive</label>
                            <select
                                value={pastaVeiculos}
                                onChange={(e) => setPastaVeiculos(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="🚗 Artes | Veículos">🚗 Artes | Veículos</option>
                                <option value="🏍️ Artes | Motos">🏍️ Artes | Motos</option>
                                <option value="🚗 Artes | Carros">🚗 Artes | Carros</option>
                            </select>
                            <p className="text-[11px] text-muted-foreground">
                                Define a subpasta padrão onde serão salvas as artes deste cliente no Google Drive (para modelos de Vendidos, o sistema direcionará automaticamente para "🏆 Artes | Vendidos").
                            </p>
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Prompt para IA (Opcional)</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Escreva o prompt padrão para redimensionamento..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Facebook ID</label>
                            <Input
                                value={facebookId}
                                onChange={(e) => setFacebookId(e.target.value)}
                                placeholder="ID da página do Facebook"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Instagram ID</label>
                            <Input
                                value={instagramId}
                                onChange={(e) => setInstagramId(e.target.value)}
                                placeholder="ID da conta do Instagram"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Token de Acesso</label>
                            <textarea
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="EAAB..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Guia Stories</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 relative h-10 border-dashed border-indigo-500/30 hover:border-indigo-500/60"
                                    disabled={isUploading.stories}
                                    onClick={() => document.getElementById('upload-guide-stories')?.click()}
                                >
                                    {isUploading.stories ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> {guideStories ? 'Alterar Imagem' : 'Subir Imagem'}</>}
                                </Button>
                                <input
                                    type="file"
                                    id="upload-guide-stories"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'stories')}
                                />
                                {guideStories && (
                                    <div className="w-10 h-10 rounded border border-indigo-500/20 overflow-hidden cursor-pointer" onClick={() => window.open(guideStories, '_blank')}>
                                        <img src={guideStories} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Stories Segunda</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 relative h-10 border-dashed border-indigo-500/30 hover:border-indigo-500/60"
                                    disabled={isUploading.storiesSegunda}
                                    onClick={() => document.getElementById('upload-guide-stories-segunda')?.click()}
                                >
                                    {isUploading.storiesSegunda ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> {guideStoriesSegunda ? 'Alterar Imagem' : 'Subir Imagem'}</>}
                                </Button>
                                <input
                                    type="file"
                                    id="upload-guide-stories-segunda"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'storiesSegunda')}
                                />
                                {guideStoriesSegunda && (
                                    <div className="w-10 h-10 rounded border border-indigo-500/20 overflow-hidden cursor-pointer" onClick={() => window.open(guideStoriesSegunda, '_blank')}>
                                        <img src={guideStoriesSegunda} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Stories Sábado</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 relative h-10 border-dashed border-indigo-500/30 hover:border-indigo-500/60"
                                    disabled={isUploading.storiesSabado}
                                    onClick={() => document.getElementById('upload-guide-stories-sabado')?.click()}
                                >
                                    {isUploading.storiesSabado ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> {guideStoriesSabado ? 'Alterar Imagem' : 'Subir Imagem'}</>}
                                </Button>
                                <input
                                    type="file"
                                    id="upload-guide-stories-sabado"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'storiesSabado')}
                                />
                                {guideStoriesSabado && (
                                    <div className="w-10 h-10 rounded border border-indigo-500/20 overflow-hidden cursor-pointer" onClick={() => window.open(guideStoriesSabado, '_blank')}>
                                        <img src={guideStoriesSabado} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Guia Feed</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 relative h-10 border-dashed border-indigo-500/30 hover:border-indigo-500/60"
                                    disabled={isUploading.feed}
                                    onClick={() => document.getElementById('upload-guide-feed')?.click()}
                                >
                                    {isUploading.feed ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> {guideFeed ? 'Alterar Imagem' : 'Subir Imagem'}</>}
                                </Button>
                                <input
                                    type="file"
                                    id="upload-guide-feed"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'feed')}
                                />
                                {guideFeed && (
                                    <div className="w-10 h-10 rounded border border-indigo-500/20 overflow-hidden cursor-pointer" onClick={() => window.open(guideFeed, '_blank')}>
                                        <img src={guideFeed} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3 col-span-2 bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="clienteAtivo"
                                    checked={clienteAtivo}
                                    onChange={(e) => setClienteAtivo(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-background"
                                />
                                <label htmlFor="clienteAtivo" className="text-xs uppercase text-muted-foreground font-bold cursor-pointer">
                                    Cliente Ativo
                                </label>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                                <input
                                    type="checkbox"
                                    id="storiesQuartaSextaDomingo"
                                    checked={storiesQuartaSextaDomingo}
                                    onChange={(e) => setStoriesQuartaSextaDomingo(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-background"
                                />
                                <label htmlFor="storiesQuartaSextaDomingo" className="text-xs uppercase text-indigo-300 font-bold cursor-pointer flex items-center gap-1.5">
                                    <span>Stories (Quarta, Sexta e Domingo)</span>
                                    <span className="text-[10px] lowercase font-normal text-gray-400">
                                        ({storiesQuartaSextaDomingo ? "ativo para disparo" : "desativado"})
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO LAYOUTS & TEMPLATES RENDERFORM */}
                    <div className="border-t border-border pt-4">
                        <ClientLayoutsEditor
                            layouts={layouts}
                            onChange={setLayouts}
                            clientColumnsFallback={columns}
                        />
                    </div>

                                        {/* SEÇÃO INTEGRAÇÕES */}
                    <div className="space-y-4 pt-6 border-t border-indigo-500/20">
                        <div>
                            <h3 className="text-lg font-medium text-slate-100 flex items-center">
                                Integrações (Estoque)
                            </h3>
                            <p className="text-sm text-slate-400">Configure a conexão com sistemas externos de estoque.</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo de Integração</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={integracaoTipo}
                                    onChange={(e) => setIntegracaoTipo(e.target.value)}
                                >
                                    <option value="none">Nenhuma</option>
                                    <option value="BNDV">BNDV</option>
                                    <option value="BOOM">Boom Sistemas</option>
                                    <option value="LOJA_CONECTADA">Loja Conectada</option>
                                    <option value="AUTOCERTO">AutoCerto</option>
                                    <option value="REVENDA_MAIS">Revenda Mais</option>
                                    <option value="AUTOCONF">AutoConf</option>
                                    <option value="NOCODB">NocoDB</option>
                                    <option value="WEBMOTORS">WebMotors (n8n)</option>
                                </select>
                            </div>

                            {integracaoTipo === "AUTOCERTO" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais AutoCerto</h4>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Usuário</label>
                                        <Input
                                            value={autocertoUsername}
                                            onChange={(e) => setAutocertoUsername(e.target.value)}
                                            placeholder="Usuário"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Senha</label>
                                        <Input
                                            type="password"
                                            value={autocertoPassword}
                                            onChange={(e) => setAutocertoPassword(e.target.value)}
                                            placeholder="Senha"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {integracaoTipo === "REVENDA_MAIS" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Revenda Mais</h4>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">URL da API (XML)</label>
                                        <Input
                                            value={revendaMaisUrl}
                                            onChange={(e) => setRevendaMaisUrl(e.target.value)}
                                            placeholder="URL que retorna o XML"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {integracaoTipo === "NOCODB" && (
                                <div className="space-y-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div>
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-1">Configuração NocoDB</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Selecione a base do cliente e marque as tabelas que compõem o estoque (ex: estoque ativo e inativo).
                                        </p>
                                    </div>

                                    {/* Seletor de Base / Projeto */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium">Base / Projeto no NocoDB</label>
                                            {isLoadingNocoBases && (
                                                <span className="text-[11px] text-indigo-400 flex items-center">
                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" /> Carregando bases...
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={boomCustomerKey}
                                            onChange={(e) => {
                                                setBoomCustomerKey(e.target.value);
                                                setRevendaMaisUrl(""); // Reset selected tables on base change
                                            }}
                                        >
                                            <option value="">Selecione uma base...</option>
                                            {nocoBases.map((b) => (
                                                <option key={b.id} value={b.title}>
                                                    {b.title} ({b.id})
                                                </option>
                                            ))}
                                            {boomCustomerKey && !nocoBases.some(b => b.title === boomCustomerKey || b.id === boomCustomerKey) && (
                                                <option value={boomCustomerKey}>{boomCustomerKey}</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* Seleção de Tabelas */}
                                    {boomCustomerKey && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium">Tabelas de Estoque Selecionadas</label>
                                                {isLoadingNocoTables && (
                                                    <span className="text-[11px] text-indigo-400 flex items-center">
                                                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Carregando tabelas...
                                                    </span>
                                                )}
                                            </div>

                                            {nocoTables.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                                    {nocoTables.map((tbl) => {
                                                        const selectedList = revendaMaisUrl
                                                            ? revendaMaisUrl.split(",").map(s => s.trim().toLowerCase())
                                                            : [];
                                                        const isChecked = selectedList.includes(tbl.title.toLowerCase()) || selectedList.includes(tbl.id.toLowerCase());

                                                        return (
                                                            <label
                                                                key={tbl.id}
                                                                className={cn(
                                                                    "flex items-center space-x-2.5 p-2 rounded-md border cursor-pointer transition-colors text-xs font-medium",
                                                                    isChecked
                                                                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-200"
                                                                        : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/40"
                                                                )}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        let current = revendaMaisUrl
                                                                            ? revendaMaisUrl.split(",").map(s => s.trim()).filter(Boolean)
                                                                            : [];
                                                                        if (e.target.checked) {
                                                                            if (!current.includes(tbl.title)) current.push(tbl.title);
                                                                        } else {
                                                                            current = current.filter(t => t.toLowerCase() !== tbl.title.toLowerCase() && t.toLowerCase() !== tbl.id.toLowerCase());
                                                                        }
                                                                        setRevendaMaisUrl(current.join(","));
                                                                    }}
                                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                                                                />
                                                                <div className="flex-1 truncate">
                                                                    <span>{tbl.title}</span>
                                                                    {tbl.title.includes("inativo") && (
                                                                        <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Inativo</span>
                                                                    )}
                                                                    {tbl.title.endsWith("_estoque") && (
                                                                        <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Ativo</span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                !isLoadingNocoTables && (
                                                    <p className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded border border-slate-800">
                                                        Nenhuma tabela personalizada encontrada nesta base.
                                                    </p>
                                                )
                                            )}

                                            <div className="mt-2">
                                                <span className="text-[11px] text-slate-400">
                                                    Tabelas ativas na sincronização:{" "}
                                                    <strong className="text-indigo-300 font-mono">
                                                        {revendaMaisUrl || "(Nenhuma selecionada)"}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {integracaoTipo === "AUTOCONF" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Configuração AutoConf</h4>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">URL do XML</label>
                                        <Input
                                            value={revendaMaisUrl}
                                            onChange={(e) => setRevendaMaisUrl(e.target.value)}
                                            placeholder="Link/URL do feed XML do AutoConf"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Cole aqui o link do XML gerado pelo AutoConf.</p>
                                    </div>
                                </div>
                            )}

                            {integracaoTipo === "WEBMOTORS" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-1">Configuração WebMotors (via n8n)</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Integração com raspador/API do WebMotors via fluxo n8n com suporte a paginação automática.
                                        </p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">URL do Webhook n8n (Opcional)</label>
                                        <Input
                                            value={revendaMaisUrl}
                                            onChange={(e) => setRevendaMaisUrl(e.target.value)}
                                            placeholder="https://n8n-webhook.vpsdesignonline.com.br/webhook/estoque-api-webmotors"
                                            className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Se deixar em branco, usará o webhook padrão configurado: <code className="text-indigo-400">.../webhook/estoque-api-webmotors</code>.
                                        </p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Link de Busca / Loja na WebMotors (Opcional)</label>
                                        <Input
                                            value={boomUrl}
                                            onChange={(e) => setBoomUrl(e.target.value)}
                                            placeholder="Ex: https://www.webmotors.com.br/motos/sp?idrevendedor=..."
                                            className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Link direto da loja na WebMotors passado no corpo da requisição ao n8n.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {integracaoTipo === "LOJA_CONECTADA" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Loja Conectada</h4>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Token de Autorização</label>
                                        <Input
                                            value={lojaConectadaToken}
                                            onChange={(e) => setLojaConectadaToken(e.target.value)}
                                            placeholder="Token da Loja Conectada"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {integracaoTipo === "BOOM" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10 mt-4">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais Boom Sistemas</h4>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">URL da API</label>
                                        <Input
                                            value={boomUrl}
                                            onChange={(e) => setBoomUrl(e.target.value)}
                                            placeholder="Ex: https://boomsistemas.com.br/api/integration-api/xml/MotosPrime-..."
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Customer Key</label>
                                        <Input
                                            value={boomCustomerKey}
                                            onChange={(e) => setBoomCustomerKey(e.target.value)}
                                            placeholder="Ex: MotosPrime-0WxGYEtQCDS4Iji"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Token</label>
                                        <Input
                                            value={boomToken}
                                            onChange={(e) => setBoomToken(e.target.value)}
                                            placeholder="Ex: eyJhbG..."
                                            className="bg-slate-900 border-slate-700 text-white"
                                            type="password"
                                        />
                                    </div>
                                </div>
                            )}
                            {integracaoTipo === "BNDV" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-md border border-indigo-500/10">
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-sm text-indigo-300 mb-2">Credenciais BNDV</h4>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Customer Key</label>
                                        <Input
                                            value={bndvCustomerKey}
                                            onChange={(e) => setBndvCustomerKey(e.target.value)}
                                            placeholder="Ex: {customerKey}"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">External Key</label>
                                        <Input
                                            value={bndvExternalKey}
                                            onChange={(e) => setBndvExternalKey(e.target.value)}
                                            placeholder="Chave external key"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Password</label>
                                        <Input
                                            type="password"
                                            value={bndvPassword}
                                            onChange={(e) => setBndvPassword(e.target.value)}
                                            placeholder="Senha do cliente"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="!bg-green-400 hover:!bg-green-500 !text-slate-950 font-bold">
                            <Save className="w-4 h-4 mr-2" /> Salvar Cliente
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
