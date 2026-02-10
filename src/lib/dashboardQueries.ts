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
