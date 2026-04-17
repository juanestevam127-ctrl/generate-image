import { useQuery } from '@tanstack/react-query';
import {
    fetchLayoutClientsAction,
    fetchLayoutMetricsAction,
    fetchLayoutEvolutionDataAction,
    fetchLayoutRankingDataAction,
    fetchLayoutHourlyDataAction,
    fetchLayoutWeeklyDataAction,
    fetchLayoutDetailedTableAction,
} from '@/app/actions/layoutDashboard';
import { DashboardFilters } from '@/lib/layoutsQueries';

export function useLayoutDashboardData(filters: DashboardFilters) {
    const serverFilters = {
        ...filters,
        dateRange: {
            from: filters.dateRange.from.toISOString(),
            to: filters.dateRange.to.toISOString(),
        }
    };

    const clientsQuery = useQuery({
        queryKey: ['layout-dashboard-clients'],
        queryFn: fetchLayoutClientsAction,
        staleTime: 1000 * 60 * 5,
    });

    const metricsQuery = useQuery({
        queryKey: ['layout-dashboard-metrics', filters],
        queryFn: () => fetchLayoutMetricsAction(serverFilters),
    });

    const evolutionQuery = useQuery({
        queryKey: ['layout-dashboard-evolution', filters],
        queryFn: () => fetchLayoutEvolutionDataAction(serverFilters),
    });

    const rankingQuery = useQuery({
        queryKey: ['layout-dashboard-ranking', filters],
        queryFn: () => fetchLayoutRankingDataAction(serverFilters),
        enabled: !filters.selectedClient,
    });

    const hourlyQuery = useQuery({
        queryKey: ['layout-dashboard-hourly', filters],
        queryFn: () => fetchLayoutHourlyDataAction(serverFilters),
        enabled: !!filters.selectedClient,
    });

    const weeklyQuery = useQuery({
        queryKey: ['layout-dashboard-weekly', filters],
        queryFn: () => fetchLayoutWeeklyDataAction(serverFilters),
        enabled: !!filters.selectedClient,
    });

    const tableQuery = useQuery({
        queryKey: ['layout-dashboard-table', filters],
        queryFn: () => fetchLayoutDetailedTableAction(serverFilters),
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
