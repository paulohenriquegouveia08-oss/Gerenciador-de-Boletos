import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';

const USERNAME_DOMAIN = 'boletos.app';

function usernameToEmail(username: string): string {
    return `${username.toLowerCase().trim()}@${USERNAME_DOMAIN}`;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (username: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (username: string, password: string) => {
        const email = usernameToEmail(username);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
    };

    const signUp = async (username: string, password: string) => {
        const email = usernameToEmail(username);
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
