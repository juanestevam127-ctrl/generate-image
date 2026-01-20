"use client";

import { useState } from "react";
import { Plus, Trash, UserPlus, Shield, User as UserIcon } from "lucide-react";
import { useStore, UserRole } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";

// Using native select for simplicity with premium styling
// but asking for "Premium" design suggests we should use styled components. 
// I will assume standardized styling matching Inputs for the select.

export function UserManager() {
    const { registeredUsers, registerUser, removeUser, user: currentUser } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPass, setNewUserPass] = useState("");
    const [newUserRole, setNewUserRole] = useState<UserRole>("common");
    const [newUserName, setNewUserName] = useState("");

    const handleRegister = () => {
        if (!newUserEmail || !newUserPass) return alert("Email e Senha obrigatórios");

        registerUser({
            email: newUserEmail,
            password: newUserPass,
            role: newUserRole,
            name: newUserName || undefined
        });

        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setNewUserEmail("");
        setNewUserPass("");
        setNewUserRole("common");
        setNewUserName("");
    };

    const handleDelete = (email: string) => {
        if (email === currentUser?.email) {
            alert("Você não pode remover seu próprio usuário!");
            return;
        }
        if (confirm(`Tem certeza que deseja remover ${email}?`)) {
            removeUser(email);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Gerenciamento de Usuários
                    </h2>
                    <p className="text-sm text-muted-foreground">Controle quem tem acesso à plataforma</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/20">
                    <UserPlus className="w-4 h-4 mr-2" /> Novo Usuário
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registeredUsers.map((u) => (
                    <Card key={u.email} className="relative group overflow-hidden border-white/5 hover:border-purple-500/50 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className={`p-2 rounded-full ${u.role === 'master' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {u.role === 'master' ? <Shield size={20} /> : <UserIcon size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{u.name || "Usuário"}</h3>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">{u.role}</span>
                                </div>
                            </div>

                            {u.email !== currentUser?.email && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(u.email)}
                                >
                                    <Trash size={16} />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Registration Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Novo Usuário"
                className="max-w-md"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-muted-foreground font-bold">Nome (Opcional)</label>
                        <Input
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="Ex: João Silva"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-muted-foreground font-bold">Email</label>
                        <Input
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="usuario@empresa.com"
                            type="email"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-muted-foreground font-bold">Senha</label>
                        <Input
                            value={newUserPass}
                            onChange={(e) => setNewUserPass(e.target.value)}
                            placeholder="••••••••"
                            type="password" // Assuming simple text storage for this MVP as discussed
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-muted-foreground font-bold">Permissão</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-black/20 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        >
                            <option value="common">Comum (Apenas Uso)</option>
                            <option value="master">Admin (Acesso Total)</option>
                        </select>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleRegister} className="bg-purple-600 hover:bg-purple-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Cadastrar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
