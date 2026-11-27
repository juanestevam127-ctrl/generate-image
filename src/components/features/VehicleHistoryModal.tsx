"use client";

import React from "react";
import { History, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    isLoading: boolean;
    veiculo: any;
}

export function VehicleHistoryModal({
    isOpen,
    onClose,
    title,
    isLoading,
    veiculo
}: HistoryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start pb-4 border-b border-white/10 mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-amber-400" />
                            <h2 className="text-lg font-bold text-white">Histórico do Veículo</h2>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-amber-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="text-sm text-gray-400">Consultando histórico do veículo...</p>
                        </div>
                    ) : !veiculo ? (
                        <div className="text-center py-12 text-gray-400 space-y-2">
                            <AlertCircle className="w-8 h-8 mx-auto text-gray-500" />
                            <p className="text-sm">Veículo não encontrado no banco de dados local.</p>
                        </div>
                    ) : (!veiculo.historico || !Array.isArray(veiculo.historico) || veiculo.historico.length === 0) ? (
                        <div className="text-center py-12 text-gray-400 space-y-2">
                            <History className="w-8 h-8 mx-auto text-gray-600" />
                            <p className="text-sm text-gray-300 font-medium">Nenhum evento registrado ainda.</p>
                            <p className="text-xs text-gray-500">
                                Criado em: {veiculo.createdAt ? new Date(veiculo.createdAt).toLocaleString('pt-BR') : 'Data não informada'}
                            </p>
                            <p className="text-xs text-gray-500">
                                Status de Artes: {veiculo.design_state ? "Possui artes geradas" : "Nenhuma arte gerada ainda"}
                            </p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                            {veiculo.historico.slice().reverse().map((item: any, idx: number) => {
                                const badgeConfig = (() => {
                                    switch (item.acao) {
                                        case "CRIADO_MANUAL":
                                            return { bg: "bg-blue-500/20 text-blue-300 border-blue-500/30", dot: "bg-blue-500", label: "Criação Manual" };
                                        case "CRIADO_ESTOQUE":
                                        case "CRIADO_ESTOQUE_API":
                                            return { bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500", label: "Estoque API" };
                                        case "GERADO_IMAGEM":
                                            return { bg: "bg-purple-500/20 text-purple-300 border-purple-500/30", dot: "bg-purple-500", label: "Artes Geradas" };
                                        case "REFEITO_IMAGEM":
                                            return { bg: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "bg-amber-500", label: "Arte Refeita" };
                                        case "EDITADO_DADOS":
                                            return { bg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", dot: "bg-cyan-500", label: "Dados Editados" };
                                        default:
                                            return { bg: "bg-zinc-700 text-zinc-300 border-zinc-600", dot: "bg-zinc-400", label: item.acao || "Ação" };
                                    }
                                })();

                                const dateStr = item.data ? new Date(item.data).toLocaleString('pt-BR') : 'Agora';

                                return (
                                    <div key={idx} className="relative group">
                                        <div className={`absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${badgeConfig.dot}`} />
                                        <div className="bg-zinc-800/60 border border-white/5 rounded-lg p-3 hover:border-white/10 transition-colors space-y-1.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${badgeConfig.bg}`}>
                                                    {badgeConfig.label}
                                                </span>
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    {dateStr}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-semibold text-white">{item.titulo}</h4>

                                            {/* Diff visualization */}
                                            {item.metadata?.alteracoes && Array.isArray(item.metadata.alteracoes) && item.metadata.alteracoes.length > 0 ? (
                                                <div className="mt-2 space-y-1.5 bg-black/40 p-2.5 rounded border border-white/5 text-xs">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
                                                        <span>Campos modificados:</span>
                                                    </div>
                                                    {item.metadata.alteracoes.map((alt: any, aIdx: number) => (
                                                        <div key={aIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-white/5 last:border-0 font-mono text-[11px]">
                                                            <span className="text-gray-400 font-sans font-medium">{alt.campo}:</span>
                                                            <span className="text-red-400/80 line-through truncate" title={alt.anterior}>{alt.anterior}</span>
                                                            <span className="text-emerald-400 font-bold truncate" title={alt.novo}>➔ {alt.novo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : item.metadata?.campos && Array.isArray(item.metadata.campos) && item.metadata.campos.length > 0 ? (
                                                <div className="mt-2 space-y-1 bg-black/40 p-2.5 rounded border border-white/5 text-xs">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1 flex items-center justify-between">
                                                        <span>Dados inseridos / preenchidos:</span>
                                                        {item.metadata.totalLinhas && (
                                                            <span className="text-gray-400 font-normal">Tabela: {item.metadata.totalLinhas} linha(s)</span>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
                                                        {item.metadata.campos.map((c: any, cIdx: number) => (
                                                            <div key={cIdx} className="flex items-baseline justify-between gap-1 py-0.5 border-b border-white/5">
                                                                <span className="text-gray-400 truncate">{c.campo}:</span>
                                                                <span className="text-white font-medium truncate max-w-[150px]" title={c.valor}>{c.valor}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : item.detalhes ? (
                                                <p className="text-xs text-gray-300 whitespace-pre-wrap">{item.detalhes}</p>
                                            ) : null}

                                            <div className="pt-1 flex items-center text-[11px] text-gray-400">
                                                <span className="text-gray-500 mr-1">Por:</span>
                                                <span className="text-indigo-300 font-medium">{item.usuario || "Sistema"}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                    <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:text-white">
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}
