import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import type { Profile } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // PGRST116: row not found. This is expected if the profile hasn't been created yet (race condition)
        if (error.code === "PGRST116") {
          console.warn(`[Auth] Profile not found for user ${userId}. This might be a race condition after signup.`);
          setUser(null);
        } else {
          // Logamos o erro 500 aqui para ver o que o Supabase está retornando
          console.error(`[Auth] Critical error fetching profile for user ${userId}:`, error);
          setUser(null);
        }
        setProfileLoading(false);
        return;
      }
      
      const normalizedProfile = profile ? { 
        ...profile, 
        role: (profile.role || 'colaborador').trim().toLowerCase() as Profile['role']
      } : null;
      
      console.log(`[Auth] Profile loaded for ${userId}. Role: ${normalizedProfile?.role}`);
      setUser(normalizedProfile);
    } catch (err) {
      console.error("[Auth] General error during profile fetch:", err);
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // Adicionando tratamento de erro na chamada inicial
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user?.id) {
          fetchProfile(session.user.id);
        }
      })
      .catch((err) => {
        console.error("[Auth] Failed to get initial session:", err);
        // Se falhar, garantimos que o loading termine para que a UI possa prosseguir
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setLoading(false);
        
        if (session?.user?.id) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfileLoading(false);
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!session, 
      user, 
      session, 
      loading,
      profileLoading,
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