import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface ClientRankingProps {
    data: { name: string; total: number }[];
    isLoading: boolean;
}

export default function ClientRanking({ data, isLoading }: ClientRankingProps) {
    if (isLoading) {
        return (
            <div className="h-96 bg-gray-800 rounded-xl border border-gray-700 animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Carregando ranking...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-96 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center">
                <span className="text-gray-400">Sem dados de ranking</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Top 15 Clientes por Volume</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#9CA3AF" />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#9CA3AF"
                            width={100}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: '#374151' }}
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                        />
                        <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} name="Artes Geradas" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
