import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import { ScrollText } from 'lucide-react';

const Audit = () => {
  const { user } = useAuth();
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';

  return (
    <div className="p-4 sm:p-0">
      <div className="flex items-center space-x-3 mb-6">
        <ScrollText className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl sm:text-3xl font-bold">Auditoria de Registros</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Logs de Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {isGestorOrAdmin 
              ? "Aqui serão exibidos todos os logs de auditoria do sistema."
              : "Aqui serão exibidos seus logs de auditoria pessoal."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Audit;