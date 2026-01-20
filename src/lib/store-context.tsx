"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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

export type ColumnType = "text" | "image";

export interface ColumnDefinition {
    id: string;
    name: string;
    type: ColumnType;
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

    // Load from LocalStorage on mount
    useEffect(() => {
        const savedClients = localStorage.getItem("ias_clients");
        const savedUser = localStorage.getItem("ias_user");
        const savedUsersList = localStorage.getItem("ias_registered_users");

        if (savedClients) {
            try { setClients(JSON.parse(savedClients)); } catch (e) { console.error("Failed to parse clients", e); }
        }

        if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch (e) { console.error("Failed to parse user", e); }
        }

        if (savedUsersList) {
            try {
                setRegisteredUsers(JSON.parse(savedUsersList));
            } catch (e) { console.error("Failed to parse registered users", e); }
        } else {
            // First time load: Create Default Master User
            setRegisteredUsers([{
                email: MASTER_EMAIL,
                password: MASTER_PASS,
                role: "master",
                name: "Admin"
            }]);
        }

        setIsLoaded(true);
    }, []);

    // Persist Data
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("ias_clients", JSON.stringify(clients));
            localStorage.setItem("ias_registered_users", JSON.stringify(registeredUsers));

            if (user) {
                localStorage.setItem("ias_user", JSON.stringify(user));
            } else {
                localStorage.removeItem("ias_user");
            }
        }
    }, [clients, registeredUsers, user, isLoaded]);

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
    const registerUser = (newUser: UserAccount) => {
        if (registeredUsers.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
            alert("Email já cadastrado!");
            return;
        }
        setRegisteredUsers(prev => [...prev, newUser]);
    };

    const removeUser = (email: string) => {
        setRegisteredUsers(prev => prev.filter(u => u.email !== email));
    };

    // Client Actions
    const addClient = (data: Omit<Client, "id">) => {
        const newClient: Client = {
            ...data,
            id: crypto.randomUUID(),
        };
        setClients((prev) => [...prev, newClient]);
    };

    const updateClient = (id: string, updates: Partial<Client>) => {
        setClients((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const deleteClient = (id: string) => {
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
