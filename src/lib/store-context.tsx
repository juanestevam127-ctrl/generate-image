"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

// --- Types ---

export type UserRole = "master" | "common";

export interface User {
    email: string;
    role: UserRole;
    name?: string; // Optional name
}

// Internal type for storage (includes password)
interface UserAccount extends User {
    password: string;
}

export type ColumnType = "text" | "image" | "checkbox";

export interface ColumnDefinition {
    id: string;
    name: string;
    type: ColumnType;
    options?: string[]; // For checkbox/select types
}

export interface Client {
    id: string;
    name: string;
    webhookUrl: string;
    webhookPostagens?: string; // New field for scheduling
    columns: ColumnDefinition[];
}

interface StoreContextType {
    // Auth
    user: User | null;
    login: (email: string, password: string) => boolean;
    logout: () => void;

    // User Management (Admin only)
    registeredUsers: UserAccount[]; // In a real app, we wouldn't expose passwords, but for this MVP client-side store it's needed for management listing/checking
    registerUser: (user: UserAccount) => void;
    removeUser: (email: string) => void;

    // Data
    clients: Client[];
    addClient: (client: Omit<Client, "id">) => void;
    updateClient: (id: string, updates: Partial<Client>) => void;
    deleteClient: (id: string) => void;

    // Loading state (for hydration)
    isLoaded: boolean;
}

// --- Hardcoded Initial Master Credentials ---
const MASTER_EMAIL = "juanestevam19@outlook.com";
const MASTER_PASS = "Juan19022003@#";

// --- Context ---

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Load from Supabase
    useEffect(() => {
        async function loadData() {
            try {
                // 1. Check if we have a session in localStorage for the CURRENT user object (not data)
                const savedUser = localStorage.getItem("ias_user");
                if (savedUser) {
                    try { setUser(JSON.parse(savedUser)); } catch (e) { }
                }

                // 2. Fetch Clients
                const { data: clientsData, error: clientsError } = await supabase
                    .from("clientes")
                    .select("*")
                    .order("name", { ascending: true });

                if (clientsError) throw clientsError;

                // Map snake_case from DB to camelCase in app
                const formattedClients = (clientsData || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    webhookUrl: c.webhook_url,
                    webhookPostagens: c.webhook_postagens,
                    columns: c.columns
                }));
                setClients(formattedClients);

                // 3. Fetch Registered Users
                const { data: usersData, error: usersError } = await supabase
                    .from("usuarios")
                    .select("*")
                    .order("email", { ascending: true });

                if (usersError) throw usersError;
                setRegisteredUsers(usersData || []);

            } catch (error) {
                console.error("Error loading Supabase data:", error);
            } finally {
                setIsLoaded(true);
            }
        }
        loadData();
    }, []);

    // Persist session only (not the whole DB)
    useEffect(() => {
        if (isLoaded) {
            if (user) {
                localStorage.setItem("ias_user", JSON.stringify(user));
            } else {
                localStorage.removeItem("ias_user");
            }
        }
    }, [user, isLoaded]);

    // Auth Actions
    const login = (email: string, pass: string) => {
        const foundUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);

        if (foundUser) {
            const { password, ...safeUser } = foundUser;
            setUser(safeUser);
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
    };

    // User Management Actions
    const registerUser = async (newUser: UserAccount) => {
        if (registeredUsers.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
            alert("Email já cadastrado!");
            return;
        }

        const { error } = await supabase
            .from("usuarios")
            .insert([newUser]);

        if (error) {
            alert("Erro ao cadastrar: " + error.message);
            return;
        }

        setRegisteredUsers(prev => [...prev, newUser]);
    };

    const removeUser = async (email: string) => {
        const { error } = await supabase
            .from("usuarios")
            .delete()
            .eq("email", email);

        if (error) {
            alert("Erro ao remover: " + error.message);
            return;
        }

        setRegisteredUsers(prev => prev.filter(u => u.email !== email));
    };

    // Client Actions
    const addClient = async (data: Omit<Client, "id">) => {
        const { data: inserted, error } = await supabase
            .from("clientes")
            .insert([{
                name: data.name,
                webhook_url: data.webhookUrl,
                webhook_postagens: data.webhookPostagens,
                columns: data.columns
            }])
            .select();

        if (error) {
            alert("Erro ao adicionar cliente: " + error.message);
            return;
        }

        const newClient: Client = {
            id: inserted[0].id,
            name: inserted[0].name,
            webhookUrl: inserted[0].webhook_url,
            webhookPostagens: inserted[0].webhook_postagens,
            columns: inserted[0].columns
        };

        setClients((prev) => [...prev, newClient]);
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        // Map camelCase to snake_case for DB
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
        if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
        if (updates.columns) dbUpdates.columns = updates.columns;

        const { error } = await supabase
            .from("clientes")
            .update(dbUpdates)
            .eq("id", id);

        if (error) {
            alert("Erro ao atualizar cliente: " + error.message);
            return;
        }

        setClients((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const deleteClient = async (id: string) => {
        const { error } = await supabase
            .from("clientes")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Erro ao deletar cliente: " + error.message);
            return;
        }

        setClients((prev) => prev.filter((c) => c.id !== id));
    };

    return (
        <StoreContext.Provider
            value={{
                user,
                login,
                logout,
                registeredUsers,
                registerUser,
                removeUser,
                clients,
                addClient,
                updateClient,
                deleteClient,
                isLoaded,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return context;
}
