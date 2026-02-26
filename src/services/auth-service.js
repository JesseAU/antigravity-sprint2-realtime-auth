import { supabase } from '../lib/supabase/client';
import { authLogger } from '../lib/utils/debug-logger';

export const AuthService = {
    // Sign In
    async signIn(email, password) {
        authLogger.info('AuthService: Attempting Sign In', { email });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            authLogger.info('AuthService: Sign In SUCCESS', { userId: data.user.id });
            return { success: true, data };
        } catch (error) {
            authLogger.error('AuthService: Sign In FAILED', error);
            return { success: false, error: error.message };
        }
    },

    // Sign Up
    async signUp(email, password, username) {
        authLogger.info('AuthService: Attempting Sign Up', { email, username });
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username.trim(),
                    },
                },
            });
            if (error) throw error;
            authLogger.info('AuthService: Sign Up SUCCESS', { userId: data.user?.id });
            return { success: true, data };
        } catch (error) {
            authLogger.error('AuthService: Sign Up FAILED', error);
            return { success: false, error: error.message };
        }
    },

    // Sign Out
    async signOut() {
        authLogger.info('AuthService: Signing Out');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            authLogger.error('AuthService: Sign Out ERROR', error);
            return { success: false, error: error.message };
        }
    },

    // Get Current Session
    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            authLogger.error('AuthService: Error getting session', error);
            return null;
        }
    },

    // Get Current User (Refreshed from server)
    async getUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                authLogger.warn('AuthService: No authenticated user found');
                return null;
            }
            return user;
        } catch (error) {
            authLogger.error('AuthService: Error getting user', error);
            return null;
        }
    },

    // Subscribe to Auth Changes
    onAuthChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            authLogger.info(`AuthService: Auth event detected: ${event}`, { session: !!session });
            callback(event, session);
        });
    }
};
