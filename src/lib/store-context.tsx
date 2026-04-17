"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { verifyLoginAction, loadInitialDataAction } from "@/app/actions";

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
                prompt: data.prompt,
                columns: data.columns,
                caption_template: data.captionTemplate,
                id_facebook: data.facebookId,
                id_instagram: data.instagramId,
                token: data.token,
                json_feed: data.jsonFeed,
                json_stories: data.jsonStories
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
            prompt: inserted[0].prompt,
            columns: inserted[0].columns,
            captionTemplate: inserted[0].caption_template,
            facebookId: inserted[0].id_facebook,
            instagramId: inserted[0].id_instagram,
            token: inserted[0].token
        };

        setClients((prev) => [...prev, newClient]);
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        // Map camelCase to snake_case for DB
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
        if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
        if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
        if (updates.columns) dbUpdates.columns = updates.columns;
        if (updates.captionTemplate !== undefined) dbUpdates.caption_template = updates.captionTemplate;
        if (updates.facebookId !== undefined) dbUpdates.id_facebook = updates.facebookId;
        if (updates.instagramId !== undefined) dbUpdates.id_instagram = updates.instagramId;
        if (updates.token !== undefined) dbUpdates.token = updates.token;

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

    // Layout Client Actions
    const addLayoutClient = async (data: Omit<LayoutClient, "id">) => {
        const dbData = {
            nome_cliente: data.name,
            webhook_url: data.webhookUrl,
            webhook_postagens: data.webhookPostagens,
            prompt: data.prompt,
            columns: data.columns,
            instagram_user_id: data.instagramUserId,
            instagram_token: data.instagramToken,
            facebook_user_id: data.facebookUserId,
            facebook_token: data.facebookToken,
            modelo_feed_id: data.modeloFeedId,
            modelo_stories_id: data.modeloStoriesId,
            json_cliente: data.jsonCliente
        };

        const { data: inserted, error } = await supabase
            .from("design_online_layouts_clientes")
            .insert([dbData])
            .select();

        if (error) {
            alert("Erro ao adicionar cliente de layout: " + error.message);
            return;
        }

        const newClient: LayoutClient = {
            id: inserted[0].id,
            name: inserted[0].nome_cliente,
            webhookUrl: inserted[0].webhook_url,
            webhookPostagens: inserted[0].webhook_postagens,
            prompt: inserted[0].prompt,
            columns: inserted[0].columns || [],
            instagramUserId: inserted[0].instagram_user_id,
            instagramToken: inserted[0].instagram_token,
            facebookUserId: inserted[0].facebook_user_id,
            facebookToken: inserted[0].facebook_token,
            modeloFeedId: inserted[0].modelo_feed_id,
            modeloStoriesId: inserted[0].modelo_stories_id,
            jsonCliente: inserted[0].json_cliente
        };

        setLayoutClients((prev) => [...prev, newClient]);
    };

    const updateLayoutClient = async (id: string, updates: Partial<LayoutClient>) => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.nome_cliente = updates.name;
        if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
        if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
        if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
        if (updates.columns) dbUpdates.columns = updates.columns;
        if (updates.instagramUserId) dbUpdates.instagram_user_id = updates.instagramUserId;
        if (updates.instagramToken) dbUpdates.instagram_token = updates.instagramToken;
        if (updates.facebookUserId) dbUpdates.facebook_user_id = updates.facebookUserId;
        if (updates.facebookToken) dbUpdates.facebook_token = updates.facebookToken;
        if (updates.modeloFeedId) dbUpdates.modelo_feed_id = updates.modeloFeedId;
        if (updates.modeloStoriesId) dbUpdates.modelo_stories_id = updates.modeloStoriesId;
        if (updates.jsonCliente) dbUpdates.json_cliente = updates.jsonCliente;

        const { error } = await supabase
            .from("design_online_layouts_clientes")
            .update(dbUpdates)
            .eq("id", id);

        if (error) {
            alert("Erro ao atualizar cliente de layout: " + error.message);
            return;
        }

        setLayoutClients((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const deleteLayoutClient = async (id: string) => {
        const { error } = await supabase
            .from("design_online_layouts_clientes")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Erro ao deletar cliente de layout: " + error.message);
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
                    const { data: inserted, error } = await supabase
                        .from("clientes_vendidos")
                        .insert([{
                            name: data.name,
                            webhook_url: data.webhookUrl,
                            webhook_postagens: data.webhookPostagens,
                            prompt: data.prompt,
                            columns: data.columns,
                            caption_template: data.captionTemplate,
                            id_facebook: data.facebookId,
                            id_instagram: data.instagramId,
                            token: data.token,
                            json_feed: data.jsonFeed,
                            json_stories: data.jsonStories
                        }])
                        .select();

                    if (error) {
                        alert("Erro ao adicionar cliente vendido: " + error.message);
                        return;
                    }

                    const newClient: Client = {
                        id: inserted[0].id,
                        name: inserted[0].name,
                        webhookUrl: inserted[0].webhook_url,
                        webhookPostagens: inserted[0].webhook_postagens,
                        prompt: inserted[0].prompt,
                        columns: inserted[0].columns,
                        captionTemplate: inserted[0].caption_template,
                        facebookId: inserted[0].id_facebook,
                        instagramId: inserted[0].id_instagram,
                        token: inserted[0].token,
                        jsonFeed: inserted[0].json_feed,
                        jsonStories: inserted[0].json_stories
                    };
                    setSoldClients((prev) => [...prev, newClient]);
                },
                updateSoldClient: async (id, updates) => {
                    const dbUpdates: any = {};
                    if (updates.name) dbUpdates.name = updates.name;
                    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
                    if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
                    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
                    if (updates.columns) dbUpdates.columns = updates.columns;
                    if (updates.captionTemplate !== undefined) dbUpdates.caption_template = updates.captionTemplate;
                    if (updates.facebookId !== undefined) dbUpdates.id_facebook = updates.facebookId;
                    if (updates.instagramId !== undefined) dbUpdates.id_instagram = updates.instagramId;
                    if (updates.token !== undefined) dbUpdates.token = updates.token;
                    if (updates.jsonFeed !== undefined) dbUpdates.json_feed = updates.jsonFeed;
                    if (updates.jsonStories !== undefined) dbUpdates.json_stories = updates.jsonStories;

                    const { error } = await supabase
                        .from("clientes_vendidos")
                        .update(dbUpdates)
                        .eq("id", id);

                    if (error) {
                        alert("Erro ao atualizar cliente vendido: " + error.message);
                        return;
                    }

                    setSoldClients((prev) =>
                        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
                    );
                },
                deleteSoldClient: async (id) => {
                    const { error } = await supabase
                        .from("clientes_vendidos")
                        .delete()
                        .eq("id", id);

                    if (error) {
                        alert("Erro ao deletar cliente vendido: " + error.message);
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
