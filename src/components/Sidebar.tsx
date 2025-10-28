"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Clock, MapPin, Camera, Settings, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile); // Aberto por default em desktop

  const menuItems = [
    { path: "/dashboard", icon: Clock, label: "Dashboard" },
    { path: "/reports", icon: MapPin, label: "Relatórios" },
    { path: "/audit", icon: Camera, label: "Auditoria" },
    { path: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className={`bg-white shadow-md transition-all duration-300 ${isOpen ? 'w-64 p-4' : 'w-0 p-0 overflow-hidden'}`}>
      {isOpen && (
        <>
          <h2 className="text-xl font-bold mb-4">Painel de Ponto</h2>
          <ul className="space-y-2 mb-8">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Button
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="destructive" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </>
      )}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Fechar" : "Menu"}
        </Button>
      )}
    </div>
  );
};

export default Sidebar;