"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Clock, MapPin, Camera, Settings, Users, LogOut, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, profileLoading } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  useEffect(() => {
    // Fecha a sidebar automaticamente ao mudar para desktop
    if (!isMobile) {
      setIsOpen(true);
    }
  }, [isMobile]);

  const normalizedRole = (user?.role || '').trim().toLowerCase();
  const isGestorOrAdmin = normalizedRole === "gestor" || normalizedRole === "admin";
  
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
      {/* Sidebar Desktop/Mobile */}
      <div className={`
        bg-sidebar shadow-md transition-all duration-300 
        ${isMobile ? 'fixed top-0 left-0 h-full z-40' : 'sticky top-0 h-screen'}
        ${isOpen ? 'w-64 p-4' : 'w-0 p-0 overflow-hidden'}
      `}>
        {isOpen && (
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-bold mb-6 text-sidebar-primary">Painel de Ponto</h2>
            <ul className="space-y-2 flex-grow">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    onClick={() => handleNav(item.path)}
                    className={`w-full justify-start ${isActive(item.path) ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4 border-t border-sidebar-border">
              <div className="text-sm text-sidebar-foreground mb-2 truncate">
                {user?.first_name || user?.email}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {user?.role}
                </Badge>
              </div>
              <Button variant="destructive" onClick={signOut} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile toggle button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Overlay para fechar no mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;