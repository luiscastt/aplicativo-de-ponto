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

  const fetchProfile = async (userId: string, retryCount = 0) => {
    console.log(`[DEBUG] Fetching profile for user ID: ${userId} (retry ${retryCount})`);
    setProfileLoading(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[DEBUG] Profile fetch error:', error);
        setUser(null);
        setProfileLoading(false);
        
        if (retryCount < 3 && error.code === 'PGRST116') {
          console.log('[DEBUG] Retrying profile fetch in 1s...');
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
        }
        return;
      }
      
      const normalizedProfile = profile ? { 
        ...profile, 
        role: (profile.role || 'colaborador').trim().toLowerCase() 
      } : null;
      
      console.log('[DEBUG] Profile fetched successfully:', normalizedProfile);
      setUser(normalizedProfile);
    } catch (err) {
      console.error('[DEBUG] Unexpected profile fetch error:', err);
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[DEBUG] Initial session:', !!session);
      setSession(session);
      setLoading(false);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[DEBUG] Auth event: ${event}, session: ${!!session}`);
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

  console.log('[DEBUG] Auth state:', { 
    isAuthenticated: !!session, 
    userRole: user?.role, 
    profileLoading 
  });

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