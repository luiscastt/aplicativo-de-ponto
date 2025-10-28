"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Clock, MapPin, Camera, Settings, Users, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, profileLoading } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  // Re-render and log when user or loading changes
  useEffect(() => {
    console.log('[DEBUG Sidebar] User updated:', user);
    console.log('[DEBUG Sidebar] Profile loading:', profileLoading);
    
    if (user) {
      const normalizedRole = (user.role || '').trim().toLowerCase();
      console.log('[DEBUG Sidebar] Role analysis:', {
        raw: user.role,
        normalized: normalizedRole,
        isGestor: normalizedRole === 'gestor',
        isAdmin: normalizedRole === 'admin'
      });
    }
  }, [user, profileLoading]);

  const normalizedRole = (user?.role || '').trim().toLowerCase();
  const isGestorOrAdmin = normalizedRole === "gestor" || normalizedRole === "admin";
  
  console.log('[DEBUG Sidebar] Final checks:', {
    role: normalizedRole,
    isGestorOrAdmin,
    userExists: !!user,
    profileLoading
  });

  const menuItems = [
    { path: "/dashboard", icon: Clock, label: "Dashboard" },
    { path: "/reports", icon: MapPin, label: "Relatórios" },
    ...(isGestorOrAdmin && user ? [
      { path: "/users", icon: Users, label: "Usuários" }
    ] : []),
    { path: "/audit", icon: Camera, label: "Auditoria" },
    ...(isGestorOrAdmin && user ? [
      { path: "/settings", icon: Settings, label: "Configurações" }
    ] : []),
  ];

  console.log('[DEBUG Sidebar] Generated menu items:', menuItems.map(item => item.label));

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  if (profileLoading) {
    return (
      <div className="bg-white shadow-md w-64 p-4 flex items-center justify-center">
        <div className="text-sm text-gray-500">Carregando menu...</div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white shadow-md transition-all duration-300 ${
        isOpen ? 'w-64 p-4' : 'w-0 p-0 overflow-hidden'
      }`}>
        {isOpen && (
          <>
            {/* Debug badge - REMOVE AFTER TESTING */}
            {process.env.NODE_ENV === 'development' && user && (
              <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <strong>DEBUG Role:</strong> {user.role} 
                <Badge variant={isGestorOrAdmin ? "default" : "secondary"} className="ml-2">
                  {isGestorOrAdmin ? 'Gestor/Admin' : 'Colaborador'}
                </Badge>
              </div>
            )}
            
            <h2 className="text-xl font-bold mb-4">Painel de Ponto</h2>
            <ul className="space-y-2 mb-8">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    onClick={() => handleNav(item.path)}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="destructive" onClick={signOut} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </>
        )}
      </div>
      
      {/* Mobile toggle */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 left-4 z-50 bg-white shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Fechar" : "Menu"}
        </Button>
      )}
    </>
  );
};

export default Sidebar;