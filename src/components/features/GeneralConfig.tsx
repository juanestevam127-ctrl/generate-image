"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Server } from "lucide-react";
import { useStore } from "@/lib/store-context";

export function GeneralConfig() {
    const { configuracoesGerais, saveConfiguracoesGerais } = useStore() as any;
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        servidor_url: "",
        bucket_nome: "",
        pasta_nome: "",
        token: ""
    });

    useEffect(() => {
        if (configuracoesGerais) {
            setFormData({
                servidor_url: configuracoesGerais.servidor_url || "",
                bucket_nome: configuracoesGerais.bucket_nome || "",
                pasta_nome: configuracoesGerais.pasta_nome || "",
                token: configuracoesGerais.token || ""
            });
        }
    }, [configuracoesGerais]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await saveConfiguracoesGerais(formData);
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
                        Os dados abaixo serão enviados automaticamente na raiz do payload (JSON) de todos os webhooks disparados pelo sistema.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label className="text-gray-300 font-medium">URL do Servidor (servidor_url)</Label>
                            <Input
                                name="servidor_url"
                                value={formData.servidor_url}
                                onChange={handleChange}
                                placeholder="ex: https://meu-servidor.com/upload"
                                className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-300 font-medium">Nome do Bucket (bucket_nome)</Label>
                            <Input
                                name="bucket_nome"
                                value={formData.bucket_nome}
                                onChange={handleChange}
                                placeholder="ex: meus-assets"
                                className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-300 font-medium">Nome da Pasta (pasta_nome)</Label>
                            <Input
                                name="pasta_nome"
                                value={formData.pasta_nome}
                                onChange={handleChange}
                                placeholder="ex: uploads/2026"
                                className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label className="text-gray-300 font-medium">Token de Autenticação (token)</Label>
                            <Input
                                name="token"
                                type="text"
                                value={formData.token}
                                onChange={handleChange}
                                placeholder="Token de segurança da API"
                                className="bg-black/50 border-white/10 text-white focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                        <Button 
                            onClick={handleSave} 
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto font-bold"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                            Salvar Configurações
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
