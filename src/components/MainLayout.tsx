"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  
  // O fundo principal agora é branco (bg-background)
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 p-4 sm:p-8 md:ml-64 md:p-8 bg-background">
        {/* Adicionando padding superior para evitar que o conteúdo fique atrás do botão de menu mobile */}
        <div className="pt-12 md:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;