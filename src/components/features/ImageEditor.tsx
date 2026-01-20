"use client";

import { useState, useRef } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css"; // Essential styles

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Check, X, Expand, Lock, Unlock } from "lucide-react";

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    onSave: (processedImage: string) => void;
}

export function ImageEditor({ isOpen, onClose, imageUrl, onSave }: ImageEditorProps) {
    const cropperRef = useRef<ReactCropperElement>(null);

    // State
    // Default UNLOCKED (free movement) to match user manual crop expectation
    const [outputSize, setOutputSize] = useState({ w: 1080, h: 1080 });
    const [lockedRatio, setLockedRatio] = useState(false);

    const onCrop = () => {
        // We could update inputs here, but we let user drive output size via inputs
    };

    const handleSave = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            // Get canvas at specific resolution
            const canvas = cropper.getCroppedCanvas({
                width: outputSize.w,
                height: outputSize.h,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            if (canvas) {
                onSave(canvas.toDataURL("image/png"));
                onClose();
            }
        }
    };

    const handleDimensionChange = (dim: 'w' | 'h', val: number) => {
        const newSize = { ...outputSize, [dim]: val };
        setOutputSize(newSize);

        const cropper = cropperRef.current?.cropper;
        if (cropper && lockedRatio) {
            cropper.setAspectRatio(newSize.w / newSize.h);
        }
    };

    const toggleLock = () => {
        setLockedRatio(!lockedRatio);
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            // If unlocking, set ratio to NaN (free)
            // If locking, set ratio to current W/H
            cropper.setAspectRatio(!lockedRatio ? outputSize.w / outputSize.h : NaN);
        }
    }

    const setPreset = (w: number, h: number) => {
        setOutputSize({ w, h });
        setLockedRatio(true);
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            cropper.setAspectRatio(w / h);
            // Also reset the crop box make it visible
            cropper.setData({ width: cropper.getCanvasData().naturalWidth * 0.8 });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editor de Imagem (Recorte Manual)" className="w-[95vw] h-[90vh] max-w-[1600px] flex flex-col p-6 overflow-hidden">
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pt-2 h-full">

                {/* Workspace (Cropper) - Takes remaining space, but constrained to avoid squash */}
                <div className="flex-1 bg-black/80 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center relative shadow-inner min-h-0 min-w-0">
                    {!imageUrl ? (
                        <p className="text-gray-500">Carregando...</p>
                    ) : (
                        <Cropper
                            src={imageUrl}
                            style={{ height: "100%", width: "100%" }}
                            // Cropper.js Options
                            initialAspectRatio={NaN} // START FREE
                            aspectRatio={NaN}        // START FREE
                            guides={true}
                            viewMode={1}
                            dragMode="move"
                            responsive={true}
                            autoCropArea={0.8}
                            checkOrientation={false}
                            ref={cropperRef}
                            crop={onCrop}
                            background={false}
                            className="cropper-custom-theme"
                        />
                    )}
                    {/* Overlay hint */}
                    <div className="absolute top-4 left-4 z-50 bg-black/50 px-3 py-1 rounded text-xs text-white/70 backdrop-blur pointer-events-none">
                        Modo Livre: Arraste bordas independentes
                    </div>
                </div>

                {/* Sidebar Controls - Fixed width 320px to prevent squashing */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto pr-1">

                    {/* Output Dimensions Panel */}
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex flex-col gap-5 shadow-lg active:ring-1 ring-white/10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Expand size={20} className="text-indigo-400" />
                                Saída (px)
                            </h3>
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-white" onClick={toggleLock} title={lockedRatio ? "Desbloquear Proporção" : "Bloquear Proporção"}>
                                {lockedRatio ? <Lock size={16} /> : <Unlock size={16} />}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Largura</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={outputSize.w}
                                        onChange={(e) => handleDimensionChange('w', Number(e.target.value))}
                                        className="bg-black/30 border-white/10 h-10 font-mono text-center focus:border-indigo-500 transition-all font-medium text-white px-2"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Altura</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={outputSize.h}
                                        onChange={(e) => handleDimensionChange('h', Number(e.target.value))}
                                        className="bg-black/30 border-white/10 h-10 font-mono text-center focus:border-indigo-500 transition-all font-medium text-white px-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex flex-col gap-4">
                        <h3 className="text-sm font-medium text-gray-300">Formatos Prontos</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-10 text-xs justify-start border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setPreset(1080, 1080)}>
                                <div className="mr-2 h-3 w-3 border border-current rounded-sm bg-current/20"></div>
                                Square (1:1)
                            </Button>
                            <Button variant="outline" className="h-10 text-xs justify-start border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setPreset(1080, 1350)}>
                                <div className="mr-2 h-3.5 w-3 border border-current rounded-sm bg-current/20"></div>
                                Portrait (4:5)
                            </Button>
                            <Button variant="outline" className="h-10 text-xs justify-start border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setPreset(1080, 1920)}>
                                <div className="mr-2 h-4 w-2.5 border border-current rounded-sm bg-current/20"></div>
                                Stories (9:16)
                            </Button>
                            <Button variant="outline" className="h-10 text-xs justify-start border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setPreset(1920, 1080)}>
                                <div className="mr-2 h-2.5 w-4 border border-current rounded-sm bg-current/20"></div>
                                Landscape
                            </Button>
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-auto flex flex-col gap-3 pt-4">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 shadow-xl shadow-indigo-900/20" onClick={handleSave}>
                            <Check className="mr-2 h-5 w-5" />
                            Confirmar & Salvar
                        </Button>
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-white" onClick={onClose}>
                            Cancelar
                        </Button>
                    </div>

                </div>
            </div>
        </Modal>
    );
}
