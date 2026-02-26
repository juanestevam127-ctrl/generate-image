"use client";

import { useState } from "react";
import { useStore, LayoutClient } from "@/lib/store-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
    Upload,
    Image as ImageIcon,
    Loader2,
    Code
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LayoutConfigPage() {
    const { layoutClients, addLayoutClient, updateLayoutClient, deleteLayoutClient } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [formState, setFormState] = useState<Partial<LayoutClient>>({
        nome_cliente: "",
        webhook_url: "",
        texto: "",
        imagem_url: "",
        checkbox_ativo: false,
        instagram_user_id: "",
        instagram_token: "",
        facebook_user_id: "",
        facebook_token: "",
        modelo_feed_id: "",
        modelo_stories_id: "",
        json_cliente: {},
    });

    const resetForm = () => {
        setFormState({
            nome_cliente: "",
            webhook_url: "",
            texto: "",
            imagem_url: "",
            checkbox_ativo: false,
            instagram_user_id: "",
            instagram_token: "",
            facebook_user_id: "",
            facebook_token: "",
            modelo_feed_id: "",
            modelo_stories_id: "",
            json_cliente: {},
        });
        setIsEditing(null);
        setIsAdding(false);
    };

    const handleEdit = (client: LayoutClient) => {
        setFormState(client);
        setIsEditing(client.id);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!formState.nome_cliente || !formState.webhook_url) {
            alert("Nome e Webhook são obrigatórios");
            return;
        }

        try {
            if (isEditing) {
                await updateLayoutClient(isEditing, formState);
            } else {
                await addLayoutClient(formState as Omit<LayoutClient, "id">);
            }
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `layouts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('temp-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('temp-files')
                .getPublicUrl(filePath);

            setFormState(prev => ({ ...prev, imagem_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao fazer upload da imagem');
        } finally {
            setIsUploading(false);
        }
    };

    const handleJsonChange = (val: string) => {
        try {
            const parsed = JSON.parse(val);
            setFormState(prev => ({ ...prev, json_cliente: parsed }));
        } catch (e) {
            // Invalid JSON - we could show a warning but let's just keep the object for now
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Configuração de Layouts</h1>
                    <p className="text-muted-foreground">Gerencie seus clientes e modelos de layout.</p>
                </div>
                {!isAdding && !isEditing && (
                    <Button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Cliente
                    </Button>
                )}
            </div>

            {(isAdding || isEditing) && (
                <Card className="p-6 bg-gray-900/50 border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            {isEditing ? "Editar Cliente" : "Cadastrar Novo Cliente"}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={resetForm}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-gray-400">Nome do Cliente</Label>
                                <Input
                                    value={formState.nome_cliente}
                                    onChange={e => setFormState(prev => ({ ...prev, nome_cliente: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white"
                                    placeholder="Ex: Cliente XYZ"
                                />
                            </div>
                            <div>
                                <Label className="text-gray-400">Webhook URL</Label>
                                <Input
                                    value={formState.webhook_url}
                                    onChange={e => setFormState(prev => ({ ...prev, webhook_url: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white"
                                    placeholder="https://n8n.exemplo.com/webhook/..."
                                />
                            </div>
                            <div>
                                <Label className="text-gray-400">Texto (Campo Livre)</Label>
                                <Textarea
                                    value={formState.texto}
                                    onChange={e => setFormState(prev => ({ ...prev, texto: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white min-h-[100px]"
                                    placeholder="Conteúdo adicional..."
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="ativo"
                                    checked={formState.checkbox_ativo}
                                    onCheckedChange={(checked: boolean) => setFormState(prev => ({ ...prev, checkbox_ativo: !!checked }))}
                                />
                                <Label htmlFor="ativo" className="text-gray-300">Checkbox Ativo</Label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-gray-400">Imagem do Layout</Label>
                                <div className="mt-1 flex items-center gap-4">
                                    {formState.imagem_url ? (
                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                                            <img src={formState.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setFormState(prev => ({ ...prev, imagem_url: "" }))}
                                                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-20 h-20 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : <Upload className="w-6 h-6 text-gray-500" />}
                                            <span className="text-[10px] text-gray-500 mt-1">Upload</span>
                                            <input type="file" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e)} accept="image/*" />
                                        </label>
                                    )}
                                    <Input
                                        value={formState.imagem_url}
                                        onChange={e => setFormState(prev => ({ ...prev, imagem_url: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white flex-1"
                                        placeholder="Ou cole a URL da imagem..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-400">Instagram User ID</Label>
                                    <Input
                                        value={formState.instagram_user_id}
                                        onChange={e => setFormState(prev => ({ ...prev, instagram_user_id: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-400">Facebook User ID</Label>
                                    <Input
                                        value={formState.facebook_user_id}
                                        onChange={e => setFormState(prev => ({ ...prev, facebook_user_id: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <Label className="text-gray-400">Instagram Token</Label>
                                    <Input
                                        value={formState.instagram_token}
                                        onChange={e => setFormState(prev => ({ ...prev, instagram_token: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white"
                                        type="text"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-400">Facebook Token</Label>
                                    <Input
                                        value={formState.facebook_token}
                                        onChange={e => setFormState(prev => ({ ...prev, facebook_token: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white"
                                        type="text"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-400">ID Modelo Feed</Label>
                                    <Input
                                        value={formState.modelo_feed_id}
                                        onChange={e => setFormState(prev => ({ ...prev, modelo_feed_id: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-400">ID Modelo Stories</Label>
                                    <Input
                                        value={formState.modelo_stories_id}
                                        onChange={e => setFormState(prev => ({ ...prev, modelo_stories_id: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Label className="text-gray-400 flex items-center gap-2 mb-2">
                            <Code size={14} />
                            JSON do Cliente
                        </Label>
                        <Textarea
                            value={JSON.stringify(formState.json_cliente, null, 2)}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleJsonChange(e.target.value)}
                            className="bg-black/60 border-white/10 text-blue-300 font-mono text-xs min-h-[200px]"
                            placeholder='{ "template": "...", "data": { ... } }'
                        />
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 w-32">
                            <Save className="w-4 h-4 mr-2" />
                            {isEditing ? "Atualizar" : "Salvar"}
                        </Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {layoutClients.map(client => (
                    <Card key={client.id} className="p-5 bg-gray-900/40 border-white/5 hover:border-indigo-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <ImageIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">{client.nome_cliente}</h3>
                                    <p className="text-[10px] text-gray-500 truncate w-32">{client.webhook_url}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => handleEdit(client)}>
                                    <Edit2 size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => {
                                    if (confirm("Tem certeza que deseja excluir?")) deleteLayoutClient(client.id);
                                }}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 mt-4 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ativo</span>
                                <span className={client.checkbox_ativo ? "text-green-400" : "text-red-400"}>{client.checkbox_ativo ? "Sim" : "Não"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Instagram ID</span>
                                <span className="text-gray-300">{client.instagram_user_id || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Modelo Feed</span>
                                <span className="text-gray-300 font-mono">{client.modelo_feed_id || "-"}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
