"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { verifyLoginAction, loadInitialDataAction } from "@/app/actions";
import { 
    addClientAction, 
    updateClientAction, 
    deleteClientAction,
    addSoldClientAction, 
    updateSoldClientAction, 
    deleteSoldClientAction,
    addLayoutClientAction,
    updateLayoutClientAction,
    deleteLayoutClientAction,
    registerUserAction,
    removeUserAction
} from "@/app/actions/clients";

// --- Types ---

export type UserRole = "master" | "common";

export interface User {
    id?: string;
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
    webhookPostagens?: string;
    prompt?: string;
    columns: ColumnDefinition[];
    captionTemplate?: string;
    facebookId?: string;
    instagramId?: string;
    token?: string;
    jsonFeed?: string;
    jsonStories?: string;
}

export interface LayoutClient {
    id: string;
    name: string;
    webhookUrl: string;
    webhookPostagens?: string;
    prompt?: string;
    columns: ColumnDefinition[];
    instagramUserId?: string;
    instagramToken?: string;
    facebookUserId?: string;
    facebookToken?: string;
    modeloFeedId?: string;
    modeloStoriesId?: string;
    jsonCliente: any;
}

interface StoreContextType {
    // Auth
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

    // Layout Clients
    layoutClients: LayoutClient[];
    addLayoutClient: (client: Omit<LayoutClient, "id">) => Promise<void>;
    updateLayoutClient: (id: string, updates: Partial<LayoutClient>) => Promise<void>;
    deleteLayoutClient: (id: string) => Promise<void>;

    // Sold Clients
    soldClients: Client[];
    addSoldClient: (client: Omit<Client, "id">) => Promise<void>;
    updateSoldClient: (id: string, updates: Partial<Client>) => Promise<void>;
    deleteSoldClient: (id: string) => Promise<void>;

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
    const [layoutClients, setLayoutClients] = useState<LayoutClient[]>([]);
    const [soldClients, setSoldClients] = useState<Client[]>([]);
    const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Load from Supabase
    useEffect(() => {
        async function loadData() {
            try {
                // 1. Check session in localStorage
                const savedUser = localStorage.getItem("ias_user");
                if (savedUser) {
                    try { setUser(JSON.parse(savedUser)); } catch (e) { }
                }

                // 2. Fetch all data using Server Action (bypasses client DNS issues)
                const result = await loadInitialDataAction();

                if (!result.success) {
                    throw new Error(result.error);
                }

                const { clients: clientsData, registeredUsers: usersData, layoutClients: layoutData, soldClients: soldData } = result.data!;

                // Map snake_case to camelCase for clients
                const formattedClients = (clientsData || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    webhookUrl: c.webhook_url,
                    webhookPostagens: c.webhook_postagens,
                    prompt: c.prompt,
                    columns: c.columns,
                    captionTemplate: c.caption_template,
                    facebookId: c.id_facebook,
                    instagramId: c.id_instagram,
                    token: c.token
                }));
                setClients(formattedClients);

                // Set users
                setRegisteredUsers(usersData || []);

                // Map layouts
                const formattedLayouts = (layoutData || []).map((l: any) => ({
                    id: l.id,
                    name: l.nome_cliente,
                    webhookUrl: l.webhook_url,
                    webhookPostagens: l.webhook_postagens,
                    prompt: l.prompt,
                    columns: l.columns || [],
                    instagramUserId: l.instagram_user_id,
                    instagramToken: l.instagram_token,
                    facebookUserId: l.facebook_user_id,
                    facebookToken: l.facebook_token,
                    modeloFeedId: l.modelo_feed_id,
                    modeloStoriesId: l.modelo_stories_id,
                    jsonCliente: l.json_cliente
                }));
                setLayoutClients(formattedLayouts);

                // Map sold clients
                const formattedSold = (soldData || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    webhookUrl: c.webhook_url,
                    webhookPostagens: c.webhook_postagens,
                    prompt: c.prompt,
                    columns: c.columns,
                    captionTemplate: c.caption_template,
                    facebookId: c.id_facebook,
                    instagramId: c.id_instagram,
                    token: c.token,
                    jsonFeed: c.json_feed,
                    jsonStories: c.json_stories
                }));
                setSoldClients(formattedSold);

            } catch (error) {
                console.error("Error loading data via Server Action:", error);
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
    const login = async (email: string, pass: string) => {
        try {
            // First try Server Action (Proxy)
            const result = await verifyLoginAction(email, pass);

            if (result.success && result.user) {
                setUser(result.user);
                return { success: true };
            }

            // Fallback: Check in memory if Server Action failed but data was somehow pre-loaded
            const foundInMemory = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
            if (foundInMemory) {
                const { password, ...safeUser } = foundInMemory;
                setUser(safeUser);
                return { success: true };
            }

            return { success: false, error: result.error || "Credenciais inválidas." };
        } catch (e) {
            console.error("Login Error:", e);
            return { success: false, error: "Erro na comunicação com o servidor." };
        }
    };

    const logout = () => {
        setUser(null);
    };

    // User Management Actions
    const registerUser = async (data: any) => {
        const result = await registerUserAction(data);
        if (!result.success) {
            alert("Erro ao cadastrar usuário via servidor.");
            return;
        }
        setRegisteredUsers((prev) => [...prev, data]);
    };

    const removeUser = async (email: string) => {
        const result = await removeUserAction(email);
        if (!result.success) {
            alert("Erro ao remover usuário via servidor.");
            return;
        }
        setRegisteredUsers((prev) => prev.filter((u) => u.email !== email));
    };

    // Client Actions
    const addClient = async (data: Omit<Client, "id">) => {
        const result = await addClientAction(data);
        if (!result.success) {
            alert("Erro ao adicionar cliente via servidor.");
            return;
        }

        const newClient: Client = {
            id: result.data.id,
            name: result.data.name,
            webhookUrl: result.data.webhook_url,
            webhookPostagens: result.data.webhook_postagens,
            prompt: result.data.prompt,
            columns: result.data.columns,
            captionTemplate: result.data.caption_template,
            facebookId: result.data.id_facebook,
            instagramId: result.data.id_instagram,
            token: result.data.token
        };

        setClients((prev) => [...prev, newClient]);
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        const result = await updateClientAction(id, updates);
        if (!result.success) {
            alert("Erro ao atualizar cliente via servidor.");
            return;
        }

        setClients((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const deleteClient = async (id: string) => {
        const result = await deleteClientAction(id);
        if (!result.success) {
            alert("Erro ao deletar cliente via servidor.");
            return;
        }

        setClients((prev) => prev.filter((c) => c.id !== id));
    };

    // Layout Client Actions
    const addLayoutClient = async (data: Omit<LayoutClient, "id">) => {
        const result = await addLayoutClientAction(data);
        if (!result.success) {
            alert("Erro ao adicionar cliente de layout via servidor.");
            return;
        }

        const newClient: LayoutClient = {
            id: result.data.id,
            name: result.data.nome_cliente,
            webhookUrl: result.data.webhook_url,
            webhookPostagens: result.data.webhook_postagens,
            prompt: result.data.prompt,
            columns: result.data.columns || [],
            instagramUserId: result.data.instagram_user_id,
            instagramToken: result.data.instagram_token,
            facebookUserId: result.data.facebook_user_id,
            facebookToken: result.data.facebook_token,
            modeloFeedId: result.data.modelo_feed_id,
            modeloStoriesId: result.data.modelo_stories_id,
            jsonCliente: result.data.json_cliente
        };

        setLayoutClients((prev) => [...prev, newClient]);
    };

    const updateLayoutClient = async (id: string, updates: Partial<LayoutClient>) => {
        const result = await updateLayoutClientAction(id, updates);
        if (!result.success) {
            alert("Erro ao atualizar cliente de layout via servidor.");
            return;
        }

        setLayoutClients((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const deleteLayoutClient = async (id: string) => {
        const result = await deleteLayoutClientAction(id);
        if (!result.success) {
            alert("Erro ao deletar cliente de layout via servidor.");
            return;
        }

        setLayoutClients((prev) => prev.filter((c) => c.id !== id));
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
                layoutClients,
                addLayoutClient,
                updateLayoutClient,
                deleteLayoutClient,
                soldClients,
                addSoldClient: async (data) => {
                    const result = await addSoldClientAction(data);
                    if (!result.success) {
                        alert("Erro ao adicionar cliente vendido via servidor.");
                        return;
                    }

                    const newClient: Client = {
                        id: result.data.id,
                        name: result.data.name,
                        webhookUrl: result.data.webhook_url,
                        webhookPostagens: result.data.webhook_postagens,
                        prompt: result.data.prompt,
                        columns: result.data.columns,
                        captionTemplate: result.data.caption_template,
                        facebookId: result.data.id_facebook,
                        instagramId: result.data.id_instagram,
                        token: result.data.token,
                        jsonFeed: result.data.json_feed,
                        jsonStories: result.data.json_stories
                    };

                    setSoldClients((prev) => [...prev, newClient]);
                },
                updateSoldClient: async (id, updates) => {
                    const result = await updateSoldClientAction(id, updates);
                    if (!result.success) {
                        alert("Erro ao atualizar cliente vendido via servidor.");
                        return;
                    }

                    setSoldClients((prev) =>
                        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
                    );
                },
                deleteSoldClient: async (id) => {
                    const result = await deleteSoldClientAction(id);
                    if (!result.success) {
                        alert("Erro ao deletar cliente vendido via servidor.");
                        return;
                    }
                    setSoldClients((prev) => prev.filter((c) => c.id !== id));
                },
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
