import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface HourlyDistributionProps {
    data: { hour: number; count: number }[];
    isLoading: boolean;
}

export default function HourlyDistribution({ data, isLoading }: HourlyDistributionProps) {
    if (isLoading) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Carregando distribuição horária...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center">
                <span className="text-gray-400">Sem dados horários</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Horários de Maior Geração</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            stroke="#9CA3AF"
                            tickFormatter={(hour) => `${hour}h`}
                        />
                        <YAxis stroke="#9CA3AF" allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: '#374151' }}
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                            labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Artes Geradas" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
