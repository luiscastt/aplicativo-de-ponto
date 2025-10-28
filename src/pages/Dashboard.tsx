import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar"; // Nova importação
import { showError } from "@/utils/toast";

// Mock data para registros recentes (em produção, fetch de /point/recent)
const fetchRecentRecords = async () => {
  // Simula delay de API
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    {
      id: "1",
      user: "João Silva",
      type: "entrada" as const,
      timestamp: "2023-10-01T08:05:00Z",
      location: { lat: -23.5505, lon: -46.6333 },
      photoUrl: "/placeholder.svg",
      status: "aprovado" as const
    },
    {
      id: "2",
      user: "Maria Oliveira",
      type: "saida" as const,
      timestamp: "2023-10-01T18:10:00Z",
      location: { lat: -23.5505, lon: -46.6333 },
      photoUrl: "/placeholder.svg",
      status: "pendente" as const
    }
  ];
};

const Dashboard = () => {
  const { user } = useAuth();

  const { data: records, isLoading } = useQuery({
    queryKey: ["recentRecords"],
    queryFn: fetchRecentRecords,
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bem-vindo, {user?.id}</h1>
          <p className="text-gray-600">Registros recentes dos colaboradores.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Registros Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.user}</TableCell>
                    <TableCell>
                      <Badge variant={record.type === "entrada" ? "default" : "secondary"}>
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(record.timestamp).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{`${record.location.lat.toFixed(4)}, ${record.location.lon.toFixed(4)}`}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === "aprovado" ? "default" : "secondary"}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;