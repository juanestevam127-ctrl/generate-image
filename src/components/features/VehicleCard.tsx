import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ImageIcon, ChevronLeft, ChevronRight, Plus, DownloadCloud, Loader2 } from "lucide-react";

export function VehicleCard({ vehicle, onAdd }: { vehicle: any, onAdd: (v: any) => void }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const fotos = vehicle.fotos && Array.isArray(vehicle.fotos) ? vehicle.fotos : [];
    const thumbnail = fotos.length > 0 ? fotos[currentImageIndex] : null;

    const getFieldVal = (dados: any, keywords: string[]) => {
        if (!dados) return null;
        let key = Object.keys(dados).find(k => keywords.some(kw => k.toLowerCase() === kw.toLowerCase() || k.toLowerCase().startsWith(kw.toLowerCase())));
        if (key) return dados[key];
        
        key = Object.keys(dados).find(k => keywords.some(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            return regex.test(k);
        }));
        return key ? dados[key] : null;
    };

    const titulo = getFieldVal(vehicle.dados, ['nome', 'carro', 'titulo', 'modelo']) 
        || (vehicle.dados && Object.values(vehicle.dados)[0]) 
        || "Veículo Sem Nome";

    const detalhes = [
        getFieldVal(vehicle.dados, ['cor']),
        getFieldVal(vehicle.dados, ['ano']),
        getFieldVal(vehicle.dados, ['pre', 'valor'])
    ].filter(Boolean).join(" - ");

    const handleDownloadAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!fotos || fotos.length === 0) return;
        
        setIsDownloading(true);
        try {
            for (let i = 0; i < fotos.length; i++) {
                const url = fotos[i];
                // Try fetching through proxy if it's external, otherwise direct
                const proxyUrl = url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
                
                const res = await fetch(proxyUrl);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                const a = document.createElement("a");
                a.href = blobUrl;
                const ext = url.split('.').pop()?.split('?')[0] || "jpg";
                const safeTitle = (titulo as string).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                a.download = `${safeTitle}_foto_${i + 1}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
                
                await new Promise(r => setTimeout(r, 400));
            }
        } catch (error) {
            console.error("Download failed", error);
            alert("Erro ao baixar as imagens. Tente novamente.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Card className="bg-zinc-900 border-white/10 overflow-hidden shadow-xl flex flex-col group">
            <div 
                className="relative h-48 bg-black flex items-center justify-center overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {thumbnail ? (
                    <img 
                        src={thumbnail} 
                        className="w-full h-full object-cover transition-opacity duration-300 opacity-90 group-hover:opacity-100" 
                        alt="Preview" 
                    />
                ) : (
                    <div className="text-gray-500 flex flex-col items-center">
                        <ImageIcon size={24} className="mb-2 opacity-50" />
                        <span className="text-xs">Sem imagem</span>
                    </div>
                )}
                
                {isHovered && fotos.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between px-2 bg-black/20">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(p => p > 0 ? p - 1 : fotos.length - 1); }}
                            className="bg-black/50 p-1.5 rounded-full text-white hover:bg-black/80 transition"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(p => p < fotos.length - 1 ? p + 1 : 0); }}
                            className="bg-black/50 p-1.5 rounded-full text-white hover:bg-black/80 transition"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
                
                {fotos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                        {currentImageIndex + 1} / {fotos.length}
                    </div>
                )}

                <div className="absolute top-2 right-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                    NOVO VEÍCULO
                </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-white mb-1 truncate uppercase" title={titulo as string}>
                    {titulo as string}
                </h3>
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                    {detalhes}
                </p>
                <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                    <Button 
                        onClick={() => onAdd(vehicle)}
                        className="w-full !bg-indigo-600 hover:!bg-indigo-500 !text-white text-sm shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Preencher na Tabela
                    </Button>
                    <Button 
                        onClick={handleDownloadAll}
                        disabled={isDownloading || fotos.length === 0}
                        variant="outline"
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 border-white/10 text-sm shadow-md"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
                        {isDownloading ? "Baixando..." : `Baixar Fotos (${fotos.length})`}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
