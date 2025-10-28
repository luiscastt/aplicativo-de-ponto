import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';

const Reports = () => {
  // O acesso já é garantido pelo ProtectedRoute para gestores/admins.

  return (
    <div className="p-4 sm:p-0">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios de Ponto</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-card-foreground">Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aqui serão exibidos gráficos e tabelas de relatórios de ponto.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;