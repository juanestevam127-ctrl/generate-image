"use client";

import { useState } from "react";
import { Plus, Trash, Edit, Save, X, Type, Image as ImageIcon } from "lucide-react";
import { useStore, Client, ColumnDefinition, ColumnType } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ClientManager() {
    const { clients, addClient, updateClient, deleteClient } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookPostagens, setWebhookPostagens] = useState("");
    const [columns, setColumns] = useState<ColumnDefinition[]>([]);

    const openNewClientModal = () => {
        setEditingClient(null);
        setName("");
        setWebhookUrl("");
        setWebhookPostagens("");
        setColumns([{ id: crypto.randomUUID(), name: "Título", type: "text" }]); // Default column
        setIsModalOpen(true);
    };

    const openEditClientModal = (client: Client) => {
        setEditingClient(client);
        setName(client.name);
        setWebhookUrl(client.webhookUrl);
        setWebhookPostagens(client.webhookPostagens || "");
        setColumns([...client.columns]);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!name || !webhookUrl) return alert("Preencha nome e webhook");

        const clientData = {
            name,
            webhookUrl,
            webhookPostagens,
            columns: columns.filter((c) => c.name.trim() !== ""),
        };

        if (editingClient) {
            updateClient(editingClient.id, clientData);
        } else {
            addClient(clientData);
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

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                    Gerenciamento de Clientes
                </h2>
                <Button onClick={openNewClientModal} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map((client) => (
                    <Card key={client.id} className="relative group overflow-hidden border-white/5 hover:border-indigo-500/50 transition-colors">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg text-white">{client.name}</h3>
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
                            <div className="flex flex-wrap gap-2">
                                {client.columns.map((col) => (
                                    <span key={col.id} className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 text-xs text-gray-300 border border-white/10">
                                        {col.type === "image" ? <ImageIcon size={10} className="mr-1 text-purple-400" /> : <Type size={10} className="mr-1 text-blue-400" />}
                                        {col.name}
                                    </span>
                                ))}
                            </div>
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
                title={editingClient ? "Editar Cliente user" : "Novo Cliente"}
                className="max-w-2xl h-[90vh]" // Added specific height constraint
            >
                <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Nome do Cliente</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Nike"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Webhook URL</label>
                            <Input
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://hook.make.com/..."
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-xs uppercase text-muted-foreground font-bold">Webhook Postagens (Opcional)</label>
                            <Input
                                value={webhookPostagens}
                                onChange={(e) => setWebhookPostagens(e.target.value)}
                                placeholder="https://hook.make.com/..."
                            />
                        </div>
                    </div>

                    <div className="border-t border-border pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-semibold text-white">Estrutura da Tabela</label>
                            <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => addColumn("text")}>
                                    <Type className="w-4 h-4 mr-2" /> + Texto
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => addColumn("image")}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> + Imagem
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3 bg-black/20 p-4 rounded-lg min-h-[150px]">
                            {columns.map((col, index) => (
                                <div key={col.id} className="flex items-center space-x-3 text-sm animate-in slide-in-from-left-5 duration-200">
                                    <span className="text-muted-foreground w-6 text-center">{index + 1}</span>
                                    <div className="flex items-center px-3 py-2 rounded bg-white/5 border border-white/10 text-xs font-mono uppercase w-24 justify-center">
                                        {col.type === "image" ? <ImageIcon className="w-3 h-3 mr-2" /> : <Type className="w-3 h-3 mr-2" />}
                                        {col.type}
                                    </div>
                                    <Input
                                        value={col.name}
                                        onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                                        className="h-9"
                                        placeholder="Nome da coluna"
                                    />
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-red-400" onClick={() => removeColumn(col.id)}>
                                        <X size={16} />
                                    </Button>
                                </div>
                            ))}
                            {columns.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-4">Nenhuma coluna definida.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Cliente
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
