'use client';

import { useState, useMemo } from 'react';
import { getDateRangeFromPreset } from '@/lib/dateHelpers';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useStore } from '@/lib/store-context';

import ClientSelector from '@/components/dashboard/ClientSelector';
import DateFilter from '@/components/dashboard/DateFilter';
import MetricsCards from '@/components/dashboard/MetricsCards';
import EvolutionChart from '@/components/dashboard/EvolutionChart';
import FormatDistribution from '@/components/dashboard/FormatDistribution';
import ClientRanking from '@/components/dashboard/ClientRanking';
import HourlyDistribution from '@/components/dashboard/HourlyDistribution';
import WeeklyTrend from '@/components/dashboard/WeeklyTrend';
import DetailedTable from '@/components/dashboard/DetailedTable';

export default function AnalyticsView() {
    // 1. Get clients from global store
    const { clients: storeClients } = useStore();
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState(getDateRangeFromPreset('last-7-days'));

    // 2. Extract just the names for the selector
    const clientNames = useMemo(() => {
        return storeClients.map(c => c.name).sort((a, b) => a.localeCompare(b));
    }, [storeClients]);

    const {
        metrics,
        evolution,
        ranking,
        hourly,
        weekly,
        tableData,
        isLoading
    } = useDashboardData({
        dateRange,
        selectedClient,
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-gray-900/50 p-6 rounded-2xl border border-white/5">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Visão Geral
                    </h2>
                    <p className="text-gray-400 mt-1">
                        Performance de geração de artes
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-64">
                        <ClientSelector
                            clients={clientNames}
                            selectedClient={selectedClient}
                            onSelectClient={setSelectedClient}
                            isLoading={false}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Período
                        </label>
                        <DateFilter
                            currentRange={dateRange}
                            onRangeChange={setDateRange}
                        />
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <MetricsCards
                stats={metrics}
                isLoading={isLoading}
                selectedClient={selectedClient}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Row 1: Evolution (2/3) + Format Dist (1/3) */}
                <div className="lg:col-span-2 flex flex-col h-full">
                    <EvolutionChart data={evolution} isLoading={isLoading} />
                </div>
                <div className="h-full">
                    <FormatDistribution
                        feed={metrics?.feed || 0}
                        stories={metrics?.stories || 0}
                        isLoading={isLoading}
                    />
                </div>

                {/* Row 2: Logic Split based on View */}
                {selectedClient ? (
                    <>
                        {/* Specific Client View: Hourly + Weekly Side by Side */}
                        {/* We use a nested grid strategy or just force them into the flexible grid */}
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <HourlyDistribution data={hourly} isLoading={isLoading} />
                            <WeeklyTrend data={weekly} isLoading={isLoading} />
                        </div>
                    </>
                ) : (
                    <>
                        {/* All Clients View: Ranking takes full width to match row 1 width aesthetics */}
                        <div className="lg:col-span-3">
                            <ClientRanking data={ranking} isLoading={isLoading} />
                        </div>
                    </>
                )}
            </div>

            {/* Detailed Table */}
            <div className="pt-2">
                <DetailedTable
                    data={tableData}
                    isLoading={isLoading}
                    selectedClient={selectedClient}
                />
            </div>
        </div>
    );
}
