"use server";

import { supabase } from "@/lib/supabase";

export const LAYOUT_TABLE_NAME = 'design_online_layouts_disparos';

export interface LayoutDashboardFilters {
    dateRange: {
        from: string;
        to: string;
    };
    selectedClient: string | null;
}

export async function fetchLayoutClientsAction() {
    const { data, error } = await supabase
        .from('design_online_layouts_clientes')
        .select('nome_cliente')
        .order('nome_cliente');

    if (error) throw error;

    const uniqueClients = Array.from(new Set(data?.map(item => item.nome_cliente).filter(Boolean)));
    return uniqueClients as string[];
}

export async function fetchLayoutMetricsAction(filters: LayoutDashboardFilters) {
    let query = supabase
        .from(LAYOUT_TABLE_NAME)
        .select('*', { count: 'exact' });

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

    if (filters.selectedClient) {
        query = query.eq('nome_cliente', filters.selectedClient);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    const feedCount = data?.filter(i => i.payload?.modelo_feed_id).length || 0;
    const storiesCount = data?.filter(i => i.payload?.modelo_stories_id).length || 0;

    return {
        total,
        feed: feedCount,
        stories: storiesCount,
        percentFeed: total > 0 ? Math.round((feedCount / total) * 100) : 0,
        percentStories: total > 0 ? Math.round((storiesCount / total) * 100) : 0,
    };
}

export async function fetchLayoutEvolutionDataAction(filters: LayoutDashboardFilters) {
    let query = supabase
        .from(LAYOUT_TABLE_NAME)
        .select('created_at, payload');

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to)
        .order('created_at');

    if (filters.selectedClient) {
        query = query.eq('nome_cliente', filters.selectedClient);
    }

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, { date: string; feed: number; stories: number }> = {};

    data?.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        if (!grouped[date]) {
            grouped[date] = { date, feed: 0, stories: 0 };
        }
        if (item.payload?.modelo_feed_id) grouped[date].feed++;
        if (item.payload?.modelo_stories_id) grouped[date].stories++;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchLayoutRankingDataAction(filters: LayoutDashboardFilters) {
    let query = supabase
        .from(LAYOUT_TABLE_NAME)
        .select('nome_cliente');

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, { name: string; total: number }> = {};

    data?.forEach(item => {
        const name = item.nome_cliente;
        if (!name) return;
        if (!grouped[name]) grouped[name] = { name, total: 0 };
        grouped[name].total++;
    });

    return Object.values(grouped)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);
}

export async function fetchLayoutHourlyDataAction(filters: LayoutDashboardFilters) {
    if (!filters.selectedClient) return [];

    let query = supabase
        .from(LAYOUT_TABLE_NAME)
        .select('created_at');

    query = query
        .eq('nome_cliente', filters.selectedClient)
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

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

export async function fetchLayoutWeeklyDataAction(filters: LayoutDashboardFilters) {
    if (!filters.selectedClient) return [];

    let query = supabase
        .from(LAYOUT_TABLE_NAME)
        .select('created_at');

    query = query
        .eq('nome_cliente', filters.selectedClient)
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to);

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

export async function fetchLayoutDetailedTableAction(filters: LayoutDashboardFilters) {
    let query = supabase
        .from(LAYOUT_TABLE_NAME)
        .select('*');

    query = query
        .gte('created_at', filters.dateRange.from)
        .lte('created_at', filters.dateRange.to)
        .order('created_at', { ascending: false });

    if (filters.selectedClient) {
        query = query.eq('nome_cliente', filters.selectedClient);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
}
