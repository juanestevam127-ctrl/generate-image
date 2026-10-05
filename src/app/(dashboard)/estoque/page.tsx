import React from "react";
import { EstoqueManager } from "@/components/features/EstoqueManager";

export default function EstoquePage() {
    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-y-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Estoque dos Clientes</h1>
            <EstoqueManager />
        </div>
    );
}
