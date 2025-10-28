"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  
  // A Sidebar agora gerencia sua própria visibilidade e o layout principal
  // usa padding responsivo para acomodar o botão de menu mobile.
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 p-4 sm:p-8 md:ml-64 md:p-8">
        {/* Adicionando padding superior para evitar que o conteúdo fique atrás do botão de menu mobile */}
        <div className="pt-12 md:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;