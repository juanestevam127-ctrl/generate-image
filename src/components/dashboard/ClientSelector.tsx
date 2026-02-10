import { ChevronDown, Search } from 'lucide-react';

interface ClientSelectorProps {
    clients: string[];
    selectedClient: string | null;
    onSelectClient: (client: string | null) => void;
    isLoading?: boolean;
}

export default function ClientSelector({
    clients,
    selectedClient,
    onSelectClient,
    isLoading
}: ClientSelectorProps) {
    return (
        <div className="relative inline-block w-full md:w-64">
            <label className="block text-sm font-medium text-gray-400 mb-1">
                Filtrar por Cliente
            </label>
            <div className="relative">
                <select
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-lg appearance-none cursor-pointer"
                    value={selectedClient || ''}
                    onChange={(e) => onSelectClient(e.target.value || null)}
                    disabled={isLoading}
                >
                    <option value="">Todos os Clientes</option>
                    {clients.map((client) => (
                        <option key={client} value={client}>
                            {client}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}
