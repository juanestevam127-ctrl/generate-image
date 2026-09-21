import { GeneralConfig } from "@/components/features/GeneralConfig";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Configurações Gerais | Artes Design",
};

export default function ConfiguracoesPage() {
    return (
        <div className="p-8">
            <GeneralConfig />
        </div>
    );
}
