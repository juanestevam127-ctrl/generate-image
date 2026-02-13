import { supabase } from './supabase';
import { DateRange } from './dateHelpers';

export const TABLE_NAME = 'publicacoes_design_online';

export interface DashboardFilters {
    dateRange: DateRange;
    selectedClient: string | null; // null means 'All Clients'
}

export interface MetricStats {
    total: number;
    feed: number;
    stories: number;
    percentFeed: number;
    percentStories: number;
}

export async function fetchClients() {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('nome_empresa')
        .order('nome_empresa');

    if (error) throw error;

    // Extract unique names
    const uniqueClients = Array.from(new Set(data?.map(item => item.nome_empresa).filter(Boolean)));
    return uniqueClients as string[];
}

export async function fetchMetrics(filters: DashboardFilters) {
    let query = supabase
        .from(TABLE_NAME)
        .select('formato', { count: 'exact' });

    // Apply date filter
    query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

    // Apply client filter
    if (filters.selectedClient) {
        query = query.eq('nome_empresa', filters.selectedClient);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count || 0;
    const feedCount = data?.filter(i => i.formato === 'FEED').length || 0;
    const storiesCount = data?.filter(i => i.formato === 'STORIES').length || 0;

    return {
        total,
        feed: feedCount,
        stories: storiesCount,
        percentFeed: total > 0 ? Math.round((feedCount / total) * 100) : 0,
        percentStories: total > 0 ? Math.round((storiesCount / total) * 100) : 0,
    };
}

export async function fetchEvolutionData(filters: DashboardFilters) {
    // We'll fetch all records in range and process in JS for simplicity 
    // (Supabase doesn't support complex GROUP BY DATE aggregation easily via JS client without RPC)
    let query = supabase
        .from(TABLE_NAME)
        .select('created_at, formato');

    query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString())
        .order('created_at');

    if (filters.selectedClient) {
        query = query.eq('nome_empresa', filters.selectedClient);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Process data to group by date
    // Using simple string date key YYYY-MM-DD
    const grouped: Record<string, { date: string; feed: number; stories: number }> = {};

    data?.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!grouped[date]) {
            grouped[date] = { date, feed: 0, stories: 0 };
        }
        if (item.formato === 'FEED') grouped[date].feed++;
        if (item.formato === 'STORIES') grouped[date].stories++;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchRankingData(filters: DashboardFilters) {
    // Fetch all in range and aggregate
    let query = supabase
        .from(TABLE_NAME)
        .select('nome_empresa, formato');

    query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, { name: string; total: number }> = {};

    data?.forEach(item => {
        const name = item.nome_empresa;
        if (!name) return;
        if (!grouped[name]) grouped[name] = { name, total: 0 };
        grouped[name].total++;
    });

    return Object.values(grouped)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15); // Top 15
}

export async function fetchHourlyData(filters: DashboardFilters) {
    if (!filters.selectedClient) return [];

    let query = supabase
        .from(TABLE_NAME)
        .select('created_at');

    query = query
        .eq('nome_empresa', filters.selectedClient)
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

    const { data, error } = await query;
    if (error) throw error;

    const hours = new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));

    data?.forEach(item => {
        const d = new Date(item.created_at);
        const h = d.getHours();
        hours[h].count++;
    });

    return hours;
}

export async function fetchWeeklyData(filters: DashboardFilters) {
    if (!filters.selectedClient) return [];

    let query = supabase
        .from(TABLE_NAME)
        .select('created_at');

    query = query
        .eq('nome_empresa', filters.selectedClient)
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

    const { data, error } = await query;
    if (error) throw error;

    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekStats = days.map(day => ({ day, count: 0 }));

    data?.forEach(item => {
        const d = new Date(item.created_at);
        const dayIndex = d.getDay();
        weekStats[dayIndex].count++;
    });

    return weekStats;
}

export async function fetchDetailedTable(filters: DashboardFilters) {
    let query = supabase
        .from(TABLE_NAME)
        .select('*');

    query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString())
        .order('created_at', { ascending: false });

    if (filters.selectedClient) {
        query = query.eq('nome_empresa', filters.selectedClient);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
}
export interface VehicleStats {
    veiculo_gerado: string;
    total_imagens: number;
    percentual: number;
    top_empresa: string;
}

export interface VehicleClientStats {
    nome_empresa: string;
    total_veiculos: number;
    total_imagens: number;
}

export interface VehicleSummary {
    total_veiculos: number;
    total_imagens: number;
    mostImages: { name: string; count: number } | null;
    leastImages: { name: string; count: number } | null;
    mostActiveClient: { name: string; count: number } | null;
}

export async function fetchVehicleData(filters: DashboardFilters) {
    let query = supabase
        .from(TABLE_NAME)
        .select('veiculo_gerado, nome_empresa');

    // Apply date filter
    query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString())
        .not('veiculo_gerado', 'is', null);

    // Apply client filter
    if (filters.selectedClient) {
        query = query.eq('nome_empresa', filters.selectedClient);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
        return {
            summary: {
                total_veiculos: 0,
                total_imagens: 0,
                mostImages: null,
                leastImages: null,
                mostActiveClient: null
            },
            stats: [],
            clientStats: []
        };
    }

    // Process Summary & Stats
    const vehicleCounts: Record<string, number> = {};
    const vehicleClientCounts: Record<string, Record<string, number>> = {};
    const clientTotalCounts: Record<string, number> = {};

    data.forEach(item => {
        const v = item.veiculo_gerado;
        const c = item.nome_empresa || 'Sem Cliente';

        vehicleCounts[v] = (vehicleCounts[v] || 0) + 1;
        clientTotalCounts[c] = (clientTotalCounts[c] || 0) + 1;

        if (!vehicleClientCounts[v]) vehicleClientCounts[v] = {};
        vehicleClientCounts[v][c] = (vehicleClientCounts[v][c] || 0) + 1;
    });

    const vEntries = Object.entries(vehicleCounts);
    const sortedByCount = [...vEntries].sort((a, b) => b[1] - a[1]);

    const cEntries = Object.entries(clientTotalCounts);
    const sortedClients = [...cEntries].sort((a, b) => b[1] - a[1]);

    const totalImagens = data.length;

    const stats: VehicleStats[] = sortedByCount.map(([name, count]) => {
        // Find top client for this vehicle
        const clientsForThisVehicle = vehicleClientCounts[name];
        const topClient = Object.entries(clientsForThisVehicle)
            .sort((a, b) => b[1] - a[1])[0][0];

        return {
            veiculo_gerado: name,
            total_imagens: count,
            percentual: parseFloat(((count * 100) / totalImagens).toFixed(1)),
            top_empresa: topClient
        };
    });

    const summary: VehicleSummary = {
        total_veiculos: vEntries.length,
        total_imagens: totalImagens,
        mostImages: sortedByCount.length > 0 ? { name: sortedByCount[0][0], count: sortedByCount[0][1] } : null,
        leastImages: sortedByCount.length > 0 ? { name: sortedByCount[sortedByCount.length - 1][0], count: sortedByCount[sortedByCount.length - 1][1] } : null,
        mostActiveClient: sortedClients.length > 0 ? { name: sortedClients[0][0], count: sortedClients[0][1] } : null,
    };

    const clientStats: VehicleClientStats[] = sortedClients.map(([name, count]) => {
        // Count unique vehicles for this client
        const uniqueVehicles = new Set(
            data.filter(item => (item.nome_empresa || 'Sem Cliente') === name)
                .map(item => item.veiculo_gerado)
        ).size;

        return {
            nome_empresa: name,
            total_veiculos: uniqueVehicles,
            total_imagens: count
        };
    });

    return { summary, stats, clientStats };
}
