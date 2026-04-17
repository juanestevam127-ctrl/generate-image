import { useQuery } from '@tanstack/react-query';
import { DashboardFilters } from '@/lib/dashboardQueries';
import {
    fetchMetricsAction,
    fetchEvolutionDataAction,
    fetchRankingDataAction,
    fetchHourlyDataAction,
    fetchWeeklyDataAction,
    fetchDetailedTableAction,
    fetchVehicleDataAction
} from '@/app/actions/dashboard';

export function useDashboardData(filters: DashboardFilters) {
    const clientsQuery = useQuery({
        queryKey: ['dashboard-clients'],
        queryFn: () => [], // Clients are now loaded via StoreContext mostly, but I could add the action here if needed. 
        staleTime: 1000 * 60 * 5,
    });

    const serverFilters = {
        ...filters,
        dateRange: {
            from: filters.dateRange.from.toISOString(),
            to: filters.dateRange.to.toISOString(),
        }
    };

    const metricsQuery = useQuery({
        queryKey: ['dashboard-metrics', serverFilters],
        queryFn: () => fetchMetricsAction(serverFilters),
    });

    const evolutionQuery = useQuery({
        queryKey: ['dashboard-evolution', serverFilters],
        queryFn: () => fetchEvolutionDataAction(serverFilters),
    });

    const rankingQuery = useQuery({
        queryKey: ['dashboard-ranking', serverFilters],
        queryFn: () => fetchRankingDataAction(serverFilters),
        enabled: !filters.selectedClient, // Only fetch for All Clients
    });

    const hourlyQuery = useQuery({
        queryKey: ['dashboard-hourly', serverFilters],
        queryFn: () => fetchHourlyDataAction(serverFilters),
        enabled: !!filters.selectedClient, // Only fetch for Specific Client
    });

    const weeklyQuery = useQuery({
        queryKey: ['dashboard-weekly', serverFilters],
        queryFn: () => fetchWeeklyDataAction(serverFilters),
        enabled: !!filters.selectedClient, // Only fetch for Specific Client
    });

    const tableQuery = useQuery({
        queryKey: ['dashboard-table', serverFilters],
        queryFn: () => fetchDetailedTableAction(serverFilters),
    });

    const vehicleQuery = useQuery({
        queryKey: ['dashboard-vehicle', serverFilters],
        queryFn: () => fetchVehicleDataAction(serverFilters),
    });

    return {
        clients: clientsQuery.data || [],
        metrics: metricsQuery.data,
        evolution: evolutionQuery.data || [],
        ranking: rankingQuery.data || [],
        hourly: hourlyQuery.data || [],
        weekly: weeklyQuery.data || [],
        tableData: tableQuery.data || [],
        vehicleData: vehicleQuery.data || {
            summary: {
                total_veiculos: 0,
                total_imagens: 0,
                mostImages: null,
                leastImages: null,
                mostActiveClient: null
            },
            stats: [],
            clientStats: []
        },
        isLoading:
            metricsQuery.isLoading ||
            evolutionQuery.isLoading ||
            vehicleQuery.isLoading ||
            (filters.selectedClient ? hourlyQuery.isLoading : rankingQuery.isLoading),
    };
}
