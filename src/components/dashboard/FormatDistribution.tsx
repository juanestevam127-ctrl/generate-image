import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface FormatDistributionProps {
    feed: number;
    stories: number;
    isLoading: boolean;
}

export default function FormatDistribution({ feed, stories, isLoading }: FormatDistributionProps) {
    if (isLoading) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 animate-pulse flex items-center justify-center">
                <span className="text-gray-500">Carregando distribuição...</span>
            </div>
        );
    }

    const data = [
        { name: 'Feed (Quadrado)', value: feed },
        { name: 'Stories (Vertical)', value: stories },
    ].filter((item) => item.value > 0);

    const COLORS = ['#8B5CF6', '#EC4899']; // Purple, Pink

    if (data.length === 0) {
        return (
            <div className="h-80 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center">
                <span className="text-gray-400">Sem dados de distribuição</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Distribuição por Formato</h3>
            <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                        />
                        <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: '10px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
