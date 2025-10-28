import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { showError } from "@/utils/toast";
import PointRegistration from "@/components/PointRegistration";
import { Point } from "@/types";

// Fetch recent points (join com profiles para nome)
const fetchRecentRecords = async () => {
  const { data, error } = await supabase
    .from('points')
    .select(`
      *,
      profiles!inner(first_name, last_name)
    `)
    .order('timestamp', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data?.map((p: any) => ({
    id: p.id,
    user: `${p.profiles.first_name} ${p.profiles.last_name || ''}`.trim() || p.profiles.email,
    type: p.type,
    timestamp: p.timestamp,
    location: p.location,
    photoUrl: p.photo_url,
    status: p.status,
  })) || [];
};

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["recentRecords"],
    queryFn: fetchRecentRecords,
    enabled: isAuthenticated,
  });

  if (isLoading) return <div className="p-8 flex justify-center">Carregando...</div>;

  const isColaborador = user?.role === "colaborador";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bem-vindo, {user?.first_name || user?.email}</h1>
          <p className="text-gray-600">
            {isColaborador ? "Registre seu ponto abaixo." : "Registros recentes dos colaboradores."}
          </p>
        </div>
        {isColaborador && (
          <div className="mb-8">
            <PointRegistration />
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Registros Recentes</CardTitle>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record: any) => (
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
                      {record.photoUrl ? (
                        <img src={record.photoUrl} alt="Foto" className="w-8 h-8 rounded" />
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === "aprovado" ? "default" : record.status === "rejeitado" ? "destructive" : "secondary"}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {records?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum registro recente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;