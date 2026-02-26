'use client';

import { useState, useMemo } from 'react';
import { getDateRangeFromPreset } from '@/lib/dateHelpers';
import { useLayoutDashboardData } from '@/hooks/useLayoutDashboardData';
import { useStore } from '@/lib/store-context';

import ClientSelector from '@/components/dashboard/ClientSelector';
import DateFilter from '@/components/dashboard/DateFilter';
import MetricsCards from '@/components/dashboard/MetricsCards';
import EvolutionChart from '@/components/dashboard/EvolutionChart';
import FormatDistribution from '@/components/dashboard/FormatDistribution';
import ClientRanking from '@/components/dashboard/ClientRanking';
import HourlyDistribution from '@/components/dashboard/HourlyDistribution';
import WeeklyTrend from '@/components/dashboard/WeeklyTrend';
import LayoutDetailedTable from '@/components/dashboard/LayoutDetailedTable';

export default function LayoutAnalyticsView() {
    const { layoutClients } = useStore();
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState(getDateRangeFromPreset('last-7-days'));

    const clientNames = useMemo(() => {
        return layoutClients.map(c => c.name).sort((a, b) => a.localeCompare(b));
    }, [layoutClients]);

    const {
        metrics,
        evolution,
        ranking,
        hourly,
        weekly,
        tableData,
        isLoading
    } = useLayoutDashboardData({
        dateRange,
        selectedClient,
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-gray-900/50 p-6 rounded-2xl border border-white/5">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Dashboard de Layouts
                    </h2>
                    <p className="text-gray-400 mt-1">
                        Performance de geração de layouts por cliente
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

                {selectedClient ? (
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <HourlyDistribution data={hourly} isLoading={isLoading} />
                        <WeeklyTrend data={weekly} isLoading={isLoading} />
                    </div>
                ) : (
                    <div className="lg:col-span-3">
                        <ClientRanking data={ranking} isLoading={isLoading} />
                    </div>
                )}
            </div>

            {/* Detailed Table */}
            <div className="pt-2">
                <LayoutDetailedTable
                    data={tableData}
                    isLoading={isLoading}
                    selectedClient={selectedClient}
                />
            </div>
        </div>
    );
}
