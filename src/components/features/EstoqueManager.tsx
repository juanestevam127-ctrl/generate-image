"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store-context";
import { fetchBndvInventoryAction } from "@/app/actions/estoque";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Car, Info, Image as ImageIcon, Download, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export function EstoqueManager() {
    const { clients } = useStore();
    const [selectedClientId, setSelectedClientId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const bndvClients = clients.filter(c => c.integracaoTipo === "BNDV");

    const parsePictures = (pictureJs: string) => {
        if (!pictureJs) return [];
        try {
            const parsed = JSON.parse(pictureJs);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    const handleDownloadImages = async (pictures: any[]) => {
        setIsDownloading(true);
        try {
            for (let i = 0; i < pictures.length; i++) {
                const pic = pictures[i];
                const url = `/api/proxy-image?url=${encodeURIComponent(pic.Link)}`;
                const res = await fetch(url);
                if (!res.ok) continue;
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = blobUrl;
                a.download = `veiculo_foto_${i + 1}.jpg`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
                await new Promise(r => setTimeout(r, 200)); 
            }
        } catch (err) {
            console.error("Erro ao baixar fotos:", err);
            alert("Erro ao baixar algumas fotos.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSync = async () => {
        if (!selectedClientId) return;
        setIsLoading(true);
        setError(null);
        setVehicles([]);

        const result = await fetchBndvInventoryAction(selectedClientId);
        
        if (result.success && result.data) {
            setVehicles(result.data);
        } else {
            setError(result.error || "Erro ao sincronizar estoque.");
        }
        
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                        <Car className="w-5 h-5 text-indigo-400" />
                        Sincronizar Estoque Integrado
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {bndvClients.length === 0 ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-sm flex gap-2">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>Nenhum cliente possui integração de estoque configurada. Vá em Configurações Gerais - Gerenciar Clientes e adicione credenciais do BNDV.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium mb-1 text-slate-300">Cliente (Integração BNDV)</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {bndvClients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Button 
                                onClick={handleSync} 
                                disabled={!selectedClientId || isLoading}
                                className="!bg-indigo-600 hover:!bg-indigo-700 !text-white w-full md:w-auto h-10"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Sincronizar BNDV
                            </Button>
                        </div>
                    )}
                    
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-sm">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {vehicles.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-200">Veículos Sincronizados ({vehicles.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {vehicles.map((v, idx) => {
                            const pictures = parsePictures(v.pictureJs);
                            const principalPic = pictures.find((p: any) => p.Principal === "true") || pictures[0];

                            return (
                                <Card 
                                    key={v.vehicleExternalKey || idx} 
                                    className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col cursor-pointer hover:border-indigo-500 transition-colors"
                                    onClick={() => setSelectedVehicle(v)}
                                >
                                    <div className="aspect-[4/3] bg-slate-900 relative group">
                                        {principalPic ? (
                                            <img 
                                                src={principalPic.Link} 
                                                alt={v.versionName} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                                <ImageIcon className="w-8 h-8 mb-2" />
                                                <span className="text-xs">Sem foto</span>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-xs px-2 py-1 rounded text-white font-medium">
                                            {pictures.length} fotos
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h3 className="font-bold text-slate-100 line-clamp-2 text-sm" title={`${v.markName} ${v.modelName} ${v.versionName}`}>
                                                {v.markName} {v.modelName} {v.versionName}
                                            </h3>
                                        </div>
                                        <div className="mt-auto space-y-2">
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>{v.year}</span>
                                                <span>{v.km?.toLocaleString('pt-BR')} km</span>
                                            </div>
                                            <div className="text-lg font-bold text-indigo-400">
                                                {v.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.saleValue) : "Sob consulta"}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedVehicle && (
                <Modal
                    isOpen={!!selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    title={`${selectedVehicle.markName} ${selectedVehicle.modelName} ${selectedVehicle.versionName}`}
                    className="max-w-4xl h-[90vh]"
                >
                    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {selectedVehicle.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVehicle.saleValue) : "Sob consulta"}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {selectedVehicle.year} - {selectedVehicle.km?.toLocaleString('pt-BR')} km - {selectedVehicle.color}
                                </p>
                            </div>
                            
                            <Button 
                                onClick={() => handleDownloadImages(parsePictures(selectedVehicle.pictureJs))}
                                disabled={isDownloading || parsePictures(selectedVehicle.pictureJs).length === 0}
                                className="!bg-indigo-600 hover:!bg-indigo-700 !text-white w-full md:w-auto"
                            >
                                {isDownloading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Baixar {parsePictures(selectedVehicle.pictureJs).length} Fotos
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Câmbio</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.transmissionName || "N/A"}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Combustível</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.fuelName || "N/A"}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Placa / Final</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.plate || `Final ${selectedVehicle.finalPlate}` || "N/A"}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Categoria</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.subCategoryName || "N/A"}</p>
                            </div>
                        </div>

                        {selectedVehicle.description && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-2">Descrição</h3>
                                <div className="bg-slate-800/30 p-4 rounded-lg text-sm text-slate-400 whitespace-pre-wrap border border-slate-700/30">
                                    {selectedVehicle.description}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2 text-indigo-400" />
                                Galeria de Imagens
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {parsePictures(selectedVehicle.pictureJs).map((pic: any, i: number) => (
                                    <div key={i} className="aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-slate-700 relative group">
                                        <img 
                                            src={pic.Link} 
                                            alt={`Foto ${i + 1}`} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                                            {i + 1}
                                        </div>
                                    </div>
                                ))}
                                {parsePictures(selectedVehicle.pictureJs).length === 0 && (
                                    <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                                        Nenhuma imagem disponível para este veículo.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
