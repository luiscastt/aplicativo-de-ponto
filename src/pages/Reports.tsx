import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import { BarChart3 } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';

  if (!isGestorOrAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-red-500">
            <p>Acesso negado. Apenas gestores e admins podem visualizar relatórios.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold">Relatórios de Ponto</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aqui serão exibidos gráficos e tabelas de relatórios de ponto.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;