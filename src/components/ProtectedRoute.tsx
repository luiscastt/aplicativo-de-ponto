"use client";

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
    // Redirect unauthenticated users to login
    return <Navigate to="/login" replace />;
  }

  // Se a autenticação existe, mas o perfil falhou ao carregar (user é null), 
  // forçamos o logout por segurança e para evitar loops.
  if (!user) {
    console.error("[ProtectedRoute] User is authenticated but profile is missing or failed to load. Forcing sign out.");
    signOut();
    toast({
      variant: "destructive",
      title: "Erro de Perfil",
      description: "Não foi possível carregar seu perfil. Por favor, faça login novamente.",
    });
    return <Navigate to="/login" replace />;
  }

  const isGestorOrAdmin = user.role === 'gestor' || user.role === 'admin';
  
  console.log(`[ProtectedRoute] User Role: ${user.role}. Is Gestor/Admin: ${isGestorOrAdmin}`);

  if (!isGestorOrAdmin) {
    // Se o usuário for um colaborador, ele não deve acessar o Painel Web.
    // Forçamos o logout e redirecionamos para o login.
    signOut();
    toast({
      variant: "destructive",
      title: "Acesso Negado",
      description: "Apenas gestores e administradores podem acessar o Painel Web.",
    });
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;