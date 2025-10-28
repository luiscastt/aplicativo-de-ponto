import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Eye } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";

// Fetch audit logs with joins
const fetchAuditLogs = async () => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles!inner(first_name, last_name, email),
      points!inner(type, timestamp, status)
    `)
    .order('timestamp', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
};

const Audit = () => {
  const { user } = useAuth();
  const isGestor = user?.role === "gestor" || user?.role === "admin";

  const { data: logs, isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: fetchAuditLogs,
    enabled: isGestor, // Só gestores veem todos; colaboradores só próprios (RLS cuida)
  });

  if (isLoading) return <div className="p-8">Carregando logs...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Auditoria e Logs</h1>
          <p className="text-gray-600">Trilha automática de registros de pontos.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Logs Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Log</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Status Ponto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.id.slice(-8)}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{`${log.profiles.first_name} ${log.profiles.last_name || ''}`.trim() || log.profiles.email}</TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="max-w-xs">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.points?.status === "aprovado" ? "default" : "secondary"}>
                        {log.points?.status || 'N/A'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" className="mt-4" disabled={!isGestor}>
              <Eye className="mr-2 h-4 w-4" /> Exportar Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Audit;