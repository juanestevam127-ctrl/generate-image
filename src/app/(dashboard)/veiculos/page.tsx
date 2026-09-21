"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Save, Car } from "lucide-react";
import { getPresignedUrlAction } from "@/app/actions/upload";

export default function VeiculosPage() {
    const { user, clients } = useStore();
    const [selectedClientId, setSelectedClientId] = useState("");
    const [activeClient, setActiveClient] = useState<any>(null);
    
    // Form fields
    const [textFields, setTextFields] = useState<Record<string, string>>({});
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            setActiveClient(client);
            setTextFields({});
            setImageFiles([]);
        } else {
            setActiveClient(null);
        }
    }, [selectedClientId, clients]);

    const handleTextChange = (id: string, value: string) => {
        setTextFields(prev => ({ ...prev, [id]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFileToR2 = async (file: File): Promise<string> => {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = `temp-files/${fileName}`;
        
        const res = await getPresignedUrlAction(filePath, file.type);
        if (!res.success) throw new Error(res.error);

        const uploadRes = await fetch(res.signedUrl!, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
        });

        if (!uploadRes.ok) throw new Error("Erro no upload do R2");
        return res.publicUrl!;
    };

    const handleSave = async () => {
        if (!activeClient || !activeClient.clickupTarefaId) {
            alert("Cliente não possui integração com ClickUp configurada (Tarefa não vinculada).");
            return;
        }

        setIsSaving(true);
        try {
            // Upload images
            const uploadedUrls = [];
            for (const file of imageFiles) {
                const url = await uploadFileToR2(file);
                uploadedUrls.push(url);
            }

            // Achar nome, cor, ano, preco nas colunas para o titulo da task
            let nome = "", cor = "", ano = "", preco = "";
            const dados: any = {};

            activeClient.columns.forEach((col: any) => {
                if (col.type === "text" || col.type === "checkbox") {
                    const val = textFields[col.id] || "";
                    dados[col.name] = val;
                    
                    const lowerCol = col.name.toLowerCase();
                    if (lowerCol.includes("veiculo") || lowerCol.includes("nome") || lowerCol.includes("carro")) nome = val;
                    if (lowerCol.includes("cor")) cor = val;
                    if (lowerCol.includes("ano")) ano = val;
                    if (lowerCol.includes("pre") || lowerCol.includes("valor")) preco = val;
                }
            });

            // Se não encontrou, pega o primeiro
            if (!nome) nome = Object.values(dados)[0] as string || "Veículo";

            // 1. Create Clickup Task
            const taskData = {
                name: `${nome} ${cor} ${ano}`.toUpperCase().trim(),
                price: preco,
                clientId: activeClient.clickupTarefaId
            };
            const { createClickupTaskAction } = await import("@/app/actions/clickup");
            const clickupRes = await createClickupTaskAction({
                nomeVeiculo: nome,
                cor,
                ano,
                precoFormatado: preco,
                clienteClickupId: activeClient.clickupTarefaId
            });

            if (!clickupRes.success) throw new Error("Erro ClickUp: " + clickupRes.error);

            // 2. Save to Supabase Local
            const { supabase } = await import("@/lib/supabase");
            const { error: sbError } = await supabase.from("VeiculoOperador").insert([{
                clienteId: activeClient.id,
                dados: dados,
                fotos: uploadedUrls,
                clickupTaskId: clickupRes.data?.taskId,
                importado: false
            }]);

            if (sbError) throw sbError;

            alert("Veículo adicionado com sucesso!");
            setTextFields({});
            setImageFiles([]);

        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (user?.role !== "master" && user?.role !== "operador") {
        return <div className="p-8">Acesso Negado</div>;
    }

    // Filtrar apenas clientes com ClickUp vinculados (tarefa)
    const availableClients = clients.filter(c => c.clickupTarefaId);

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center">
                    <Car className="mr-3 text-indigo-400" />
                    Adicionar Veículos
                </h1>
                <p className="text-muted-foreground">Adicione veículos para os clientes e envie automaticamente para o ClickUp e painel de Importação.</p>
            </div>

            <Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-indigo-500/20">
                <div className="w-full md:w-1/2">
                    <Label className="text-sm font-medium text-gray-300 mb-2 block">Selecione o Cliente</Label>
                    <select
                        className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                        <option value="" disabled>-- Escolha um cliente --</option>
                        {availableClients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {activeClient && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
                    <Card className="bg-zinc-900 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg">Dados do Veículo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeClient.columns.filter((c:any) => c.type === "text" || c.type === "checkbox").map((col: any) => (
                                <div key={col.id} className="space-y-1">
                                    <Label className="text-xs uppercase text-muted-foreground tracking-wider">
                                        {col.name} {col.type === "checkbox" ? "(Opcional)" : ""}
                                    </Label>
                                    
                                    {col.type === "text" ? (
                                        <Input 
                                            value={textFields[col.id] || ""}
                                            onChange={(e) => handleTextChange(col.id, e.target.value)}
                                            className="bg-black/40 border-white/10"
                                            placeholder={`Preencher ${col.name}...`}
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2 py-2">
                                            {col.options?.map((option: string) => {
                                                const isChecked = (textFields[col.id] || "").split(", ").includes(option);
                                                return (
                                                    <label key={option} className="flex items-center gap-2 cursor-pointer group/cb">
                                                        <div
                                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                                                isChecked ? "bg-indigo-500 border-indigo-500" : "border-white/20 bg-black/40"
                                                            }`}
                                                            onClick={() => {
                                                                const currentValues = (textFields[col.id] || "").split(", ").filter((v: string) => v !== "");
                                                                let newValues;
                                                                if (isChecked) {
                                                                    newValues = currentValues.filter((v: string) => v !== option);
                                                                } else {
                                                                    newValues = [...currentValues, option];
                                                                }
                                                                handleTextChange(col.id, newValues.join(", "));
                                                            }}
                                                        >
                                                            {isChecked && <X size={12} className="text-white" />}
                                                        </div>
                                                        <span className={`text-sm ${isChecked ? "text-indigo-300 font-medium" : "text-gray-400 group-hover/cb:text-gray-200"}`}>
                                                            {option}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                            {!col.options?.length && <span className="text-xs text-muted-foreground italic">Nenhuma opção configurada.</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg">Fotos do Veículo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer bg-black/20 hover:bg-black/40 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Clique para anexar fotos</span></p>
                                </div>
                                <Input type="file" className="hidden" multiple accept="image/*" onChange={handleImageChange} />
                            </Label>

                            {imageFiles.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    {imageFiles.map((file, idx) => (
                                        <div key={idx} className="relative group rounded overflow-hidden h-20 bg-black/50 border border-white/10">
                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={12} className="text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                variant="secondary"
                                className="w-full mt-6 bg-indigo-500 hover:bg-indigo-400 text-indigo-950 font-bold h-12 shadow-lg disabled:bg-indigo-900/80 disabled:text-indigo-300 disabled:opacity-100 border-none"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                {isSaving ? "Salvando Veículo..." : "Salvar Veículo"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
