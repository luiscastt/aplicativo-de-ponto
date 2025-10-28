"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'pt-16' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;