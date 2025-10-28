"use client";

import React, { useEffect } from 'react';
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

  // Use useEffect para lidar com ações que alteram o estado (como signOut e toast)
  // após a renderização, evitando o loop.
  useEffect(() => {
    if (isAuthenticated && !profileLoading && !user) {
      console.error("[ProtectedRoute] User is authenticated but profile is missing or failed to load. Forcing sign out.");
      signOut();
      toast({
        variant: "destructive",
        title: "Erro de Perfil",
        description: "Não foi possível carregar seu perfil. Por favor, faça login novamente.",
      });
    } else if (isAuthenticated && user && user.role !== 'gestor' && user.role !== 'admin') {
      console.log(`[ProtectedRoute] User Role: ${user.role}. Access denied.`);
      signOut();
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Apenas gestores e administradores podem acessar o Painel Web.",
      });
    }
  }, [isAuthenticated, profileLoading, user, signOut, toast]);


  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Se não estiver autenticado ou se o perfil falhou (e o useEffect já chamou signOut), redireciona para o login.
    return <Navigate to="/login" replace />;
  }

  const isGestorOrAdmin = user.role === 'gestor' || user.role === 'admin';
  
  if (!isGestorOrAdmin) {
    // Se o usuário não for gestor/admin, o useEffect já chamou signOut. A próxima renderização
    // cairá no bloco acima e redirecionará para /login.
    // Por enquanto, mostramos o loader para evitar piscar a tela.
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;