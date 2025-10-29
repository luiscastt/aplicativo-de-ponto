"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Clock, BarChart3, Settings, Users, LogOut, Menu, ScrollText, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, profileLoading } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false); 

  useEffect(() => {
    // No desktop, a sidebar deve estar sempre aberta.
    if (!isMobile) {
      setIsOpen(true);
    } else {
      // No mobile, fechar ao carregar
      setIsOpen(false);
    }
  }, [isMobile]);
  
  const menuItems = [
    { path: "/dashboard", icon: Clock, label: "Dashboard" },
    { path: "/reports", icon: BarChart3, label: "Relatórios" },
    { path: "/users", icon: Users, label: "Usuários" },
    { path: "/audit", icon: ScrollText, label: "Auditoria" },
    { path: "/settings", icon: Settings, label: "Configurações" },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  if (profileLoading) {
    return (
      <div className={`
        bg-sidebar shadow-md transition-all duration-300 
        ${isMobile ? 'fixed top-0 left-0 h-full z-40 w-64 p-4' : 'sticky top-0 h-screen w-64 p-4'}
        hidden md:flex flex-col
      `}>
        <div className="text-sm text-sidebar-foreground">Carregando menu...</div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Desktop/Mobile */}
      <div className={`
        bg-sidebar shadow-xl transition-transform duration-300 ease-in-out
        fixed top-0 left-0 h-full z-40 flex-shrink-0
        md:sticky md:translate-x-0 md:w-64 md:p-4 md:border-r md:border-sidebar-border
        ${isMobile ? (isOpen ? 'w-64 translate-x-0 p-4' : 'w-0 -translate-x-full p-0') : 'w-64 p-4'}
      `}>
        <div className={`flex flex-col h-full ${isMobile && !isOpen ? 'hidden' : 'block'}`}>
          
          {/* Logo e Título */}
          <div className="mb-6 flex items-center space-x-2">
            {/* Referência atualizada para logo.png */}
            <img src="logo.png" alt="Logo da Empresa" className="h-10 w-auto object-contain" />
            <h2 className="text-xl font-bold text-sidebar-foreground">Painel de Ponto</h2>
          </div>
          
          <ul className="space-y-2 flex-grow">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  onClick={() => handleNav(item.path)}
                  className={`w-full justify-start 
                    ${isActive(item.path) 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-4 border-t border-sidebar-border">
            <div className="text-sm text-sidebar-foreground mb-2 truncate flex items-center">
              {user?.first_name || user?.email}
              <Badge 
                className="ml-2 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                {user?.role}
              </Badge>
            </div>
            {/* Usando variant="secondary" para o botão Sair (Azul Escuro) */}
            <Button variant="secondary" onClick={signOut} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile toggle button */}
      {isMobile && (
        <Button
          variant="default"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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