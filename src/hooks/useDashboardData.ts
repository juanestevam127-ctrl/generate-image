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

    const metricsQuery = useQuery({
        queryKey: ['dashboard-metrics', filters],
        queryFn: () => fetchMetricsAction(filters),
    });

    const evolutionQuery = useQuery({
        queryKey: ['dashboard-evolution', filters],
        queryFn: () => fetchEvolutionDataAction(filters),
    });

    const rankingQuery = useQuery({
        queryKey: ['dashboard-ranking', filters],
        queryFn: () => fetchRankingDataAction(filters),
        enabled: !filters.selectedClient, // Only fetch for All Clients
    });

    const hourlyQuery = useQuery({
        queryKey: ['dashboard-hourly', filters],
        queryFn: () => fetchHourlyDataAction(filters),
        enabled: !!filters.selectedClient, // Only fetch for Specific Client
    });

    const weeklyQuery = useQuery({
        queryKey: ['dashboard-weekly', filters],
        queryFn: () => fetchWeeklyDataAction(filters),
        enabled: !!filters.selectedClient, // Only fetch for Specific Client
    });

    const tableQuery = useQuery({
        queryKey: ['dashboard-table', filters],
        queryFn: () => fetchDetailedTableAction(filters),
    });

    const vehicleQuery = useQuery({
        queryKey: ['dashboard-vehicle', filters],
        queryFn: () => fetchVehicleDataAction(filters),
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
