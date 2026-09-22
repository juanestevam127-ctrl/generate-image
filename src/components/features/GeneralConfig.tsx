"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Server } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function GeneralConfig() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        servidor_url: "",
        bucket_nome: "",
        pasta_nome: "",
        secret_access_key: "",
        access_key_id: ""
    });

    useEffect(() => {
        async function loadConfig() {
            const { data } = await supabase.from('configuracoes_gerais').select('*').limit(1);
            if (data && data.length > 0) {
                setFormData({
                    servidor_url: data[0].servidor_url || "",
                    bucket_nome: data[0].bucket_nome || "",
                    pasta_nome: data[0].pasta_nome || "",
                    secret_access_key: data[0].secret_access_key || "",
                    access_key_id: data[0].access_key_id || ""
                });
            }
        }
        loadConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { updateConfiguracoesGeraisAction } = await import("@/app/actions/clients");
            const res = await updateConfiguracoesGeraisAction(formData);
            if (!res.success) throw new Error(res.error);
            alert("Configurações salvas com sucesso!");
        } catch (error: any) {
            alert("Erro ao salvar: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center">
                    <Server className="w-6 h-6 mr-2 text-indigo-400" />
                    Configurações Gerais
                </h2>
            </div>

            <Card className="bg-zinc-900 border-white/10 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-gray-200">Integração do Servidor (Webhooks)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-gray-400">
                        Os dados abaixo serão anexados automaticamente na raiz do payload de todos os webhooks disparados.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label className="text-gray-300 font-medium">URL do Servidor (servidor_url)</Label>
                            <Input name="servidor_url" value={formData.servidor_url} onChange={handleChange} placeholder="ex: https://meu-servidor.com/upload" className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300 font-medium">Nome do Bucket (bucket_nome)</Label>
                            <Input name="bucket_nome" value={formData.bucket_nome} onChange={handleChange} placeholder="ex: meus-assets" className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300 font-medium">Nome da Pasta (pasta_nome)</Label>
                            <Input name="pasta_nome" value={formData.pasta_nome} onChange={handleChange} placeholder="ex: uploads/2026" className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500" />
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-gray-300 font-medium">Access Key ID</Label>
                            <Input name="access_key_id" type="text" value={formData.access_key_id} onChange={handleChange} placeholder="Access Key ID" className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500" />
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-gray-300 font-medium">Secret Access Key</Label>
                            <Input name="secret_access_key" type="password" value={formData.secret_access_key} onChange={handleChange} placeholder="Secret Access Key" className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                        <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto font-bold">
                            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                            Salvar Configurações
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
