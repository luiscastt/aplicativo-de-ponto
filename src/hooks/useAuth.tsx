import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Profile } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log(`[DEBUG] Fetching profile for user ID: ${userId}`);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[DEBUG] Error fetching profile:', error);
        // Tente refetch uma vez se erro for 403 (RLS issue)
        if (error.code === 'PGRST116' || error.message.includes('forbidden')) {
          console.log('[DEBUG] Retrying profile fetch...');
          setTimeout(() => fetchProfile(userId), 1000);
        }
        setUser(null);
        return;
      }
      
      // Trim e normalize role para evitar issues
      const normalizedProfile = profile ? { ...profile, role: (profile.role || '').trim().toLowerCase() } : null;
      console.log('[DEBUG] Profile fetched and normalized:', normalizedProfile);
      setUser(normalizedProfile);
    } catch (err) {
      console.error('[DEBUG] Fetch error:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[DEBUG] Auth event: ${event}`);
        setSession(session);
        setLoading(false);
        
        if (session?.user?.id) {
          await fetchProfile(session.user.id);
          // Extra check: Se user ainda null após 2s, refetch
          setTimeout(() => {
            if (!user) {
              console.log('[DEBUG] User still null, forcing refetch...');
              fetchProfile(session.user.id);
            }
          }, 2000);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  console.log('[DEBUG] Current auth state:', { isAuthenticated: !!session, userRole: user?.role });

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!session, 
      user, 
      session, 
      loading,
      signIn,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};