"use client";

import { useState } from "react";
import { Plus, Trash, Edit, Save, X, Type, Image as ImageIcon, ArrowUp, ArrowDown, CheckSquare, Instagram, Facebook, Box } from "lucide-react";
import { useStore, LayoutClient, ColumnDefinition, ColumnType } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LayoutClientManager() {
    const { layoutClients, addLayoutClient, updateLayoutClient, deleteLayoutClient } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<LayoutClient | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookPostagens, setWebhookPostagens] = useState("");
    const [prompt, setPrompt] = useState("");
    const [columns, setColumns] = useState<ColumnDefinition[]>([]);

    // Social / Models State
    const [instagramUserId, setInstagramUserId] = useState("");
    const [instagramToken, setInstagramToken] = useState("");
    const [facebookUserId, setFacebookUserId] = useState("");
    const [facebookToken, setFacebookToken] = useState("");
    const [modeloFeedId, setModeloFeedId] = useState("");
    const [modeloStoriesId, setModeloStoriesId] = useState("");
    const [jsonCliente, setJsonCliente] = useState<any>({});

    const openNewClientModal = () => {
        setEditingClient(null);
        setName("");
        setWebhookUrl("");
        setWebhookPostagens("");
        setPrompt("");
        setColumns([{ id: crypto.randomUUID(), name: "Título", type: "text" }]);
        setInstagramUserId("");
        setInstagramToken("");
        setFacebookUserId("");
        setFacebookToken("");
        setModeloFeedId("");
        setModeloStoriesId("");
        setJsonCliente({});
        setIsModalOpen(true);
    };

    const openEditClientModal = (client: LayoutClient) => {
        setEditingClient(client);
        setName(client.name);
        setWebhookUrl(client.webhookUrl);
        setWebhookPostagens(client.webhookPostagens || "");
        setPrompt(client.prompt || "");
        setColumns([...client.columns]);
        setInstagramUserId(client.instagramUserId || "");
        setInstagramToken(client.instagramToken || "");
        setFacebookUserId(client.facebookUserId || "");
        setFacebookToken(client.facebookToken || "");
        setModeloFeedId(client.modeloFeedId || "");
        setModeloStoriesId(client.modeloStoriesId || "");
        setJsonCliente(client.jsonCliente || {});
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!name || !webhookUrl) return alert("Preencha nome e webhook");

        const clientData = {
            name,
            webhookUrl,
            webhookPostagens,
            prompt,
            columns: columns.filter((c) => c.name.trim() !== ""),
            instagramUserId,
            instagramToken,
            facebookUserId,
            facebookToken,
            modeloFeedId,
            modeloStoriesId,
            jsonCliente
        };

        if (editingClient) {
            updateLayoutClient(editingClient.id, clientData);
        } else {
            addLayoutClient(clientData);
        }
        setIsModalOpen(false);
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                    Gerenciamento de Clientes (Layouts)
                </h2>
                <Button onClick={openNewClientModal} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...layoutClients].sort((a, b) => a.name.localeCompare(b.name)).map((client) => (
                    <Card key={client.id} className="relative group overflow-hidden border-white/5 hover:border-indigo-500/50 transition-colors bg-card/50">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg text-white">{client.name}</h3>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={() => openEditClientModal(client)}>
                                        <Edit size={16} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-400" onClick={() => {
                                        if (confirm("Excluir cliente?")) deleteLayoutClient(client.id);
                                    }}>
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-4" title={client.webhookUrl}>
                                Webhook: {client.webhookUrl}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {client.columns?.map((col) => (
                                    <span key={col.id} className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 text-xs text-gray-300 border border-white/10">
                                        {col.type === "image" ? <ImageIcon size={10} className="mr-1 text-purple-400" /> :
                                            col.type === "checkbox" ? <CheckSquare size={10} className="mr-1 text-green-400" /> :
                                                <Type size={10} className="mr-1 text-blue-400" />}
                                        {col.name}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {layoutClients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl bg-card/20">
                        Nenhum cliente cadastrado.
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClient ? "Editar Cliente" : "Novo Cliente"}
                className="max-w-3xl h-[95vh]"
            >
                <div className="space-y-6 h-full overflow-y-auto pr-4 custom-scrollbar pb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="uppercase text-xs text-muted-foreground font-bold tracking-wider">Nome do Cliente</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Nike"
                                className="bg-black/40 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase text-xs text-muted-foreground font-bold tracking-wider">Webhook URL</Label>
                            <Input
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://hook.make.com/..."
                                className="bg-black/40 border-white/10"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label className="uppercase text-xs text-muted-foreground font-bold tracking-wider">Webhook Postagens (Opcional)</Label>
                            <Input
                                value={webhookPostagens}
                                onChange={(e) => setWebhookPostagens(e.target.value)}
                                placeholder="https://hook.make.com/..."
                                className="bg-black/40 border-white/10"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label className="uppercase text-xs text-muted-foreground font-bold tracking-wider">Prompt para IA (Opcional)</Label>
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="h-20 bg-black/40 border-white/10"
                                placeholder="Escreva o prompt padrão para redimensionamento..."
                            />
                        </div>
                    </div>

                    {/* Dynamic Columns Section */}
                    <div className="border-t border-white/10 pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <Label className="text-sm font-semibold text-white">Estrutura da Tabela</Label>
                            <div className="flex space-x-2">
                                <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => addColumn("text")}>
                                    <Type className="w-3 h-3 mr-1" /> + Texto
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => addColumn("image")}>
                                    <ImageIcon className="w-3 h-3 mr-1" /> + Imagem
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => addColumn("checkbox")}>
                                    <CheckSquare className="w-3 h-3 mr-1" /> + Checkbox
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3 bg-black/20 p-4 rounded-lg min-h-[100px]">
                            {columns.map((col, index) => (
                                <div key={col.id} className="flex items-center space-x-3 text-sm animate-in slide-in-from-left-5 duration-200">
                                    <span className="text-muted-foreground w-6 text-center">{index + 1}</span>
                                    <div className="flex items-center px-3 py-2 rounded bg-white/5 border border-white/10 text-[10px] font-mono uppercase w-24 justify-center">
                                        {col.type === "image" ? <ImageIcon className="w-3 h-3 mr-2" /> :
                                            col.type === "checkbox" ? <CheckSquare className="w-3 h-3 mr-2" /> :
                                                <Type className="w-3 h-3 mr-2" />}
                                        {col.type}
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            value={col.name}
                                            onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                                            className="h-9 bg-black/20 border-white/5"
                                            placeholder="Nome da coluna"
                                        />
                                    </div>
                                    <div className="flex space-x-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-indigo-400 disabled:opacity-30"
                                            onClick={() => moveColumn(index, "up")}
                                            disabled={index === 0}
                                        >
                                            <ArrowUp size={14} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-indigo-400 disabled:opacity-30"
                                            onClick={() => moveColumn(index, "down")}
                                            disabled={index === columns.length - 1}
                                        >
                                            <ArrowDown size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => removeColumn(col.id)}>
                                            <X size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {columns.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-4 italic">Nenhuma coluna definida. Use os botões acima para adicionar.</p>
                            )}
                        </div>
                    </div>

                    {/* Social / Models Section (Extra fields from SQL) */}
                    <div className="border-t border-white/10 pt-4">
                        <Label className="text-sm font-semibold text-white mb-4 block">Integração Social & Modelos</Label>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground"><Instagram size={10} className="inline mr-1" /> Instagram ID</Label>
                                <Input value={instagramUserId} onChange={e => setInstagramUserId(e.target.value)} size={1} className="h-8 text-xs bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground"><Instagram size={10} className="inline mr-1" /> Instagram Token</Label>
                                <Input value={instagramToken} onChange={e => setInstagramToken(e.target.value)} size={1} className="h-8 text-xs bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground"><Facebook size={10} className="inline mr-1" /> Facebook ID</Label>
                                <Input value={facebookUserId} onChange={e => setFacebookUserId(e.target.value)} size={1} className="h-8 text-xs bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground"><Facebook size={10} className="inline mr-1" /> Facebook Token</Label>
                                <Input value={facebookToken} onChange={e => setFacebookToken(e.target.value)} size={1} className="h-8 text-xs bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground"><Box size={10} className="inline mr-1" /> Modelo Feed ID</Label>
                                <Input value={modeloFeedId} onChange={e => setModeloFeedId(e.target.value)} size={1} className="h-8 text-xs bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground"><Box size={10} className="inline mr-1" /> Modelo Stories ID</Label>
                                <Input value={modeloStoriesId} onChange={e => setModeloStoriesId(e.target.value)} size={1} className="h-8 text-xs bg-black/40 border-white/10" />
                            </div>
                        </div>
                    </div>

                    {/* JSON Config */}
                    <div className="space-y-2 border-t border-white/10 pt-4">
                        <Label className="text-sm font-semibold text-white">JSON do Cliente (Metadata)</Label>
                        <Textarea
                            value={JSON.stringify(jsonCliente, null, 2)}
                            onChange={(e) => {
                                try {
                                    setJsonCliente(JSON.parse(e.target.value));
                                } catch (err) {
                                    // Handle invalid JSON while typing if needed
                                }
                            }}
                            className="h-32 bg-black/60 border-indigo-500/20 text-blue-300 font-mono text-xs"
                            placeholder='{ "config": { ... } }'
                        />
                    </div>

                    <div className="flex justify-end pt-6 border-t border-white/10 space-x-3">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-slate-950 font-bold px-8">
                            <Save className="w-4 h-4 mr-2" /> Salvar Cliente
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
