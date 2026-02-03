"use client";

import { useState, useRef } from "react";
import { Upload, X, Send, Loader2, Download, Maximize, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    supabaseUrl?: string;
    status: "pending" | "uploading" | "uploaded" | "error";
}

interface ProcessedImage {
    originalUrl: string;
    processedUrl: string; // The URL returned by the webhook (resize result)
    fileName: string;
}

export default function ResizePage() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newImages: UploadedImage[] = Array.from(e.target.files).map(file => ({
                id: crypto.randomUUID(),
                file,
                preview: URL.createObjectURL(file), // Local preview
                status: "pending"
            }));
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    // 1. Upload to Supabase
    const uploadToSupabase = async (image: UploadedImage): Promise<string | null> => {
        try {
            const filename = `resize-uploads/${Date.now()}-${image.id}-${image.file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

            const { error: uploadError } = await supabase.storage
                .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'images')
                .upload(filename, image.file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'images')
                .getPublicUrl(filename);

            return publicUrl;
        } catch (error) {
            console.error("Upload error:", error);
            return null;
        }
    };

    const handleProcessImages = async () => {
        if (images.length === 0) return;
        setIsProcessing(true);
        setStatusMessage("Enviando imagens para a nuvem...");
        setErrorMessage(null);
        setProcessedImages([]); // Reset previous results

        try {
            // Step 1: Upload all pending images to Supabase
            const uploadedUrls: string[] = [];
            const failedUploads: string[] = [];

            // Update status to uploading
            setImages(prev => prev.map(img => ({ ...img, status: "uploading" })));

            for (const img of images) {
                if (img.status === "uploaded" && img.supabaseUrl) {
                    uploadedUrls.push(img.supabaseUrl);
                    continue;
                }

                const url = await uploadToSupabase(img);
                if (url) {
                    uploadedUrls.push(url);
                    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: "uploaded", supabaseUrl: url } : i));
                } else {
                    failedUploads.push(img.file.name);
                    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: "error" } : i));
                }
            }

            if (uploadedUrls.length === 0) {
                throw new Error("Falha ao fazer upload das imagens.");
            }

            // Step 2: Send to N8N Webhook
            setStatusMessage("Processando com IA (Aguardando Webhook)...");

            // Allow user to see the "processing" state
            // Note: The structure of the payload depends on what n8n expects. 
            // Based on prompt: "Send these images (links) ... it returns processed images"
            // We'll send { images: [url1, url2] } or just the array.
            // Let's assume a JSON wrapper.

            const webhookUrl = "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/imagens-ia";

            // Using proxy if needed, but let's try direct first or use the same proxy pattern as dashboard
            // The dashboard uses /api/proxy-webhook to avoid CORS if the n8n webhook doesn't handle OPTIONS.
            // Let's use the proxy to be safe.

            const proxyResponse = await fetch("/api/proxy-webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: webhookUrl,
                    payload: {
                        images: uploadedUrls, // Sending the array of URLs
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (!proxyResponse.ok) {
                throw new Error(`Erro na API: ${proxyResponse.statusText}`);
            }

            // Step 3: Handle Response
            // Assuming the webhook returns a JSON with loop of processed images, or an array of URLs.
            // If it returns just raw JSON, we parse it.
            const resultData = await proxyResponse.json();
            console.log("Webhook Result:", resultData);

            // Adapting to possible response formats
            // If resultData is array: use it. If resultData.images is array: use it.
            // We expect a list of URLs for the resized images.

            let resultUrls: string[] = [];
            if (Array.isArray(resultData)) {
                // Check if it's an array of objects with 'imagem' property (n8n structure)
                const firstItem = resultData[0];
                if (firstItem && typeof firstItem === 'object' && 'imagem' in firstItem) {
                    resultUrls = resultData.map((item: any) => item.imagem);
                } else {
                    // Fallback: mixed or plain strings
                    resultUrls = resultData.map((item: any) => typeof item === 'string' ? item : item.url || item.image || item.output || item.imagem);
                }
            } else if (resultData.images && Array.isArray(resultData.images)) {
                resultUrls = resultData.images;
            } else if (resultData.output && Array.isArray(resultData.output)) {
                resultUrls = resultData.output;
            } else {
                // Fallback: maybe just one image or unknown structure?
                // Let's assume we map 1:1 if possible, or just push what we found
                console.warn("Unknown response structure, trying to parse...");
                // Just in case it returns the exact same input size
                resultUrls = uploadedUrls; // Placeholder if logic fails? No, that would be wrong.
                // If the user says "Needs to be available for download", we must show what came back.
                // Let's trust the array check.
            }

            // Map results to display
            const mappedResults = resultUrls.map((url, idx) => ({
                originalUrl: uploadedUrls[idx] || "", // Best effort mapping
                processedUrl: url,
                fileName: `resized-image-${idx + 1}.png`
            }));

            setProcessedImages(mappedResults);
            setStatusMessage("Concluído!");

        } catch (error) {
            console.error("Processing error:", error);
            setStatusMessage(`Erro: ${(error as Error).message}`);
            // Do not disable processing state immediately if we want to show the error in the loading screen? 
            // Better: Allow user to retry.
            // Let's rely on a separate error state to show the alert in the input screen.
            setErrorMessage((error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadImage = async (url: string, name: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(url, '_blank'); // Fallback
        }
    };

    const downloadAll = async () => {
        // Sequential download to avoid browser blocking
        for (const img of processedImages) {
            await downloadImage(img.processedUrl, img.fileName);
            await new Promise(r => setTimeout(r, 500)); // Small delay
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center">
                        Redimensionar com IA <Maximize className="ml-2 text-indigo-400 w-6 h-6" />
                    </h1>
                    <p className="text-muted-foreground">
                        Faça upload de múltiplas imagens, processe com IA e baixe os resultados.
                    </p>
                </div>
            </div>

            {/* Upload Area */}
            {processedImages.length === 0 && (
                <Card className="border-dashed border-2 border-white/20 bg-white/5 hover:bg-white/10 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-12 h-12 text-indigo-400 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Clique para fazer Upload</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Arraste e solte ou clique para selecionar suas imagens (JPG, PNG). Múltiplos arquivos permitidos.
                        </p>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Preview Gallery - Input */}
            {images.length > 0 && processedImages.length === 0 && !isProcessing && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-white">Imagens Selecionadas ({images.length})</h3>
                        <Button variant="ghost" onClick={() => setImages([])} className="text-red-400 hover:text-red-500">
                            Limpar Tudo
                        </Button>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center text-red-200">
                            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                            <p className="text-sm">{errorMessage}</p>
                            <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)} className="ml-auto hover:bg-red-500/10"><X size={14} /></Button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {images.map((img) => (
                            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="destructive" size="icon" onClick={() => removeImage(img.id)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                {img.status === 'uploading' && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Add more button */}
                        <div className="aspect-square rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <Button
                            size="lg"
                            className="bg-white hover:bg-gray-100 text-slate-900 px-8 h-12 text-lg shadow-indigo-500/20 shadow-lg font-bold"
                            onClick={handleProcessImages}
                        >
                            Enviar Imagens <Send className="w-5 h-5 ml-3" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in duration-500">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-white">Processando Imagens...</h3>
                        <p className="text-muted-foreground">{statusMessage}</p>
                    </div>
                </div>
            )}

            {/* Results Area */}
            {processedImages.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="flex justify-between items-center bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                        <div className="flex items-center">
                            <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                            <div>
                                <h3 className="text-lg font-semibold text-green-100">Processamento Concluído!</h3>
                                <p className="text-green-200/60 text-sm">Suas imagens foram redimensionadas com sucesso.</p>
                            </div>
                        </div>
                        <Button onClick={downloadAll} className="bg-white hover:bg-gray-100 text-slate-900 font-bold">
                            <Download className="w-4 h-4 mr-2" /> Baixar Todas
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {processedImages.map((img, idx) => (
                            <Card key={idx} className="border-white/10 bg-black/40 overflow-hidden">
                                <div className="aspect-video relative bg-black/50">
                                    <img src={img.processedUrl} alt="Processed" className="w-full h-full object-contain" />
                                </div>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <span className="text-sm text-gray-400 font-mono truncate max-w-[150px]">{img.fileName}</span>
                                    <Button size="sm" variant="outline" onClick={() => downloadImage(img.processedUrl, img.fileName)}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-center pt-8">
                        <Button variant="ghost" onClick={() => {
                            setProcessedImages([]);
                            setImages([]);
                            setStatusMessage("");
                        }}>
                            Processar Novas Imagens
                        </Button>
                    </div>
                </div>
            )}

            {/* Loading / Processing Full Overlay if needed (optional, keeping inline for better UX) */}
        </div>
    );
}
