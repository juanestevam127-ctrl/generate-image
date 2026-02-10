import { MetricStats } from '@/lib/dashboardQueries';
import { Activity, Image as ImageIcon, Layers, TrendingUp, Users } from 'lucide-react';

interface MetricsCardsProps {
    stats: MetricStats | undefined;
    isLoading: boolean;
    selectedClient: string | null;
}

export default function MetricsCards({ stats, isLoading, selectedClient }: MetricsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse h-32"></div>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const cards = [
        {
            title: 'Total de Artes',
            value: stats.total.toLocaleString(),
            subValue: 'Geradas no período',
            icon: ImageIcon,
            color: 'text-blue-400',
            bgConfig: 'bg-blue-400/10',
        },
        {
            title: 'Feed (Quadrado)',
            value: stats.feed.toLocaleString(),
            subValue: `${stats.percentFeed}% do total`,
            icon: Layers,
            color: 'text-purple-400',
            bgConfig: 'bg-purple-400/10',
        },
        {
            title: 'Stories (Vertical)',
            value: stats.stories.toLocaleString(),
            subValue: `${stats.percentStories}% do total`,
            icon: Activity,
            color: 'text-pink-400',
            bgConfig: 'bg-pink-400/10',
        },
        {
            title: 'Média Diária',
            // Assuming naive average over selected period logic handled elsewhere or simple approx
            // For now just showing a placeholder or generic calculation if we had day count.
            // Let's replace this with "Cliente Ativo" if All Clients, or just general info.
            value: selectedClient ? 'N/A' : 'Top Performance',
            subValue: selectedClient ? 'Focado neste cliente' : 'Rankings disponíveis',
            icon: selectedClient ? TrendingUp : Users,
            color: 'text-green-400',
            bgConfig: 'bg-green-400/10',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, idx) => (
                <div key={idx} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-400">{card.title}</p>
                            <h3 className="text-2xl font-bold text-white mt-2">{card.value}</h3>
                            <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
                        </div>
                        <div className={`p-2.5 rounded-lg ${card.bgConfig}`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
