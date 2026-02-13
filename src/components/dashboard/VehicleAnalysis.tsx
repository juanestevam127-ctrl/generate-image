import React from 'react';
import { Truck, Image, ArrowDown, ArrowUp, Users } from 'lucide-react';
import { VehicleStats, VehicleClientStats, VehicleSummary } from '@/lib/dashboardQueries';

interface VehicleAnalysisProps {
    data: {
        summary: VehicleSummary;
        stats: VehicleStats[];
        clientStats: VehicleClientStats[];
    };
    isLoading: boolean;
}

export default function VehicleAnalysis({ data, isLoading }: VehicleAnalysisProps) {
    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Skeleton for Block 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-white/5 animate-pulse h-28"></div>
                    ))}
                </div>
                {/* Skeleton for Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5 animate-pulse h-96"></div>
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5 animate-pulse h-96"></div>
                </div>
            </div>
        );
    }

    const { summary, stats, clientStats } = data;

    // Determine alternating zebra row background for Block 3
    let currentVehicle = '';
    let isZebra = false;

    return (
        <div className="space-y-8 mt-12">
            {/* Visual Separator */}
            <div className="border-t border-white/5 pt-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                    Análise por Veículo Gerado
                </h2>
            </div>

            {/* BLOCK 1: Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Veículos */}
                <div className="bg-[#111827] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-400">Total de Veículos</p>
                            <h3 className="text-2xl font-bold text-white mt-2">{summary.total_veiculos}</h3>
                            <p className="text-xs text-gray-500 mt-1">Modelos únicos ativos</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/10">
                            <Truck className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                </div>

                {/* Card 2: Veículo com Mais Imagens */}
                <div className="bg-[#111827] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-400">Veículo com Mais Imagens</p>
                            <h3 className="text-lg font-bold text-white mt-2 leading-tight break-words" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {summary.mostImages?.name || '-'}
                            </h3>
                            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                <ArrowUp className="w-3 h-3" /> {summary.mostImages?.count || 0} artes
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-500/10 shrink-0 ml-2">
                            <Image className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* Card 3: Veículo com Menos Imagens */}
                <div className="bg-[#111827] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-400">Veículo com Menos Imagens</p>
                            <h3 className="text-lg font-bold text-white mt-2 leading-tight break-words" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {summary.leastImages?.name || '-'}
                            </h3>
                            <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                <ArrowDown className="w-3 h-3" /> {summary.leastImages?.count || 0} artes
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-pink-500/10 shrink-0 ml-2">
                            <Truck className="w-5 h-5 text-pink-400" />
                        </div>
                    </div>
                </div>

                {/* New Card 4: Empresa com Mais Produção */}
                <div className="bg-[#111827] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-400">Cliente Mais Ativo</p>
                            <h3 className="text-lg font-bold text-white mt-2 leading-tight break-words" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {summary.mostActiveClient?.name || '-'}
                            </h3>
                            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3" /> {summary.mostActiveClient?.count || 0} artes
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-green-500/10 shrink-0 ml-2">
                            <Users className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* BLOCK 2: Imagens por Veículo */}
                <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-white">Imagens por Veículo</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs uppercase text-gray-400 bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-4 font-medium">#</th>
                                    <th className="px-4 py-4 font-medium">VEÍCULO</th>
                                    <th className="px-4 py-4 font-medium">CLIENTE</th>
                                    <th className="px-4 py-4 font-medium text-center">ARTE</th>
                                    <th className="px-4 py-4 font-medium">%</th>
                                    <th className="px-4 py-4 font-medium">BARRA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.map((v, i) => {
                                    const maxCount = stats[0].total_imagens;
                                    const barWidth = `${(v.total_imagens / maxCount) * 100}%`;

                                    return (
                                        <tr key={v.veiculo_gerado} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-4 text-sm text-gray-500">{i + 1}</td>
                                            <td className="px-4 py-4 text-sm font-semibold text-blue-400 uppercase leading-tight min-w-[150px]">{v.veiculo_gerado}</td>
                                            <td className="px-4 py-4 text-xs text-gray-400 uppercase font-medium">{v.top_empresa}</td>
                                            <td className="px-4 py-4 text-sm font-bold text-white text-center">{v.total_imagens}</td>
                                            <td className="px-4 py-4 text-sm text-gray-400">{v.percentual}%</td>
                                            <td className="px-4 py-4">
                                                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: barWidth }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {stats.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                                            Nenhum dado de veículo encontrado no período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {stats.length > 0 && (
                                <tfoot className="bg-gray-900/40 border-t border-white/5">
                                    <tr>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-300 uppercase">Total</td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-400 uppercase italic">
                                            {summary.total_veiculos} veículos
                                        </td>
                                        <td></td>
                                        <td className="px-4 py-3 text-sm font-bold text-white text-center">{summary.total_imagens}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-400">100%</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* BLOCK 3: Veículo × Cliente (Refined to Client Summary) */}
                <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-white">Resumo por Cliente</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="text-xs uppercase text-gray-400 bg-gray-900/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 font-medium">ESTABELECIMENTO</th>
                                    <th className="px-6 py-4 font-medium text-center">VEÍCULOS ÚNICOS</th>
                                    <th className="px-6 py-4 font-medium text-right">TOTAL ARTES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {clientStats.map((item, i) => (
                                    <tr
                                        key={item.nome_empresa}
                                        className="hover:bg-white/[0.03] transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-blue-400/80 uppercase">
                                            {item.nome_empresa}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white text-center">
                                            {item.total_veiculos}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                                            {item.total_imagens}
                                        </td>
                                    </tr>
                                ))}
                                {clientStats.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic">
                                            Nenhum dado de cliente encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {clientStats.length > 0 && (
                                <tfoot className="bg-gray-900/40 border-t border-white/5 sticky bottom-0 z-10">
                                    <tr>
                                        <td className="px-6 py-3 text-xs font-bold text-gray-300 uppercase">TOTAL GERAL</td>
                                        <td className="px-6 py-3 text-sm font-bold text-white text-center italic">
                                            {summary.total_veiculos} veículos
                                        </td>
                                        <td className="px-6 py-3 text-sm font-bold text-white text-right">
                                            {summary.total_imagens} artes
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
