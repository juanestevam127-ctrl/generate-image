import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Video, Upload } from 'lucide-react';
import { extractFrames } from '@/lib/video-utils';

interface CoverPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    onSelect: (imageUrl: string) => void;
}

export function CoverPickerModal({ isOpen, onClose, videoUrl, onSelect }: CoverPickerModalProps) {
    const [activeTab, setActiveTab] = useState<'suggestions' | 'frame' | 'upload'>('suggestions');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (isOpen && activeTab === 'suggestions' && suggestions.length === 0) {
            loadSuggestions();
        }
    }, [isOpen, activeTab]);

    const loadSuggestions = async () => {
        setLoading(true);
        try {
            const frames = await extractFrames(videoUrl, 8);
            setSuggestions(frames);
        } catch (error) {
            console.error("Error loading suggestions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onSelect(reader.result as string);
                onClose();
            };
            reader.readAsDataURL(file);
        }
    };

    const captureCurrentFrame = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                try {
                    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                    onSelect(canvas.toDataURL('image/jpeg', 0.8));
                    onClose();
                } catch (error) {
                    console.error("Error capturing frame:", error);
                    alert("Erro ao capturar o fotograma. Tente carregar uma imagem manualmente ou use as sugestões.");
                }
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Miniatura" className="max-w-md">
            <div className="space-y-4 pt-4">
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'suggestions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Escolher sugestão
                    </button>
                    <button
                        onClick={() => setActiveTab('frame')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'frame' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Escolher fotograma
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Carregar imagem
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {activeTab === 'suggestions' && (
                        <div className="w-full">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-10 space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                    <p className="text-xs text-gray-400">Gerando miniaturas...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {suggestions.map((frame, idx) => (
                                        <div 
                                            key={idx} 
                                            className="aspect-[9/16] bg-white/5 rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors group relative"
                                            onClick={() => {
                                                onSelect(frame);
                                                onClose();
                                            }}
                                        >
                                            <img src={frame} alt={`Sugestão ${idx + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded">SELECIONAR</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'frame' && (
                        <div className="space-y-4 w-full">
                            <div className="aspect-[9/16] max-h-[400px] bg-black rounded-lg border border-white/10 overflow-hidden relative mx-auto">
                                <video 
                                    ref={videoRef}
                                    src={videoUrl} 
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-contain"
                                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                />
                            </div>
                            <div className="space-y-2">
                                <input 
                                    type="range" 
                                    min={0} 
                                    max={duration} 
                                    step={0.1}
                                    value={currentTime}
                                    onChange={(e) => {
                                        const time = parseFloat(e.target.value);
                                        setCurrentTime(time);
                                        if (videoRef.current) videoRef.current.currentTime = time;
                                    }}
                                    className="w-full accent-indigo-600 mt-2"
                                />
                                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                    <span>{currentTime.toFixed(1)}s</span>
                                    <span>{duration.toFixed(1)}s</span>
                                </div>
                            </div>
                            <Button 
                                onClick={captureCurrentFrame}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
                            >
                                <Video className="w-4 h-4 mr-2" />
                                USAR ESTE FOTOGRAMA
                            </Button>
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-white/10 rounded-xl space-y-4">
                            <label className="cursor-pointer group flex flex-col items-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-400" />
                                </div>
                                <span className="mt-4 text-sm font-medium text-gray-300">Selecione uma imagem</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10 shrink-0">
                    <Button variant="ghost" onClick={onClose} className="text-gray-400">
                        Cancelar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
