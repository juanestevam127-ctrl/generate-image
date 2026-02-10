import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface WeeklyTrendProps {
    data: { day: string; count: number }[];
    isLoading: boolean;
}

export default function WeeklyTrend({ data, isLoading }: WeeklyTrendProps) {
    if (isLoading) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Carregando tendência semanal...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center">
                <span className="text-gray-400">Sem dados semanais</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Distribuição por Dia da Semana</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="day" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: '#374151' }}
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                        />
                        <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Artes Geradas" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
