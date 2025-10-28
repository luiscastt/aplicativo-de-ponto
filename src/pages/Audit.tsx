import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Eye } from "lucide-react";
import Sidebar from "@/components/Sidebar"; // Nova importação

// Mock data para logs de auditoria
const fetchAuditLogs = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    {
      id: "log1",
      userId: "123",
      action: "registro_ponto",
      timestamp: "2023-10-01T08:05:00Z",
      ip: "192.168.1.1",
      details: "Entrada aprovada via selfie",
      status: "sucesso" as const
    },
    {
      id: "log2",
      userId: "456",
      action: "ajuste_jornada",
      timestamp: "2023-10-01T18:10:00Z",
      ip: "192.168.1.2",
      details: "Aprovação de hora extra",
      status: "pendente" as const
    }
  ];
};

const Audit = () => {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: fetchAuditLogs,
  });

  if (isLoading) return <div className="p-8">Carregando logs...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Auditoria e Logs</h1>
          <p className="text-gray-600">Trilha de ações para conformidade.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Logs Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.id}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{log.ip}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "sucesso" ? "default" : "secondary"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" className="mt-4">
              <Eye className="mr-2 h-4 w-4" /> Visualizar Detalhes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Audit;