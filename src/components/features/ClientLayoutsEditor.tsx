"use client";

import React, { useState, useEffect, useRef } from "react";
import { ClientLayout, ColumnDefinition } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Plus, 
    Trash2, 
    Layers, 
    Sparkles, 
    Loader2, 
    Image as ImageIcon, 
    Type, 
    CheckSquare,
    SlidersHorizontal,
    Wand2,
    ChevronDown,
    ChevronUp,
    Scissors,
    ArrowUp,
    ArrowDown,
    RefreshCw
} from "lucide-react";
import { 
    getRenderFormTemplatesAction, 
    getRenderFormTemplateDetailsAction, 
    RenderFormTemplateSummary, 
    RenderFormComponent 
} from "@/app/actions/renderform";

interface ClientLayoutsEditorProps {
    layouts: ClientLayout[];
    onChange: (layouts: ClientLayout[]) => void;
    clientColumnsFallback?: ColumnDefinition[];
}

export function ClientLayoutsEditor({ layouts, onChange, clientColumnsFallback = [] }: ClientLayoutsEditorProps) {
    const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(layouts[0]?.id || null);
    const [renderformTemplates, setRenderformTemplates] = useState<RenderFormTemplateSummary[]>([]);
    const [templateSearchFeed, setTemplateSearchFeed] = useState("");
    const [templateSearchStories, setTemplateSearchStories] = useState("");
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    // Active sub-tab for RenderForm mapping: "feed" or "stories"
    const [activeDesignTab, setActiveDesignTab] = useState<"feed" | "stories">("feed");

    // Componentes do template de Feed e Stories
    const [feedComponents, setFeedComponents] = useState<RenderFormComponent[]>([]);
    const [storiesComponents, setStoriesComponents] = useState<RenderFormComponent[]>([]);
    const [isLoadingFeedDetails, setIsLoadingFeedDetails] = useState(false);
    const [isLoadingStoriesDetails, setIsLoadingStoriesDetails] = useState(false);

    // Estados para expandir detalhes avançados de cada componente (fórmula / tags e recorte)
    const [expandedFormulas, setExpandedFormulas] = useState<Record<string, boolean>>({});
    const [expandedMockups, setExpandedMockups] = useState<Record<string, boolean>>({});

    const toggleFormula = (key: string) => {
        setExpandedFormulas(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleMockup = (key: string) => {
        setExpandedMockups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Ref para a textarea da legenda para inserção no cursor
    const captionTextareaRef = useRef<HTMLTextAreaElement>(null);

    const insertTagAtCursor = (tag: string) => {
        const textarea = captionTextareaRef.current;
        const currentText = activeLayout?.captionTemplate || "";

        if (!textarea) {
            handleUpdateActiveLayout({ captionTemplate: currentText ? `${currentText} ${tag}` : tag });
            return;
        }

        const start = textarea.selectionStart ?? currentText.length;
        const end = textarea.selectionEnd ?? currentText.length;

        const newText = currentText.substring(0, start) + tag + currentText.substring(end);
        handleUpdateActiveLayout({ captionTemplate: newText });

        // Reposicionar o cursor logo após o texto inserido sem rolar a página
        setTimeout(() => {
            textarea.focus({ preventScroll: true });
            const newPos = start + tag.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 10);
    };

    const activeLayout = layouts.find(l => l.id === selectedLayoutId) || layouts[0] || null;

    // Sincronizar selectedLayoutId caso os layouts mudem (ex: ao abrir outro cliente)
    useEffect(() => {
        if (layouts.length > 0) {
            if (!selectedLayoutId || !layouts.some(l => l.id === selectedLayoutId)) {
                setSelectedLayoutId(layouts[0].id);
            }
        } else {
            setSelectedLayoutId(null);
        }
    }, [layouts]);

    // Garantir que a aba ativa (feed vs stories) seja coerente com o modelo ativo
    useEffect(() => {
        if (!activeLayout) return;
        const checkboxCol = activeLayout.columns.find(c => c.type === "checkbox" || c.name.toLowerCase().includes("formato"));
        const opts = checkboxCol?.options || ["Feed", "Stories"];
        const hasFeed = opts.some(o => o.toLowerCase().includes("feed"));
        const hasStories = opts.some(o => o.toLowerCase().includes("storie"));
        if (!hasFeed && hasStories && activeDesignTab === "feed") {
            setActiveDesignTab("stories");
        } else if (!hasStories && hasFeed && activeDesignTab === "stories") {
            setActiveDesignTab("feed");
        }
    }, [activeLayout?.id, activeLayout?.columns]);

    // Carregar lista de templates do RenderForm
    const handleReloadTemplates = async (force = true) => {
        setIsLoadingTemplates(true);
        try {
            const res = await getRenderFormTemplatesAction(force);
            if (res.success && res.templates) {
                setRenderformTemplates(res.templates);
            }
        } catch (err) {
            console.error("Erro ao carregar templates do RenderForm:", err);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    useEffect(() => {
        handleReloadTemplates(false);
    }, []);

    // Carregar componentes do template Feed
    useEffect(() => {
        let mounted = true;
        if (!activeLayout?.renderformTemplateId) {
            setFeedComponents([]);
            return;
        }
        const loadFeed = async () => {
            setIsLoadingFeedDetails(true);
            const res = await getRenderFormTemplateDetailsAction(activeLayout.renderformTemplateId!);
            if (mounted && res.success && res.template) {
                setFeedComponents(res.template.components || []);
            }
            if (mounted) setIsLoadingFeedDetails(false);
        };
        loadFeed();
        return () => { mounted = false; };
    }, [activeLayout?.renderformTemplateId]);

    // Carregar componentes do template Stories
    useEffect(() => {
        let mounted = true;
        if (!activeLayout?.renderformTemplateIdStories) {
            setStoriesComponents([]);
            return;
        }
        const loadStories = async () => {
            setIsLoadingStoriesDetails(true);
            const res = await getRenderFormTemplateDetailsAction(activeLayout.renderformTemplateIdStories!);
            if (mounted && res.success && res.template) {
                setStoriesComponents(res.template.components || []);
            }
            if (mounted) setIsLoadingStoriesDetails(false);
        };
        loadStories();
        return () => { mounted = false; };
    }, [activeLayout?.renderformTemplateIdStories]);

    const handleAddModel = (categoria: "padrao" | "depor" | "vendido" | "outro") => {
        const id = crypto.randomUUID();
        const nomeSugerido = categoria === "padrao" ? "Modelo Padrão" : categoria === "depor" ? "Modelo DE/POR" : categoria === "vendido" ? "Modelo Vendidos" : "Novo Modelo";
        
        let initialCols: ColumnDefinition[] = [];

        if (categoria === "vendido") {
            initialCols = [
                { id: crypto.randomUUID(), name: "Imagem Principal", type: "image" as const },
                { id: crypto.randomUUID(), name: "Nome do Veiculo", type: "text" as const },
                { id: crypto.randomUUID(), name: "Formato", type: "checkbox" as const, options: ["Feed", "Stories"] }
            ];
        } else if (categoria === "depor") {
            initialCols = [
                { id: crypto.randomUUID(), name: "Imagem Principal", type: "image" as const },
                { id: crypto.randomUUID(), name: "Nome do Veiculo", type: "text" as const },
                { id: crypto.randomUUID(), name: "Ano", type: "text" as const },
                { id: crypto.randomUUID(), name: "Cor", type: "text" as const },
                { id: crypto.randomUUID(), name: "Valor De", type: "text" as const },
                { id: crypto.randomUUID(), name: "Valor Por", type: "text" as const },
                { id: crypto.randomUUID(), name: "Opcional 1", type: "text" as const },
                { id: crypto.randomUUID(), name: "Opcional 2", type: "text" as const },
                { id: crypto.randomUUID(), name: "Imagem 1", type: "image" as const },
                { id: crypto.randomUUID(), name: "Imagem 2", type: "image" as const },
                { id: crypto.randomUUID(), name: "Imagem 3", type: "image" as const },
                { id: crypto.randomUUID(), name: "Formato", type: "checkbox" as const, options: ["Feed", "Stories"] }
            ];
        } else {
            initialCols = clientColumnsFallback.length > 0 
                ? JSON.parse(JSON.stringify(clientColumnsFallback))
                : [
                    { id: crypto.randomUUID(), name: "Imagem Principal", type: "image" as const },
                    { id: crypto.randomUUID(), name: "Nome do Veiculo", type: "text" as const },
                    { id: crypto.randomUUID(), name: "Ano", type: "text" as const },
                    { id: crypto.randomUUID(), name: "Valor", type: "text" as const },
                    { id: crypto.randomUUID(), name: "Opcional 1", type: "text" as const },
                    { id: crypto.randomUUID(), name: "Opcional 2", type: "text" as const },
                    { id: crypto.randomUUID(), name: "Imagem 1", type: "image" as const },
                    { id: crypto.randomUUID(), name: "Imagem 2", type: "image" as const },
                    { id: crypto.randomUUID(), name: "Imagem 3", type: "image" as const },
                    { id: crypto.randomUUID(), name: "Formato", type: "checkbox" as const, options: ["Feed", "Stories"] }
                ];
        }

        const newModel: ClientLayout = {
            id,
            nome: nomeSugerido,
            categoria,
            tipo: "tema",
            columns: initialCols,
            renderformMapping: {},
            renderformMappingStories: {}
        };

        const updated = [...layouts, newModel];
        onChange(updated);
        setSelectedLayoutId(id);
    };

    const handleUpdateActiveLayout = (updates: Partial<ClientLayout>) => {
        if (!activeLayout) return;
        const updated = layouts.map(l => l.id === activeLayout.id ? { ...l, ...updates } : l);
        onChange(updated);
    };

    const handleDeleteLayout = (id: string) => {
        const updated = layouts.filter(l => l.id !== id);
        onChange(updated);
        if (selectedLayoutId === id) {
            setSelectedLayoutId(updated[0]?.id || null);
        }
    };

    // Gerenciamento de Colunas do Modelo
    const addColumnToActive = (type: "text" | "image" | "checkbox") => {
        if (!activeLayout) return;
        const newCol: ColumnDefinition = {
            id: crypto.randomUUID(),
            name: type === "image" ? "Imagem " + (activeLayout.columns.filter(c => c.type === "image").length + 1) : "Novo Campo",
            type,
            options: type === "checkbox" ? ["Feed", "Stories"] : undefined
        };
        handleUpdateActiveLayout({ columns: [...activeLayout.columns, newCol] });
    };

    const updateColumnInActive = (colId: string, updates: Partial<ColumnDefinition>) => {
        if (!activeLayout) return;
        const newCols = activeLayout.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
        handleUpdateActiveLayout({ columns: newCols });
    };

    const removeColumnFromActive = (colId: string) => {
        if (!activeLayout) return;
        handleUpdateActiveLayout({ columns: activeLayout.columns.filter(c => c.id !== colId) });
    };

    const moveColumn = (index: number, direction: "up" | "down") => {
        if (!activeLayout) return;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= activeLayout.columns.length) return;

        const newCols = [...activeLayout.columns];
        const [movedCol] = newCols.splice(index, 1);
        newCols.splice(targetIndex, 0, movedCol);
        handleUpdateActiveLayout({ columns: newCols });
    };

    return (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        Modelos de Postagem da Concessionária
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        Cada Modelo reúne as colunas da tabela e os designs correspondentes de Feed e Stories.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAddModel("padrao")} 
                        className="h-8 text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1" /> + Modelo Padrão
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAddModel("depor")} 
                        className="h-8 text-xs bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1" /> + Modelo DE/POR
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAddModel("vendido")} 
                        className="h-8 text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1" /> + Vendidos
                    </Button>
                </div>
            </div>

            {layouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-black/20 rounded-lg border border-dashed border-white/10">
                    <p className="text-sm">Nenhum modelo cadastrado ainda.</p>
                    <p className="text-xs text-slate-500 mt-1">Crie um Modelo Padrão ou DE/POR acima para vincular os designs.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Lista lateral de Modelos */}
                    <div className="md:col-span-4 space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Modelos Cadastrados ({layouts.length})</label>
                        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                            {layouts.map(l => {
                                const isSelected = l.id === activeLayout?.id;
                                const isVendido = l.categoria === "vendido" || l.nome.toLowerCase().includes("vendido");
                                const isDePor = l.categoria === "depor" || l.nome.toLowerCase().includes("de/por") || l.nome.toLowerCase().includes("depor");

                                // Checa quais formatos estão habilitados nas colunas deste modelo
                                const checkboxCol = l.columns.find(c => c.type === "checkbox" || c.name.toLowerCase().includes("formato"));
                                const opts = checkboxCol?.options || ["Feed", "Stories"];
                                const hasFeed = opts.some(o => o.toLowerCase().includes("feed"));
                                const hasStories = opts.some(o => o.toLowerCase().includes("storie"));

                                return (
                                    <div
                                        key={l.id}
                                        onClick={() => setSelectedLayoutId(l.id)}
                                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                                            isSelected 
                                                ? "bg-indigo-600/20 border-indigo-500/60 text-white font-medium shadow-md" 
                                                : "bg-black/30 border-white/5 text-slate-300 hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="truncate flex-1">
                                            <div className="font-semibold flex items-center gap-1.5">
                                                <span>{isVendido ? "🏷️" : isDePor ? "💥" : "🚗"}</span>
                                                <span>{l.nome}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <span className="text-slate-400">{l.columns.length} colunas</span>
                                                {hasFeed && (
                                                    <>
                                                        <span>•</span>
                                                        <span className={l.renderformTemplateId ? "text-indigo-300" : "text-amber-400/80"}>
                                                            {l.renderformTemplateId ? "Feed ✓" : "Sem Feed"}
                                                        </span>
                                                    </>
                                                )}
                                                {hasStories && (
                                                    <>
                                                        <span>•</span>
                                                        <span className={l.renderformTemplateIdStories ? "text-purple-300" : "text-amber-400/80"}>
                                                            {l.renderformTemplateIdStories ? "Stories ✓" : "Sem Stories"}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Excluir o modelo "${l.nome}"?`)) handleDeleteLayout(l.id);
                                            }}
                                            className="p-1 text-slate-500 hover:text-red-400 transition-colors ml-2"
                                            title="Excluir Modelo"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detalhes e Mapeamento do Modelo Ativo */}
                    {activeLayout && (
                        <div className="md:col-span-8 space-y-4 bg-black/30 p-4 rounded-xl border border-white/10">
                            <div>
                                <label className="text-xs font-medium text-slate-300 mb-1 block">Nome do Modelo</label>
                                <Input
                                    value={activeLayout.nome}
                                    onChange={(e) => handleUpdateActiveLayout({ nome: e.target.value })}
                                    placeholder="Ex: Modelo Padrão ou Modelo DE/POR"
                                    className="h-8 text-xs bg-slate-900 border-slate-700 font-semibold text-white"
                                />
                            </div>

                            {/* 1. ESTRUTURA DAS COLUNAS DESTE MODELO */}
                            <div className="space-y-2 border-t border-white/10 pt-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                        <span>Campos da Tabela para este Modelo</span>
                                        <span className="text-[10px] text-slate-400 font-normal">({activeLayout.columns.length} colunas)</span>
                                    </label>
                                    <div className="flex space-x-1.5">
                                        <Button size="sm" variant="outline" onClick={() => addColumnToActive("text")} className="h-7 text-[11px] px-2">
                                            <Type className="w-3 h-3 mr-1" /> + Texto
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addColumnToActive("image")} className="h-7 text-[11px] px-2">
                                            <ImageIcon className="w-3 h-3 mr-1" /> + Imagem
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addColumnToActive("checkbox")} className="h-7 text-[11px] px-2">
                                            <CheckSquare className="w-3 h-3 mr-1" /> + Checkbox
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                    {activeLayout.columns.map((col, idx) => (
                                        <div key={col.id} className="flex flex-col gap-1 bg-slate-900/80 p-1.5 rounded border border-white/5">
                                            <div className="flex items-center space-x-1.5">
                                                {/* Botões de Ordenação */}
                                                <div className="flex flex-col shrink-0 items-center justify-center -space-y-1">
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => moveColumn(idx, "up")}
                                                        className={`p-0.5 rounded hover:bg-slate-800 transition-colors ${
                                                            idx === 0 ? "opacity-20 cursor-not-allowed text-slate-600" : "text-slate-400 hover:text-indigo-300"
                                                        }`}
                                                        title="Mover campo para cima"
                                                    >
                                                        <ArrowUp size={11} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === activeLayout.columns.length - 1}
                                                        onClick={() => moveColumn(idx, "down")}
                                                        className={`p-0.5 rounded hover:bg-slate-800 transition-colors ${
                                                            idx === activeLayout.columns.length - 1 ? "opacity-20 cursor-not-allowed text-slate-600" : "text-slate-400 hover:text-indigo-300"
                                                        }`}
                                                        title="Mover campo para baixo"
                                                    >
                                                        <ArrowDown size={11} />
                                                    </button>
                                                </div>

                                                <span className="text-[10px] text-slate-500 w-4 text-center font-mono">{idx + 1}</span>
                                                <Input
                                                    value={col.name}
                                                    onChange={(e) => updateColumnInActive(col.id, { name: e.target.value })}
                                                    placeholder="Nome do Campo"
                                                    className="h-7 text-xs bg-black/40 border-slate-700 flex-1"
                                                />
                                                <select
                                                    value={col.type}
                                                    onChange={(e) => {
                                                        const newType = e.target.value as any;
                                                        const updates: Partial<ColumnDefinition> = { type: newType };
                                                        if (newType === "checkbox" && (!col.options || col.options.length === 0)) {
                                                            updates.options = ["Feed", "Stories"];
                                                        }
                                                        updateColumnInActive(col.id, updates);
                                                    }}
                                                    className="h-7 text-[11px] bg-black/40 border border-slate-700 rounded px-2 text-white outline-none"
                                                >
                                                    <option value="text">Texto</option>
                                                    <option value="image">Imagem</option>
                                                    <option value="checkbox">Checkbox (Múltipla Escolha)</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removeColumnFromActive(col.id)}
                                                    className="text-slate-500 hover:text-red-400 p-1"
                                                    title="Excluir Campo"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>

                                            {/* Se for Checkbox, exibe as opções editáveis (ex: Feed, Stories) */}
                                            {col.type === "checkbox" && (
                                                <div className="flex items-center gap-1.5 pl-6 pt-0.5">
                                                    <span className="text-[9px] text-indigo-300 font-medium">Opções do Checkbox:</span>
                                                    <Input
                                                        value={(col.options || ["Feed", "Stories"]).join(", ")}
                                                        onChange={(e) => {
                                                            const opts = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                                            updateColumnInActive(col.id, { options: opts });
                                                            const hasFeed = opts.some(o => o.toLowerCase().includes("feed"));
                                                            const hasStories = opts.some(o => o.toLowerCase().includes("storie"));
                                                            if (!hasStories && activeDesignTab === "stories") {
                                                                setActiveDesignTab("feed");
                                                            } else if (!hasFeed && activeDesignTab === "feed") {
                                                                setActiveDesignTab("stories");
                                                            }
                                                        }}
                                                        placeholder="Feed, Stories"
                                                        className="h-6 text-[10px] bg-black/60 border-indigo-500/30 text-indigo-200 font-mono flex-1"
                                                    />
                                                    <span className="text-[9px] text-slate-500 italic">(separadas por vírgula)</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. SEÇÃO DE VINCULAÇÃO DOS TEMPLATES RENDERFORM (ABAS FEED E STORIES) */}
                            <div className="bg-indigo-950/20 p-3.5 rounded-lg border border-indigo-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                        <h5 className="text-xs font-bold text-indigo-200">Designs RenderForm deste Modelo</h5>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isLoadingTemplates && (
                                            <span className="text-[10px] text-indigo-300 flex items-center">
                                                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Carregando RenderForm...
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleReloadTemplates(true)}
                                            disabled={isLoadingTemplates}
                                            className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white rounded border border-indigo-400/30 flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                                            title="Recarregar lista de templates diretamente do RenderForm"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${isLoadingTemplates ? "animate-spin" : ""}`} />
                                            <span>Recarregar Templates</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Seletor de Aba de Design: FEED vs STORIES (dinâmico com as Opções do Checkbox) */}
                                {(() => {
                                    const checkboxCol = activeLayout.columns.find(c => c.type === "checkbox" || c.name.toLowerCase().includes("formato"));
                                    const opts = checkboxCol?.options || ["Feed", "Stories"];
                                    const hasFeed = opts.some(o => o.toLowerCase().includes("feed"));
                                    const hasStories = opts.some(o => o.toLowerCase().includes("storie"));

                                    return (
                                        <>
                                            <div className="flex border-b border-indigo-500/20 pb-1 gap-2">
                                                {hasFeed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveDesignTab("feed")}
                                                        className={`px-3 py-1 text-xs rounded-t font-semibold transition-all flex items-center gap-1.5 ${
                                                            activeDesignTab === "feed" 
                                                                ? "bg-indigo-600 text-white shadow-md border-b-2 border-white" 
                                                                : "text-indigo-300/70 hover:text-white"
                                                        }`}
                                                    >
                                                        <span>🖼️ Design Feed</span>
                                                        <span className="text-[10px] opacity-75">
                                                            ({activeLayout.renderformTemplateId ? "Vinculado" : "Não vinculado"})
                                                        </span>
                                                    </button>
                                                )}
                                                {hasStories && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveDesignTab("stories")}
                                                        className={`px-3 py-1 text-xs rounded-t font-semibold transition-all flex items-center gap-1.5 ${
                                                            activeDesignTab === "stories" 
                                                                ? "bg-purple-600 text-white shadow-md border-b-2 border-white" 
                                                                : "text-purple-300/70 hover:text-white"
                                                        }`}
                                                    >
                                                        <span>📱 Design Stories</span>
                                                        <span className="text-[10px] opacity-75">
                                                            ({activeLayout.renderformTemplateIdStories ? "Vinculado" : "Não vinculado"})
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* CONTEÚDO DA ABA FEED */}
                                {activeDesignTab === "feed" && (
                                    <div className="space-y-3 pt-1">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[11px] text-indigo-300 font-medium block">
                                                    Template do Feed no RenderForm:
                                                </label>
                                                <div className="w-44">
                                                    <Input
                                                        value={templateSearchFeed}
                                                        onChange={(e) => setTemplateSearchFeed(e.target.value)}
                                                        placeholder="Buscar template feed..."
                                                        className="h-6 text-[10px] bg-slate-900/80 border-indigo-500/20 px-2 py-0"
                                                    />
                                                </div>
                                            </div>
                                            <select
                                                value={activeLayout.renderformTemplateId || ""}
                                                onChange={(e) => {
                                                    const tId = e.target.value;
                                                    const found = renderformTemplates.find(t => t.identifier === tId);
                                                    handleUpdateActiveLayout({
                                                        renderformTemplateId: tId,
                                                        renderformTemplateName: found ? found.name : undefined
                                                    });
                                                }}
                                                className="flex h-8 w-full rounded-md border border-indigo-500/30 bg-slate-900 px-3 text-xs text-white outline-none focus:border-indigo-400"
                                            >
                                                <option value="">-- Nenhum template de Feed selecionado --</option>
                                                {renderformTemplates
                                                    .filter(t => !templateSearchFeed.trim() || t.name.toLowerCase().includes(templateSearchFeed.toLowerCase()))
                                                    .map(t => (
                                                        <option key={t.identifier} value={t.identifier}>
                                                            {t.name} ({t.width}x{t.height} - {t.format.toUpperCase()})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Componentes do Feed */}
                                        {activeLayout.renderformTemplateId && (
                                            <div className="space-y-2 border-t border-indigo-500/20 pt-2">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-indigo-300 font-semibold">Camadas / Componentes do Feed:</span>
                                                    {isLoadingFeedDetails && (
                                                        <span className="text-indigo-400 flex items-center text-[10px]">
                                                            <Loader2 className="w-3 h-3 animate-spin mr-1" /> Mapeando camadas...
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                                    {feedComponents.map(comp => {
                                                        const currentMappingValue = activeLayout.renderformMapping?.[comp.propertyKey] || "";
                                                        const isDirectColumn = activeLayout.columns.some(c => c.id === currentMappingValue);
                                                        const isCustomFormula = !isDirectColumn && currentMappingValue !== "";
                                                        const hasMockup = !!activeLayout.cloudinaryTransformations?.[comp.propertyKey];
                                                        
                                                        const isFormulaOpen = expandedFormulas[`feed_${comp.propertyKey}`] ?? isCustomFormula;
                                                        const isMockupOpen = expandedMockups[`feed_${comp.propertyKey}`] ?? hasMockup;

                                                        return (
                                                            <div key={comp.propertyKey} className="bg-slate-950/70 p-2.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                                                                {/* Linha Principal: Camada, Tipo e Coluna Direta */}
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="font-mono text-xs text-slate-100 font-bold truncate">{comp.id}</span>
                                                                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                                                                            comp.type === "IMAGE" 
                                                                                ? "bg-purple-950 text-purple-300 border border-purple-800/50" 
                                                                                : "bg-blue-950 text-blue-300 border border-blue-800/50"
                                                                        }`}>
                                                                            {comp.type}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <select
                                                                            value={isDirectColumn ? currentMappingValue : ""}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newMap = { ...(activeLayout.renderformMapping || {}) };
                                                                                if (val) newMap[comp.propertyKey] = val;
                                                                                else delete newMap[comp.propertyKey];
                                                                                handleUpdateActiveLayout({ renderformMapping: newMap });
                                                                            }}
                                                                            className={`h-7 text-xs bg-slate-900 border rounded px-2 text-white outline-none w-48 ${
                                                                                isCustomFormula 
                                                                                    ? "border-amber-500/50 text-amber-300 bg-amber-950/20" 
                                                                                    : "border-slate-700 focus:border-indigo-500"
                                                                            }`}
                                                                        >
                                                                            <option value="">{isCustomFormula ? "✨ Fórmula Ativa" : "-- Coluna Direta --"}</option>
                                                                            {activeLayout.columns.map(col => (
                                                                                <option key={col.id} value={col.id}>➔ {col.name} ({col.type})</option>
                                                                            ))}
                                                                        </select>

                                                                        {/* Botão de Toggle para Fórmula / Tags */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleFormula(`feed_${comp.propertyKey}`)}
                                                                            title="Expressão avançada / concatenar campos"
                                                                            className={`h-7 px-2 text-[10px] rounded border flex items-center gap-1 transition-all ${
                                                                                isFormulaOpen || isCustomFormula
                                                                                    ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50"
                                                                                    : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                                                                            }`}
                                                                        >
                                                                            <Sparkles className="w-3 h-3 text-indigo-400" />
                                                                            <span>Fórmula</span>
                                                                            {isFormulaOpen ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                                                                        </button>

                                                                        {/* Botão de Toggle para Mockup/Recorte (apenas IMAGE) */}
                                                                        {comp.type === "IMAGE" && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleMockup(`feed_${comp.propertyKey}`)}
                                                                                title="Configurar recorte ou mockup Cloudinary"
                                                                                className={`h-7 px-2 text-[10px] rounded border flex items-center gap-1 transition-all ${
                                                                                    hasMockup
                                                                                        ? "bg-purple-600/30 text-purple-200 border-purple-500/60 font-semibold"
                                                                                        : isMockupOpen
                                                                                            ? "bg-slate-800 text-purple-300 border-purple-500/40"
                                                                                            : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                                                                                }`}
                                                                            >
                                                                                <Scissors className="w-3 h-3 text-purple-400" />
                                                                                <span>{hasMockup ? "Recorte ✓" : "Recorte"}</span>
                                                                                {isMockupOpen ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Gaveta de Expressão / Fórmula (Expansível) */}
                                                                {isFormulaOpen && (
                                                                    <div className="mt-2 pt-2 border-t border-indigo-500/10 space-y-1.5 bg-slate-900/40 p-2 rounded">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] text-indigo-300/80 font-medium flex items-center gap-1">
                                                                                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                                                                                Inserir campos na fórmula:
                                                                            </span>
                                                                            <div className="flex gap-1 flex-wrap justify-end">
                                                                                {activeLayout.columns
                                                                                    .filter(c => comp.type === "IMAGE" ? c.type === "image" : c.type === "text" || c.type === "checkbox")
                                                                                    .map(c => {
                                                                                        const isValor = c.name.toLowerCase().includes("valor") || c.name.toLowerCase().includes("preco") || c.name.toLowerCase().includes("preço");

                                                                                        if (isValor) {
                                                                                            return (
                                                                                                <div key={c.id} className="inline-flex gap-1">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const tag = `{{${c.name}}}`;
                                                                                                            const current = currentMappingValue ? `${currentMappingValue} • ${tag}` : tag;
                                                                                                            const newMap = { ...(activeLayout.renderformMapping || {}) };
                                                                                                            newMap[comp.propertyKey] = current;
                                                                                                            handleUpdateActiveLayout({ renderformMapping: newMap });
                                                                                                        }}
                                                                                                        className="text-[9px] bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 px-1.5 py-0.5 rounded transition-colors"
                                                                                                        title="Insere com R$"
                                                                                                    >
                                                                                                        + {c.name} (com R$)
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const tag = `{{${c.name}|sem_cifrao}}`;
                                                                                                            const current = currentMappingValue ? `${currentMappingValue} • ${tag}` : tag;
                                                                                                            const newMap = { ...(activeLayout.renderformMapping || {}) };
                                                                                                            newMap[comp.propertyKey] = current;
                                                                                                            handleUpdateActiveLayout({ renderformMapping: newMap });
                                                                                                        }}
                                                                                                        className="text-[9px] bg-teal-500/15 hover:bg-teal-500/30 text-teal-200 border border-teal-500/30 px-1.5 py-0.5 rounded transition-colors"
                                                                                                        title="Remove R$ e deixa apenas os números"
                                                                                                    >
                                                                                                        + {c.name} (sem R$)
                                                                                                    </button>
                                                                                                </div>
                                                                                            );
                                                                                        }

                                                                                        return (
                                                                                            <button
                                                                                                key={c.id}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const tag = `{{${c.name}}}`;
                                                                                                    const current = currentMappingValue ? `${currentMappingValue} • ${tag}` : tag;
                                                                                                    const newMap = { ...(activeLayout.renderformMapping || {}) };
                                                                                                    newMap[comp.propertyKey] = current;
                                                                                                    handleUpdateActiveLayout({ renderformMapping: newMap });
                                                                                                }}
                                                                                                className="text-[9px] bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 px-1.5 py-0.5 rounded transition-colors"
                                                                                            >
                                                                                                + {c.name}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            value={currentMappingValue}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newMap = { ...(activeLayout.renderformMapping || {}) };
                                                                                if (val) newMap[comp.propertyKey] = val;
                                                                                else delete newMap[comp.propertyKey];
                                                                                handleUpdateActiveLayout({ renderformMapping: newMap });
                                                                            }}
                                                                            placeholder="Ex: {{Marca}} • {{Ano}} ou {{Preço}}"
                                                                            className="h-6 text-xs bg-slate-950 border-indigo-500/30 text-indigo-100 font-mono"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Gaveta de Mockup / Recorte Cloudinary (Expansível) */}
                                                                {comp.type === "IMAGE" && isMockupOpen && (
                                                                    <div className="mt-2 pt-2 border-t border-purple-500/20 bg-purple-950/20 p-2 rounded space-y-1.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                                                                                <Scissors className="w-3 h-3 text-purple-400" />
                                                                                Recorte / Mockup Cloudinary:
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const mockExpression = "c_fill,w_650,h_450,g_center/l_Group_93_2_wkjwms,fl_cutter,w_650,h_450/l_Group_93_2_wkjwms,w_650,h_450,co_white,e_make_transparent:20";
                                                                                        const newTransforms = { ...(activeLayout.cloudinaryTransformations || {}) };
                                                                                        newTransforms[comp.propertyKey] = mockExpression;
                                                                                        handleUpdateActiveLayout({ cloudinaryTransformations: newTransforms });
                                                                                    }}
                                                                                    className="text-[9px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 px-1.5 py-0.5 rounded"
                                                                                >
                                                                                    🔷 Usar Losango Padrão
                                                                                </button>
                                                                                {hasMockup && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newTransforms = { ...(activeLayout.cloudinaryTransformations || {}) };
                                                                                            delete newTransforms[comp.propertyKey];
                                                                                            handleUpdateActiveLayout({ cloudinaryTransformations: newTransforms });
                                                                                        }}
                                                                                        className="text-[9px] text-red-400 hover:text-red-300 underline"
                                                                                    >
                                                                                        Remover
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            value={activeLayout.cloudinaryTransformations?.[comp.propertyKey] || ""}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newTransforms = { ...(activeLayout.cloudinaryTransformations || {}) };
                                                                                if (val) newTransforms[comp.propertyKey] = val;
                                                                                else delete newTransforms[comp.propertyKey];
                                                                                handleUpdateActiveLayout({ cloudinaryTransformations: newTransforms });
                                                                            }}
                                                                            placeholder="c_fill,w_650,h_450... /l_Group..."
                                                                            className="h-6 text-[10px] bg-slate-950 border-purple-500/40 text-purple-200 font-mono"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CONTEÚDO DA ABA STORIES */}
                                {activeDesignTab === "stories" && (
                                    <div className="space-y-3 pt-1">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[11px] text-purple-300 font-medium block">
                                                    Template de Stories no RenderForm:
                                                </label>
                                                <div className="w-44">
                                                    <Input
                                                        value={templateSearchStories}
                                                        onChange={(e) => setTemplateSearchStories(e.target.value)}
                                                        placeholder="Buscar template stories..."
                                                        className="h-6 text-[10px] bg-slate-900/80 border-purple-500/20 px-2 py-0"
                                                    />
                                                </div>
                                            </div>
                                            <select
                                                value={activeLayout.renderformTemplateIdStories || ""}
                                                onChange={(e) => {
                                                    const tId = e.target.value;
                                                    const found = renderformTemplates.find(t => t.identifier === tId);
                                                    handleUpdateActiveLayout({
                                                        renderformTemplateIdStories: tId,
                                                        renderformTemplateNameStories: found ? found.name : undefined
                                                    });
                                                }}
                                                className="flex h-8 w-full rounded-md border border-purple-500/30 bg-slate-900 px-3 text-xs text-white outline-none focus:border-purple-400"
                                            >
                                                <option value="">-- Nenhum template de Stories selecionado --</option>
                                                {renderformTemplates
                                                    .filter(t => !templateSearchStories.trim() || t.name.toLowerCase().includes(templateSearchStories.toLowerCase()))
                                                    .map(t => (
                                                        <option key={t.identifier} value={t.identifier}>
                                                            {t.name} ({t.width}x{t.height} - {t.format.toUpperCase()})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Componentes do Stories */}
                                        {activeLayout.renderformTemplateIdStories && (
                                            <div className="space-y-2 border-t border-purple-500/20 pt-2">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-purple-300 font-semibold">Camadas / Componentes do Stories:</span>
                                                    {isLoadingStoriesDetails && (
                                                        <span className="text-purple-400 flex items-center text-[10px]">
                                                            <Loader2 className="w-3 h-3 animate-spin mr-1" /> Mapeando camadas...
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                                    {storiesComponents.map(comp => {
                                                        const currentMappingValue = activeLayout.renderformMappingStories?.[comp.propertyKey] || "";
                                                        const isDirectColumn = activeLayout.columns.some(c => c.id === currentMappingValue);
                                                        const isCustomFormula = !isDirectColumn && currentMappingValue !== "";
                                                        const hasMockup = !!activeLayout.cloudinaryTransformationsStories?.[comp.propertyKey];
                                                        
                                                        const isFormulaOpen = expandedFormulas[`stories_${comp.propertyKey}`] ?? isCustomFormula;
                                                        const isMockupOpen = expandedMockups[`stories_${comp.propertyKey}`] ?? hasMockup;

                                                        return (
                                                            <div key={comp.propertyKey} className="bg-slate-950/70 p-2.5 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                                                                {/* Linha Principal: Camada, Tipo e Coluna Direta */}
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="font-mono text-xs text-slate-100 font-bold truncate">{comp.id}</span>
                                                                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                                                                            comp.type === "IMAGE" 
                                                                                ? "bg-purple-950 text-purple-300 border border-purple-800/50" 
                                                                                : "bg-blue-950 text-blue-300 border border-blue-800/50"
                                                                        }`}>
                                                                            {comp.type}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <select
                                                                            value={isDirectColumn ? currentMappingValue : ""}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newMap = { ...(activeLayout.renderformMappingStories || {}) };
                                                                                if (val) newMap[comp.propertyKey] = val;
                                                                                else delete newMap[comp.propertyKey];
                                                                                handleUpdateActiveLayout({ renderformMappingStories: newMap });
                                                                            }}
                                                                            className={`h-7 text-xs bg-slate-900 border rounded px-2 text-white outline-none w-48 ${
                                                                                isCustomFormula 
                                                                                    ? "border-amber-500/50 text-amber-300 bg-amber-950/20" 
                                                                                    : "border-slate-700 focus:border-purple-500"
                                                                            }`}
                                                                        >
                                                                            <option value="">{isCustomFormula ? "✨ Fórmula Ativa" : "-- Coluna Direta --"}</option>
                                                                            {activeLayout.columns.map(col => (
                                                                                <option key={col.id} value={col.id}>➔ {col.name} ({col.type})</option>
                                                                            ))}
                                                                        </select>

                                                                        {/* Botão de Toggle para Fórmula / Tags */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleFormula(`stories_${comp.propertyKey}`)}
                                                                            title="Expressão avançada / concatenar campos"
                                                                            className={`h-7 px-2 text-[10px] rounded border flex items-center gap-1 transition-all ${
                                                                                isFormulaOpen || isCustomFormula
                                                                                    ? "bg-purple-600/30 text-purple-200 border-purple-500/50"
                                                                                    : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                                                                            }`}
                                                                        >
                                                                            <Sparkles className="w-3 h-3 text-purple-400" />
                                                                            <span>Fórmula</span>
                                                                            {isFormulaOpen ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                                                                        </button>

                                                                        {/* Botão de Toggle para Mockup/Recorte (apenas IMAGE) */}
                                                                        {comp.type === "IMAGE" && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleMockup(`stories_${comp.propertyKey}`)}
                                                                                title="Configurar recorte ou mockup Cloudinary"
                                                                                className={`h-7 px-2 text-[10px] rounded border flex items-center gap-1 transition-all ${
                                                                                    hasMockup
                                                                                        ? "bg-purple-600/30 text-purple-200 border-purple-500/60 font-semibold"
                                                                                        : isMockupOpen
                                                                                            ? "bg-slate-800 text-purple-300 border-purple-500/40"
                                                                                            : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                                                                                }`}
                                                                            >
                                                                                <Scissors className="w-3 h-3 text-purple-400" />
                                                                                <span>{hasMockup ? "Recorte ✓" : "Recorte"}</span>
                                                                                {isMockupOpen ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Gaveta de Expressão / Fórmula (Expansível) */}
                                                                {isFormulaOpen && (
                                                                    <div className="mt-2 pt-2 border-t border-purple-500/10 space-y-1.5 bg-slate-900/40 p-2 rounded">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] text-purple-300/80 font-medium flex items-center gap-1">
                                                                                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                                                                Inserir campos na fórmula:
                                                                            </span>
                                                                            <div className="flex gap-1 flex-wrap justify-end">
                                                                                {activeLayout.columns
                                                                                    .filter(c => comp.type === "IMAGE" ? c.type === "image" : c.type === "text" || c.type === "checkbox")
                                                                                    .map(c => {
                                                                                        const isValor = c.name.toLowerCase().includes("valor") || c.name.toLowerCase().includes("preco") || c.name.toLowerCase().includes("preço");

                                                                                        if (isValor) {
                                                                                            return (
                                                                                                <div key={c.id} className="inline-flex gap-1">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const tag = `{{${c.name}}}`;
                                                                                                            const current = currentMappingValue ? `${currentMappingValue} • ${tag}` : tag;
                                                                                                            const newMap = { ...(activeLayout.renderformMappingStories || {}) };
                                                                                                            newMap[comp.propertyKey] = current;
                                                                                                            handleUpdateActiveLayout({ renderformMappingStories: newMap });
                                                                                                        }}
                                                                                                        className="text-[9px] bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 px-1.5 py-0.5 rounded transition-colors"
                                                                                                        title="Insere com R$"
                                                                                                    >
                                                                                                        + {c.name} (com R$)
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const tag = `{{${c.name}|sem_cifrao}}`;
                                                                                                            const current = currentMappingValue ? `${currentMappingValue} • ${tag}` : tag;
                                                                                                            const newMap = { ...(activeLayout.renderformMappingStories || {}) };
                                                                                                            newMap[comp.propertyKey] = current;
                                                                                                            handleUpdateActiveLayout({ renderformMappingStories: newMap });
                                                                                                        }}
                                                                                                        className="text-[9px] bg-teal-500/15 hover:bg-teal-500/30 text-teal-200 border border-teal-500/30 px-1.5 py-0.5 rounded transition-colors"
                                                                                                        title="Remove R$ e deixa apenas os números"
                                                                                                    >
                                                                                                        + {c.name} (sem R$)
                                                                                                    </button>
                                                                                                </div>
                                                                                            );
                                                                                        }

                                                                                        return (
                                                                                            <button
                                                                                                key={c.id}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const tag = `{{${c.name}}}`;
                                                                                                    const current = currentMappingValue ? `${currentMappingValue} • ${tag}` : tag;
                                                                                                    const newMap = { ...(activeLayout.renderformMappingStories || {}) };
                                                                                                    newMap[comp.propertyKey] = current;
                                                                                                    handleUpdateActiveLayout({ renderformMappingStories: newMap });
                                                                                                }}
                                                                                                className="text-[9px] bg-purple-500/15 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 px-1.5 py-0.5 rounded transition-colors"
                                                                                            >
                                                                                                + {c.name}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            value={currentMappingValue}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newMap = { ...(activeLayout.renderformMappingStories || {}) };
                                                                                if (val) newMap[comp.propertyKey] = val;
                                                                                else delete newMap[comp.propertyKey];
                                                                                handleUpdateActiveLayout({ renderformMappingStories: newMap });
                                                                            }}
                                                                            placeholder="Ex: {{Marca}} • {{Ano}} ou {{Preço}}"
                                                                            className="h-6 text-xs bg-slate-950 border-purple-500/30 text-purple-100 font-mono"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Gaveta de Mockup / Recorte Cloudinary (Expansível) */}
                                                                {comp.type === "IMAGE" && isMockupOpen && (
                                                                    <div className="mt-2 pt-2 border-t border-purple-500/20 bg-purple-950/20 p-2 rounded space-y-1.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                                                                                <Scissors className="w-3 h-3 text-purple-400" />
                                                                                Recorte / Mockup Cloudinary:
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const mockExpression = "c_fill,w_650,h_450,g_center/l_Group_93_2_wkjwms,fl_cutter,w_650,h_450/l_Group_93_2_wkjwms,w_650,h_450,co_white,e_make_transparent:20";
                                                                                        const newTransforms = { ...(activeLayout.cloudinaryTransformationsStories || {}) };
                                                                                        newTransforms[comp.propertyKey] = mockExpression;
                                                                                        handleUpdateActiveLayout({ cloudinaryTransformationsStories: newTransforms });
                                                                                    }}
                                                                                    className="text-[9px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 px-1.5 py-0.5 rounded"
                                                                                >
                                                                                    🔷 Usar Losango Padrão
                                                                                </button>
                                                                                {hasMockup && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newTransforms = { ...(activeLayout.cloudinaryTransformationsStories || {}) };
                                                                                            delete newTransforms[comp.propertyKey];
                                                                                            handleUpdateActiveLayout({ cloudinaryTransformationsStories: newTransforms });
                                                                                        }}
                                                                                        className="text-[9px] text-red-400 hover:text-red-300 underline"
                                                                                    >
                                                                                        Remover
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            value={activeLayout.cloudinaryTransformationsStories?.[comp.propertyKey] || ""}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newTransforms = { ...(activeLayout.cloudinaryTransformationsStories || {}) };
                                                                                if (val) newTransforms[comp.propertyKey] = val;
                                                                                else delete newTransforms[comp.propertyKey];
                                                                                handleUpdateActiveLayout({ cloudinaryTransformationsStories: newTransforms });
                                                                            }}
                                                                            placeholder="c_fill,w_650,h_450... /l_Group..."
                                                                            className="h-6 text-[10px] bg-slate-950 border-purple-500/40 text-purple-200 font-mono"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 3. SEÇÃO DE MODELO DE LEGENDA DESTE MODELO */}
                            <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-700/60 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Type className="w-4 h-4 text-emerald-400" />
                                        <h5 className="text-xs font-bold text-slate-200">
                                            Modelo de Legenda deste Modelo
                                        </h5>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        Clique nos botões para inserir as tags das colunas
                                    </span>
                                </div>

                                {/* Tags das Colunas para Inserção Rápida */}
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/60 rounded-md border border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-semibold self-center mr-1">Campos:</span>
                                    {activeLayout.columns
                                        .filter(c => c.type !== "image")
                                        .map(col => {
                                            const isValor = col.name.toLowerCase().includes("valor") || col.name.toLowerCase().includes("preco") || col.name.toLowerCase().includes("preço");

                                            if (isValor) {
                                                return (
                                                    <div key={col.id} className="inline-flex gap-1">
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => insertTagAtCursor(`{{${col.name}|com_cifrao}}`)}
                                                            className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono transition-colors"
                                                            title="Garante 'R$' na frente do valor no local do cursor"
                                                        >
                                                            + {col.name} (com R$)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => insertTagAtCursor(`{{${col.name}|sem_cifrao}}`)}
                                                            className="text-[10px] bg-teal-500/10 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded font-mono transition-colors"
                                                            title="Remove R$ e formata apenas o número no local do cursor"
                                                        >
                                                            + {col.name} (sem R$)
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            const isOpcional = col.name.toLowerCase().includes("opciona") || col.name.toLowerCase().includes("item") || col.name.toLowerCase().includes("itens") || col.name.toLowerCase().includes("acessorio");

                                            if (isOpcional) {
                                                return (
                                                    <div key={col.id} className="inline-flex gap-1">
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => insertTagAtCursor(`{{${col.name}|lista}}`)}
                                                            className="text-[10px] bg-green-500/10 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-2 py-0.5 rounded font-mono transition-colors"
                                                            title="Cria automaticamente a listinha com ✅ para cada item no local do cursor"
                                                        >
                                                            + {col.name} (Lista ✅)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => insertTagAtCursor(`{{${col.name}|lista:🔹}}`)}
                                                            className="text-[10px] bg-blue-500/10 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono transition-colors"
                                                            title="Cria a listinha com 🔹 no local do cursor"
                                                        >
                                                            + {col.name} (Lista 🔹)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => insertTagAtCursor(`{{${col.name}}}`)}
                                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-mono transition-colors"
                                                        >
                                                            + {col.name} (Texto)
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={col.id}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => insertTagAtCursor(`{{${col.name}}}`)}
                                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-mono transition-colors"
                                                >
                                                    + {col.name}
                                                </button>
                                            );
                                        })}
                                </div>

                                <textarea
                                    ref={captionTextareaRef}
                                    value={activeLayout.captionTemplate || ""}
                                    onChange={(e) => handleUpdateActiveLayout({ captionTemplate: e.target.value })}
                                    rows={5}
                                    placeholder={`Exemplo de Legenda:\n💥 {{Nome do Veículo}}\n📅 {{Ano}}\n💰 {{Valor}}\n\nEntre em contato conosco!`}
                                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 font-sans leading-relaxed custom-scrollbar"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
