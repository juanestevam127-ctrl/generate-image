import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { DateRange, DateRangePreset, getDateRangeFromPreset } from '@/lib/dateHelpers';

interface DateFilterProps {
    currentRange: DateRange;
    onRangeChange: (range: DateRange) => void;
}

export default function DateFilter({ currentRange, onRangeChange }: DateFilterProps) {
    const [activePreset, setActivePreset] = useState<DateRangePreset>('last-7-days');
    const [isCustomOpen, setIsCustomOpen] = useState(false);

    // Local state for custom dates before applying
    const [tempStart, setTempStart] = useState(format(currentRange.from, 'yyyy-MM-dd'));
    const [tempEnd, setTempEnd] = useState(format(currentRange.to, 'yyyy-MM-dd'));

    const presets: { label: string; value: DateRangePreset }[] = [
        { label: 'Hoje', value: 'today' },
        { label: '7 Dias', value: 'last-7-days' },
        { label: '30 Dias', value: 'last-30-days' },
        { label: 'Este Mês', value: 'this-month' },
        { label: 'Mês Passado', value: 'last-month' },
    ];

    const handlePresetClick = (preset: DateRangePreset) => {
        setActivePreset(preset);
        setIsCustomOpen(false);
        onRangeChange(getDateRangeFromPreset(preset));
    };

    const handleCustomApply = () => {
        const start = new Date(tempStart);
        const end = new Date(tempEnd);
        // Set end of day for the end date to include full day
        end.setHours(23, 59, 59, 999);

        onRangeChange({ from: start, to: end });
        setActivePreset('custom');
        setIsCustomOpen(false);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">

            {/* Quick Presets */}
            <div className="flex bg-gray-800 rounded-lg p-1 overflow-x-auto max-w-full">
                {presets.map((preset) => (
                    <button
                        key={preset.value}
                        onClick={() => handlePresetClick(preset.value)}
                        className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${activePreset === preset.value
                            ? 'bg-purple-600 text-white font-medium shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
                <button
                    onClick={() => setIsCustomOpen(!isCustomOpen)}
                    className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors flex items-center gap-1 ${activePreset === 'custom'
                        ? 'bg-purple-600 text-white font-medium shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Personalizado</span>
                </button>
            </div>

            {/* Custom Date Inputs (Conditional) */}
            {isCustomOpen && (
                <div className="flex flex-wrap items-center gap-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                    <input
                        type="date"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-purple-500 w-[125px]"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-purple-500 w-[125px]"
                    />
                    <button
                        onClick={handleCustomApply}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
                    >
                        Aplicar
                    </button>
                </div>
            )}

            {/* Current Range Display (Optional feedback) */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 ml-auto">
                <Filter className="w-3 h-3" />
                <span>
                    {format(currentRange.from, 'dd/MM/yyyy')} - {format(currentRange.to, 'dd/MM/yyyy')}
                </span>
            </div>
        </div>
    );
}
