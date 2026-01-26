"use client";

import { useRef } from "react";
import { Client } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash, Plus, Upload, Image as ImageIcon, Edit, X, Copy, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicTableProps {
    client: Client;
    data: Record<string, any>[];
    onChange: (newData: Record<string, any>[]) => void;
    onImageUpload: (rowIndex: number, colId: string, file: File) => void;
    onEditImage: (rowIndex: number, colId: string, imageUrl: string) => void;
}

export function DynamicTable({ client, data, onChange, onImageUpload, onEditImage }: DynamicTableProps) {

    const handleCellChange = (rowIndex: number, colId: string, value: any) => {
        const newData = [...data];
        newData[rowIndex] = { ...newData[rowIndex], [colId]: value };
        onChange(newData);
    };

    const addRow = () => {
        const newRow: Record<string, any> = { _id: crypto.randomUUID() };
        client.columns.forEach(col => newRow[col.id] = "");
        onChange([...data, newRow]);
    };

    const removeRow = (index: number) => {
        if (data.length > 1) {
            onChange(data.filter((_, idx) => idx !== index));
        } else {
            // Clear instead of remove if only 1
            const newRow: Record<string, any> = { _id: crypto.randomUUID() };
            client.columns.forEach(col => newRow[col.id] = "");
            onChange([newRow]);
        }
    };

    const cloneRow = (index: number) => {
        const rowToClone = data[index];
        const clonedRow = { ...rowToClone, _id: crypto.randomUUID() };
        const newData = [...data];
        newData.splice(index + 1, 0, clonedRow);
        onChange(newData);
    };

    // Helper for file input references
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Added max-width and custom scrollbar styling class for visibility */}
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm pb-4">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">#</th>
                            {client.columns.map((col) => (
                                <th key={col.id} className="px-4 py-3 min-w-[150px]">
                                    <div className="flex items-center gap-2">
                                        {col.type === "image" ? <ImageIcon size={14} className="text-purple-400" /> : <TypeIcon />}
                                        {col.name}
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 w-12 text-center"><Trash size={14} /></th>
                            <th className="px-4 py-3 w-12 text-center"><Copy size={14} /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={row._id || rowIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="px-4 py-3 text-center text-muted-foreground">{rowIndex + 1}</td>
                                {client.columns.map((col) => (
                                    <td key={col.id} className="px-4 py-3">
                                        {col.type === "text" ? (
                                            <Input
                                                value={row[col.id] || ""}
                                                onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
                                                className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-indigo-500/50 transition-all"
                                                placeholder="Digite..."
                                            />
                                        ) : col.type === "checkbox" ? (
                                            <div className="flex flex-wrap gap-2 py-1">
                                                {col.options?.map((option) => {
                                                    const isChecked = (row[col.id] || "").split(", ").includes(option);
                                                    return (
                                                        <label key={option} className="flex items-center gap-1.5 cursor-pointer group/cb">
                                                            <div
                                                                className={cn(
                                                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                                    isChecked ? "bg-indigo-500 border-indigo-500" : "border-white/20 group-hover/cb:border-white/40 bg-white/5"
                                                                )}
                                                                onClick={() => {
                                                                    const currentValues = (row[col.id] || "").split(", ").filter((v: string) => v !== "");
                                                                    let newValues;
                                                                    if (isChecked) {
                                                                        newValues = currentValues.filter((v: string) => v !== option);
                                                                    } else {
                                                                        newValues = [...currentValues, option];
                                                                    }
                                                                    handleCellChange(rowIndex, col.id, newValues.join(", "));
                                                                }}
                                                            >
                                                                {isChecked && <X size={10} className="text-white" />}
                                                            </div>
                                                            <span className={cn("text-xs transition-colors", isChecked ? "text-indigo-300" : "text-gray-400 group-hover/cb:text-gray-300")}>
                                                                {option}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                                {!col.options?.length && <span className="text-[10px] text-muted-foreground italic">Sem opções</span>}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {row[col.id] ? (
                                                    // Image Preview State
                                                    <div className="relative group/image">
                                                        {/* Simple Preview Thumbnail */}
                                                        <div className="h-10 w-10 rounded overflow-hidden border border-white/20 bg-black/50">
                                                            <img src={row[col.id]} alt="Preview" className="h-full w-full object-cover" />
                                                        </div>

                                                        {/* Actions Overlay */}
                                                        <div className="absolute -right-2 top-0 hidden group-hover/image:flex gap-1 bg-black/80 rounded p-1 z-10 border border-white/10">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-400" onClick={() => onEditImage(rowIndex, col.id, row[col.id])} title="Editar">
                                                                <Edit size={12} />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => handleCellChange(rowIndex, col.id, "")} title="Remover">
                                                                <X size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Empty State
                                                    <>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            ref={el => { fileInputRefs.current[`${rowIndex}-${col.id}`] = el }}
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    onImageUpload(rowIndex, col.id, e.target.files[0]);
                                                                    // Reset input value so same file can be selected again
                                                                    e.target.value = "";
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-full border-dashed border-white/20 text-muted-foreground hover:text-white hover:border-indigo-500/50"
                                                            onClick={() => fileInputRefs.current[`${rowIndex}-${col.id}`]?.click()}
                                                        >
                                                            <Upload size={14} className="mr-2" /> Upload
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                        onClick={() => removeRow(rowIndex)}
                                    >
                                        <Trash size={14} />
                                    </Button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-400"
                                        onClick={() => cloneRow(rowIndex)}
                                    >
                                        <Copy size={14} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Button variant="ghost" onClick={addRow} className="w-full border border-dashed border-white/10 hover:bg-white/5 py-4 text-muted-foreground hover:text-white">
                <Plus size={16} className="mr-2" /> Adicionar Linha
            </Button>
        </div>
    );
}

function TypeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></svg>
    );
}
