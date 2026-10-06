with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

import re

# Add imports
c = c.replace(
    'import { Loader2, RefreshCw, Car, Info, Image as ImageIcon } from "lucide-react";',
    'import { Loader2, RefreshCw, Car, Info, Image as ImageIcon, Download, CheckCircle2 } from "lucide-react";\nimport { Modal } from "@/components/ui/modal";'
)

# Add state
state_injection = """    const [vehicles, setVehicles] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);"""
c = re.sub(r'const \[vehicles, setVehicles\] = useState<any\[\]>\(\[\]\);\s*const \[error, setError\] = useState<string \| null>\(null\);', state_injection, c)

# Add download handler
handler_injection = """    const handleSync = async () => {"""
new_handler = """    const handleDownloadImages = async (pictures: any[]) => {
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
                await new Promise(r => setTimeout(r, 200)); // pequeno intervalo para no travar o navegador
            }
        } catch (err) {
            console.error("Erro ao baixar fotos:", err);
            alert("Erro ao baixar algumas fotos.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSync = async () => {"""
c = c.replace(handler_injection, new_handler)

# Make cards clickable
card_target = """<Card key={v.vehicleExternalKey || idx} className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col">"""
card_replace = """<Card 
    key={v.vehicleExternalKey || idx} 
    className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col cursor-pointer hover:border-indigo-500 transition-colors"
    onClick={() => setSelectedVehicle(v)}
>"""
c = c.replace(card_target, card_replace)

# Add Modal
modal_code = """
            {/* Modal de Detalhes do Veculo */}
            {selectedVehicle && (
                <Modal
                    isOpen={!!selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    title={`${selectedVehicle.markName} ${selectedVehicle.modelName} ${selectedVehicle.versionName}`}
                    className="max-w-4xl h-[90vh]"
                >
                    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                        
                        {/* Aes e Info Bsica */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {selectedVehicle.saleValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVehicle.saleValue) : "Sob consulta"}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {selectedVehicle.year} ? {selectedVehicle.km?.toLocaleString('pt-BR')} km ? {selectedVehicle.color}
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

                        {/* Mais detalhes tcnicos */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Cmbio</p>
                                <p className="text-sm font-semibold text-slate-200">{selectedVehicle.transmissionName || "N/A"}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-1">Combustvel</p>
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

                        {/* Descrio */}
                        {selectedVehicle.description && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-2">Descrio</h3>
                                <div className="bg-slate-800/30 p-4 rounded-lg text-sm text-slate-400 whitespace-pre-wrap border border-slate-700/30">
                                    {selectedVehicle.description}
                                </div>
                            </div>
                        )}

                        {/* Galeria de Fotos */}
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
                                        Nenhuma imagem disponvel para este veculo.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}"""

c = c.replace("        </div>\n    );\n}", modal_code)

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Updated EstoqueManager with Modal")
