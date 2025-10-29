import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user, profileLoading, signOut } = useAuth();
  const { toast } = useToast();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';

  // Se autenticado, mas o perfil falhou ou o role é inadequado, forçamos o logout e redirecionamos.
  // Usamos um bloco de renderização condicional para evitar o useEffect e garantir a velocidade.
  if (!user || !isGestorOrAdmin) {
    // Se o usuário não for gestor/admin, ou se o perfil falhou, forçamos o logout.
    // Nota: O `signOut` é assíncrono, mas o redirecionamento é imediato.
    if (user && !isGestorOrAdmin) {
      console.log(`[ProtectedRoute] User Role: ${user.role}. Access denied. Forcing sign out.`);
      // Disparar signOut sem esperar, e notificar o usuário
      signOut().then(() => {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Apenas gestores e administradores podem acessar o Painel Web.",
        });
      }).catch(err => console.error("Sign out failed:", err));
    } else if (!user) {
      console.error("[ProtectedRoute] User is authenticated but profile is missing. Forcing sign out.");
      signOut().then(() => {
        toast({
          variant: "destructive",
          title: "Erro de Perfil",
          description: "Não foi possível carregar seu perfil. Por favor, faça login novamente.",
        });
      }).catch(err => console.error("Sign out failed:", err));
    }
    
    // Redireciona imediatamente para o login
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;