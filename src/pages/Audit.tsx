import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScrollText, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Profile } from '@/types';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  timestamp: string;
  details: any;
  point_id?: string;
  ip_address?: string;
  profiles?: { first_name: string | null; email: string | null };
}

const PAGE_SIZE = 10;

const fetchAuditLogs = async (page: number, pageSize: number): Promise<{ logs: AuditLog[], total: number }> => {
  const { data, error, count } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles(first_name, email)
    `, { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw error;
  return { logs: data as AuditLog[] || [], total: count || 0 };
};

const getActionBadge = (action: string) => {
  switch (action) {
    case 'ponto_registrado': return <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">Ponto Registrado</Badge>;
    case 'face_verification_attempt': return <Badge variant="secondary">Verificação Facial</Badge>;
    case 'perfil_atualizado': return <Badge variant="outline">Perfil Atualizado</Badge>;
    default: return <Badge variant="secondary">{action}</Badge>;
  }
};

const Audit = () => {
  const { user } = useAuth() as { user: Profile | null };
  const [currentPage, setCurrentPage] = useState(1);
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["auditLogs", currentPage],
    queryFn: () => fetchAuditLogs(currentPage, PAGE_SIZE),
    enabled: !!user,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  const renderLogDetails = (details: any) => {
    if (!details) return 'N/A';
    
    // Exemplo de tratamento para logs de verificação facial
    if (details.match !== undefined) {
      return (
        <span className="text-xs text-muted-foreground">
          Match: {details.match ? 'Sim' : 'Não'} | Confiança: {(details.confidence * 100).toFixed(0)}%
        </span>
      );
    }
    
    // Exemplo de tratamento para logs de atualização de perfil
    if (details.updated_fields) {
      return (
        <span className="text-xs text-muted-foreground">
          Campos atualizados: {details.updated_fields.join(', ')}
        </span>
      );
    }

    return JSON.stringify(details);
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <div className="text-left text-muted-foreground py-8">
          Nenhum log de auditoria encontrado.
        </div>
      );
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Data/Hora</TableHead>
                {isGestorOrAdmin && <TableHead>Colaborador</TableHead>}
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-card-foreground">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </TableCell>
                  {isGestorOrAdmin && (
                    <TableCell className="text-card-foreground">
                      {log.profiles?.first_name || log.profiles?.email || log.user_id}
                    </TableCell>
                  )}
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {renderLogDetails(log.details)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.ip_address || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-base truncate text-card-foreground">
                    {isGestorOrAdmin ? (log.profiles?.first_name || log.profiles?.email || 'Usuário') : 'Minha Atividade'}
                  </p>
                  {getActionBadge(log.action)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </p>
                <div className="text-xs text-muted-foreground pt-1">
                  Detalhes: {renderLogDetails(log.details)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Auditoria de Registros</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isGestorOrAdmin 
            ? "Monitoramento de todas as ações do sistema, incluindo registros de ponto e verificações faciais."
            : "Seu histórico de atividades e registros de ponto."
          }
        </p>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-card-foreground">Logs de Atividade</CardTitle>
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {renderTableContent()}
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Audit;