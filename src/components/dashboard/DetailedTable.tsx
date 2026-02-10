import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

interface DetailedTableProps {
    data: any[];
    isLoading: boolean;
    selectedClient: string | null;
}

export default function DetailedTable({ data, isLoading, selectedClient }: DetailedTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = selectedClient ? 50 : 20;

    // 1. Filter & Aggregate Data
    const processedData = useMemo(() => {
        if (!data) return [];

        let filtered = data;

        // Filter by search term (client name)
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedClient) {
            // Just return raw logs for specific client
            return filtered;
        } else {
            // Aggregate for "All Clients" view
            const aggregated: Record<string, any> = {};

            filtered.forEach(item => {
                const name = item.nome_empresa || 'Desconhecido';
                if (!aggregated[name]) {
                    aggregated[name] = {
                        client: name,
                        total: 0,
                        feed: 0,
                        stories: 0,
                        lastGenerated: item.created_at, // assuming ordered by desc initially or we compare
                    };
                }

                const entry = aggregated[name];
                entry.total++;
                if (item.formato === 'FEED') entry.feed++;
                if (item.formato === 'STORIES') entry.stories++;
                if (new Date(item.created_at) > new Date(entry.lastGenerated)) {
                    entry.lastGenerated = item.created_at;
                }
            });

            return Object.values(aggregated).map(item => ({
                ...item,
                percentFeed: item.total ? Math.round((item.feed / item.total) * 100) : 0,
                percentStories: item.total ? Math.round((item.stories / item.total) * 100) : 0,
            }));
        }
    }, [data, searchTerm, selectedClient]);

    // 2. Sort Data
    const sortedData = useMemo(() => {
        if (!sortConfig) return processedData;

        return [...processedData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [processedData, sortConfig]);

    // 3. Paginate Data
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const handleExportCSV = () => {
        if (!sortedData.length) return;

        const headers = selectedClient
            ? ['Data', 'Formato', 'URL da Imagem']
            : ['Cliente', 'Total', 'Feed', 'Stories', '% Feed', '% Stories', 'Última Arte'];

        const rows = sortedData.map(item => {
            if (selectedClient) {
                return [
                    format(new Date(item.created_at), 'dd/MM/yyyy HH:mm'),
                    item.formato,
                    item.imagem
                ];
            } else {
                return [
                    item.client,
                    item.total,
                    item.feed,
                    item.stories,
                    `${item.percentFeed}%`,
                    `${item.percentStories}%`,
                    format(new Date(item.lastGenerated), 'dd/MM/yyyy HH:mm')
                ];
            }
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'dashboard_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 animate-pulse h-96"></div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-white">
                    {selectedClient ? `Histórico de ${selectedClient}` : 'Visão Geral por Cliente'}
                </h3>

                <div className="flex gap-2 w-full sm:w-auto">
                    {!selectedClient && (
                        <div className="relative flex-1 sm:w-64">
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                        </div>
                    )}

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900/50 text-gray-300 uppercase font-medium">
                        <tr>
                            {selectedClient ? (
                                <>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('created_at')}>
                                        Data/Hora <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('formato')}>
                                        Formato <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3">Imagem</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('client')}>
                                        Cliente <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer text-right" onClick={() => handleSort('total')}>
                                        Total <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer text-right" onClick={() => handleSort('feed')}>
                                        Feed <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer text-right" onClick={() => handleSort('stories')}>
                                        Stories <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer text-right" onClick={() => handleSort('percentFeed')}>
                                        % Feed <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer text-right" onClick={() => handleSort('percentStories')}>
                                        % Stories <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('lastGenerated')}>
                                        Última Arte <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                                    {selectedClient ? (
                                        <>
                                            <td className="px-6 py-4">
                                                {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${item.formato === 'FEED' ? 'bg-purple-500/10 text-purple-400' : 'bg-pink-500/10 text-pink-400'
                                                    }`}>
                                                    {item.formato}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={item.imagem}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 underline truncate max-w-xs block"
                                                >
                                                    Ver Imagem
                                                </a>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-medium text-white">{item.client}</td>
                                            <td className="px-6 py-4 text-right">{item.total}</td>
                                            <td className="px-6 py-4 text-right">{item.feed}</td>
                                            <td className="px-6 py-4 text-right">{item.stories}</td>
                                            <td className="px-6 py-4 text-right">{item.percentFeed}%</td>
                                            <td className="px-6 py-4 text-right">{item.percentStories}%</td>
                                            <td className="px-6 py-4">{format(new Date(item.lastGenerated), 'dd/MM/yyyy HH:mm')}</td>
                                        </>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={selectedClient ? 3 : 7} className="px-6 py-8 text-center text-gray-500">
                                    Nenhum dado encontrado para o filtro atual.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-900/50 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                    Mostrando {Math.min(paginatedData.length, itemsPerPage)} de {sortedData.length} resultados
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <span className="text-sm text-gray-400 self-center">
                        Página {currentPage} de {Math.max(1, totalPages)}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </div>
        </div>
    );
}
