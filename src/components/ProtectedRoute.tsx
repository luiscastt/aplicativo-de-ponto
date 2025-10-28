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

  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';

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