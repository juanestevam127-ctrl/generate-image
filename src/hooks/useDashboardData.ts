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
} from '@/lib/dashboardQueries';

export function useDashboardData(filters: DashboardFilters) {
    const clientsQuery = useQuery({
        queryKey: ['dashboard-clients'],
        queryFn: fetchClients,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const metricsQuery = useQuery({
        queryKey: ['dashboard-metrics', filters],
        queryFn: () => fetchMetrics(filters),
    });

    const evolutionQuery = useQuery({
        queryKey: ['dashboard-evolution', filters],
        queryFn: () => fetchEvolutionData(filters),
    });

    const rankingQuery = useQuery({
        queryKey: ['dashboard-ranking', filters],
        queryFn: () => fetchRankingData(filters),
        enabled: !filters.selectedClient, // Only fetch for All Clients
    });

    const hourlyQuery = useQuery({
        queryKey: ['dashboard-hourly', filters],
        queryFn: () => fetchHourlyData(filters),
        enabled: !!filters.selectedClient, // Only fetch for Specific Client
    });

    const weeklyQuery = useQuery({
        queryKey: ['dashboard-weekly', filters],
        queryFn: () => fetchWeeklyData(filters),
        enabled: !!filters.selectedClient, // Only fetch for Specific Client
    });

    const tableQuery = useQuery({
        queryKey: ['dashboard-table', filters],
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
