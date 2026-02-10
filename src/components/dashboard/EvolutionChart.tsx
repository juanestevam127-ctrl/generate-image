import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EvolutionChartProps {
    data: { date: string; feed: number; stories: number }[];
    isLoading: boolean;
}

export default function EvolutionChart({ data, isLoading }: EvolutionChartProps) {
    if (isLoading) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Carregando gráfico...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center">
                <span className="text-gray-400">Sem dados para o período selecionado</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Artes Geradas ao Longo do Tempo</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="date"
                            stroke="#9CA3AF"
                            tickFormatter={(dateStr) => format(parseISO(dateStr), 'dd/MM', { locale: ptBR })}
                        />
                        <YAxis stroke="#9CA3AF" allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                            labelFormatter={(dateStr) => format(parseISO(dateStr as string), 'dd MMM yyyy', { locale: ptBR })}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line
                            type="monotone"
                            dataKey="feed"
                            name="Feed (Quadrado)"
                            stroke="#8B5CF6" // Purple
                            strokeWidth={3}
                            dot={{ fill: '#8B5CF6', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="stories"
                            name="Stories (Vertical)"
                            stroke="#EC4899" // Pink
                            strokeWidth={3}
                            dot={{ fill: '#EC4899', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
