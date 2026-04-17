"use server";

import { supabase } from "@/lib/supabase";
import { DashboardFilters, TABLE_NAME } from "@/lib/dashboardQueries";

export async function fetchClientsAction() {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('nome_empresa')
        .order('nome_empresa');

    if (error) throw error;
    const uniqueClients = Array.from(new Set(data?.map(item => item.nome_empresa).filter(Boolean)));
    return uniqueClients as string[];
}

export async function fetchMetricsAction(filters: DashboardFilters) {
    let query = supabase
        .from(TABLE_NAME)
        .select('formato', { count: 'exact' });

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

    if (filters.selectedClient) {
        query = query.eq('nome_empresa', filters.selectedClient);
    }

    if (filters.formats && filters.formats.length > 0) {
        query = query.in('formato', filters.formats);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    const feedCount = data?.filter(i => i.formato === 'FEED' || i.formato === 'VENDIDO FEED').length || 0;
    const storiesCount = data?.filter(i => i.formato === 'STORIES' || i.formato === 'VENDIDO STORIES').length || 0;

    return {
        total,
        feed: feedCount,
        stories: storiesCount,
        percentFeed: total > 0 ? Math.round((feedCount / total) * 100) : 0,
        percentStories: total > 0 ? Math.round((storiesCount / total) * 100) : 0,
    };
}

export async function fetchEvolutionDataAction(filters: DashboardFilters) {
    let query = supabase
        .from(TABLE_NAME)
        .select('created_at, formato');

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to)
        .order('created_at');

    if (filters.selectedClient) {
        query = query.eq('nome_empresa', filters.selectedClient);
    }

    if (filters.formats && filters.formats.length > 0) {
        query = query.in('formato', filters.formats);
    }

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, { date: string; feed: number; stories: number }> = {};
    data?.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        if (!grouped[date]) {
            grouped[date] = { date, feed: 0, stories: 0 };
        }
        if (item.formato === 'FEED' || item.formato === 'VENDIDO FEED') grouped[date].feed++;
        if (item.formato === 'STORIES' || item.formato === 'VENDIDO STORIES') grouped[date].stories++;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchRankingDataAction(filters: DashboardFilters) {
    let query = supabase
        .from(TABLE_NAME)
        .select('nome_empresa, formato');

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

    if (filters.formats && filters.formats.length > 0) {
        query = query.in('formato', filters.formats);
    }

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
        .slice(0, 15);
}

export async function fetchHourlyDataAction(filters: DashboardFilters) {
    if (!filters.selectedClient) return [];
    let query = supabase.from(TABLE_NAME).select('created_at');
    query = query.eq('nome_empresa', filters.selectedClient)
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);
    
    const { data, error } = await query;
    if (error) throw error;

    const hours = new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    data?.forEach(item => {
        const d = new Date(item.created_at);
        hours[d.getHours()].count++;
    });
    return hours;
}

export async function fetchWeeklyDataAction(filters: DashboardFilters) {
    if (!filters.selectedClient) return [];
    let query = supabase.from(TABLE_NAME).select('created_at');
    query = query.eq('nome_empresa', filters.selectedClient)
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

    const { data, error } = await query;
    if (error) throw error;

    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekStats = days.map(day => ({ day, count: 0 }));
    data?.forEach(item => {
        const d = new Date(item.created_at);
        weekStats[d.getDay()].count++;
    });
    return weekStats;
}

export async function fetchDetailedTableAction(filters: DashboardFilters) {
    let query = supabase.from(TABLE_NAME).select('*');
    query = query.gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to)
        .order('created_at', { ascending: false });

    if (filters.selectedClient) query = query.eq('nome_empresa', filters.selectedClient);
    if (filters.formats && filters.formats.length > 0) query = query.in('formato', filters.formats);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function fetchVehicleDataAction(filters: DashboardFilters) {
    let query = supabase.from(TABLE_NAME).select('veiculo_gerado, nome_empresa');
    query = query.gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to)
        .not('veiculo_gerado', 'is', null);

    if (filters.selectedClient) query = query.eq('nome_empresa', filters.selectedClient);
    if (filters.formats && filters.formats.length > 0) query = query.in('formato', filters.formats);

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
    const totalImagens = data.length;

    const stats = sortedByCount.map(([name, count]) => {
        const topClient = Object.entries(vehicleClientCounts[name]).sort((a, b) => b[1] - a[1])[0][0];
        return { veiculo_gerado: name, total_imagens: count, percentual: parseFloat(((count * 100) / totalImagens).toFixed(1)), top_empresa: topClient };
    });

    const sortedClients = Object.entries(clientTotalCounts).sort((a, b) => b[1] - a[1]);

    const clientStats = sortedClients.map(([name, count]) => {
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

    return {
        summary: {
            total_veiculos: vEntries.length,
            total_imagens: totalImagens,
            mostImages: sortedByCount.length > 0 ? { name: sortedByCount[0][0], count: sortedByCount[0][1] } : null,
            leastImages: sortedByCount.length > 0 ? { name: sortedByCount[sortedByCount.length - 1][0], count: sortedByCount[sortedByCount.length - 1][1] } : null,
            mostActiveClient: sortedClients.length > 0 ? { name: sortedClients[0][0], count: sortedClients[0][1] } : null
        },
        stats,
        clientStats
    };
}
