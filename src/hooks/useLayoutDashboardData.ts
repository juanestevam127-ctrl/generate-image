import { useQuery } from '@tanstack/react-query';
import {
    fetchClients,
    fetchMetrics,
    fetchEvolutionData,
    fetchRankingData,
    fetchHourlyData,
    fetchWeeklyData,
    fetchDetailedTable,
    DashboardFilters
} from '@/lib/layoutsQueries';

export function useLayoutDashboardData(filters: DashboardFilters) {
    const clientsQuery = useQuery({
        queryKey: ['layout-dashboard-clients'],
        queryFn: fetchClients,
        staleTime: 1000 * 60 * 5,
    });

    const metricsQuery = useQuery({
        queryKey: ['layout-dashboard-metrics', filters],
        queryFn: () => fetchMetrics(filters),
    });

    const evolutionQuery = useQuery({
        queryKey: ['layout-dashboard-evolution', filters],
        queryFn: () => fetchEvolutionData(filters),
    });

    const rankingQuery = useQuery({
        queryKey: ['layout-dashboard-ranking', filters],
        queryFn: () => fetchRankingData(filters),
        enabled: !filters.selectedClient,
    });

    const hourlyQuery = useQuery({
        queryKey: ['layout-dashboard-hourly', filters],
        queryFn: () => fetchHourlyData(filters),
        enabled: !!filters.selectedClient,
    });

    const weeklyQuery = useQuery({
        queryKey: ['layout-dashboard-weekly', filters],
        queryFn: () => fetchWeeklyData(filters),
        enabled: !!filters.selectedClient,
    });

    const tableQuery = useQuery({
        queryKey: ['layout-dashboard-table', filters],
        queryFn: () => fetchDetailedTable(filters),
    });

    return {
        clients: clientsQuery.data || [],
        metrics: metricsQuery.data,
        evolution: evolutionQuery.data || [],
        ranking: rankingQuery.data || [],
        hourly: hourlyQuery.data || [],
        weekly: weeklyQuery.data || [],
        tableData: tableQuery.data || [],
        isLoading:
            metricsQuery.isLoading ||
            evolutionQuery.isLoading ||
            (filters.selectedClient ? hourlyQuery.isLoading : rankingQuery.isLoading),
    };
}
