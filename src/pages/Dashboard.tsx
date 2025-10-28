import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import PointRegistration from "@/components/PointRegistration";
import type { Profile } from "@/types";

// Fetch recent points
const fetchRecentRecords = async () => {
  const { data, error } = await supabase
    .from('points')
    .select(`
      *,
      profiles!inner(first_name, last_name, email)
    `)
    .order('timestamp', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data?.map((p: any) => ({
    id: p.id,
    user: `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim() || p.profiles?.email || 'Desconhecido',
    type: p.type,
    timestamp: p.timestamp,
    location: p.location,
    photoUrl: p.photo_url,
    status: p.status,
  })) || [];
};

const Dashboard = () => {
  const { user, isAuthenticated, profileLoading } = useAuth() as { user: Profile | null; isAuthenticated: boolean; profileLoading: boolean };

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["recentRecords"],
    queryFn: fetchRecentRecords,
    enabled: isAuthenticated,
  });

  if (profileLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div>Carregando dashboard...</div>
      </div>
    );
  }

  const isColaborador = (user?.role || '').trim().toLowerCase() === "colaborador";

  const debugRoleBadge = process.env.NODE_ENV === 'development' && user && (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <strong>DEBUG - Role Atual:</strong> 
      <Badge variant={(user.role === 'gestor' || user.role === 'admin') ? "default" : "secondary"} className="ml-2">
        {user.role || 'N/A'}
      </Badge>
      {isColaborador ? (
        <span className="ml-2 text-sm text-blue-600">(Modo Colaborador - sem menu extra)</span>
      ) : (
        <span className="ml-2 text-sm text-green-600">(Modo Gestor - deve ter menu extra)</span>
      )}
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bem-vindo, {user?.first_name || user?.email?.split('@')[0] || 'Usuário'}
        </h1>
        <p className="text-gray-600">
          {isColaborador ? "Registre seu ponto abaixo." : "Monitore registros dos colaboradores."}
        </p>
        
        {debugRoleBadge}
      </div>

      {isColaborador && (
        <div className="mb-8">
          <PointRegistration />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Registros Recentes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 10 pontos registrados</p>
          </div>
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
                    <TableCell className="font-mono text-xs">
                      {`${record.location?.latitude?.toFixed(4) || 'N/A'}, ${record.location?.longitude?.toFixed(4) || 'N/A'}`}
                    </TableCell>
                    <TableCell>
                      {record.photoUrl ? (
                        <img src={record.photoUrl} alt="Foto" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          record.status === "aprovado" ? "default" : 
                          record.status === "rejeitado" ? "destructive" : "secondary"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!records || records.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum registro recente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;