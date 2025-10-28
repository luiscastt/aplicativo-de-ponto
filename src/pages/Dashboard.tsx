import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";
import { Loader2, RefreshCw } from "lucide-react";

// Tipagem para o registro de ponto
interface PointRecord {
  id: string;
  user: string;
  type: 'entrada' | 'saida' | 'almoco' | 'pausa';
  timestamp: string;
  location: { latitude: number; longitude: number };
  photoUrl?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

// Fetch recent points
const fetchRecentRecords = async (): Promise<PointRecord[]> => {
  const { data, error } = await supabase
    .from('points')
    .select(`
      *,
      profiles(first_name, last_name, email)
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

const getStatusVariant = (status: PointRecord['status']) => {
  switch (status) {
    case "aprovado": return "default";
    case "rejeitado": return "destructive";
    default: return "secondary";
  }
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userName = user?.first_name || user?.email?.split('@')[0] || 'Gestor';

  return (
    <div className="p-4 sm:p-0">
      <div className="mb-8">
        {/* Títulos principais agora usam text-foreground (Branco) */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Bem-vindo, {userName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitore registros recentes dos colaboradores.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {/* Títulos dentro do Card usam text-card-foreground (Quase Preto) */}
            <CardTitle className="text-xl text-card-foreground">Registros Recentes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 10 pontos registrados</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
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
                {records?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium text-card-foreground">{record.user}</TableCell>
                    <TableCell>
                      <Badge variant={record.type === "entrada" ? "default" : "secondary"}>
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">{new Date(record.timestamp).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs text-card-foreground">
                      {`${record.location?.latitude?.toFixed(4) || 'N/A'}, ${record.location?.longitude?.toFixed(4) || 'N/A'}`}
                    </TableCell>
                    <TableCell>
                      {record.photoUrl ? (
                        <a 
                          href={supabase.storage.from('point-photos').getPublicUrl(record.photoUrl).data.publicUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <img src={supabase.storage.from('point-photos').getPublicUrl(record.photoUrl).data.publicUrl} alt="Foto" className="w-8 h-8 rounded object-cover hover:opacity-75 transition-opacity" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(record.status)}>
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
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-4">
            {records?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum registro recente encontrado.
              </div>
            ) : (
              records?.map((record) => (
                <Card key={record.id} className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-base truncate text-card-foreground">{record.user}</p>
                      <Badge variant={getStatusVariant(record.status)} className="ml-2 flex-shrink-0">
                        {record.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Tipo: <Badge variant={record.type === "entrada" ? "default" : "secondary"}>{record.type}</Badge></p>
                      <p>Horário: {new Date(record.timestamp).toLocaleString("pt-BR")}</p>
                      <p className="truncate">Local: {`${record.location?.latitude?.toFixed(4) || 'N/A'}, ${record.location?.longitude?.toFixed(4) || 'N/A'}`}</p>
                    </div>
                    {record.photoUrl && (
                      <div className="pt-2">
                        <a 
                          href={supabase.storage.from('point-photos').getPublicUrl(record.photoUrl).data.publicUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          Ver Foto
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;