import {
    startOfDay,
    endOfDay,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear,
    endOfYear
} from 'date-fns';

export type DateRangePreset =
    | 'today'
    | 'last-7-days'
    | 'last-30-days'
    | 'this-month'
    | 'last-month'
    | 'last-3-months'
    | 'last-6-months'
    | 'this-year'
    | 'custom';

export interface DateRange {
    from: Date;
    to: Date;
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
    const now = new Date();

    switch (preset) {
        case 'today':
            return { from: startOfDay(now), to: endOfDay(now) };
        case 'last-7-days':
            return { from: subDays(now, 7), to: endOfDay(now) };
        case 'last-30-days':
            return { from: subDays(now, 30), to: endOfDay(now) };
        case 'this-month':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'last-month': {
            const lastMonth = subMonths(now, 1);
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        }
        case 'last-3-months':
            return { from: subDays(now, 90), to: endOfDay(now) };
        case 'last-6-months':
            return { from: subDays(now, 180), to: endOfDay(now) };
        case 'this-year':
            return { from: startOfYear(now), to: endOfYear(now) };
        default:
            return { from: startOfDay(now), to: endOfDay(now) };
    }
}
