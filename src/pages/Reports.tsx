import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { showSuccess } from "@/utils/toast";
import Sidebar from "@/components/Sidebar";
import { Point } from "@/types";

// Fetch individual points for reports
const fetchReports = async (filters: { userId?: string; dateFrom: string; dateTo: string }) => {
  let query = supabase
    .from('points')
    .select(`
      *,
      profiles!inner(first_name, last_name, email)
    `)
    .order('timestamp', { ascending: true });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.dateFrom) {
    query = query.gte('timestamp', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('timestamp', `${filters.dateTo}T23:59:59Z`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Calcular resumo (horas/extras por dia)
  const dailyData: { [date: string]: { entry?: string; exit?: string; hours: number; status: string; points: any[] } } = {};
  let totalHours = 0;
  let extras = 0;

  data?.forEach((p: any) => {
    const date = new Date(p.timestamp).toISOString().split('T')[0];
    const time = new Date(p.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    if (!dailyData[date]) {
      dailyData[date] = { entry: null, exit: null, hours: 0, status: p.status, points: [] };
    }
    if (p.type === 'entrada') dailyData[date].entry = time;
    if (p.type === 'saida') dailyData[date].exit = time;
    dailyData[date].points.push(p);

    // Calcular horas se par completo
    if (dailyData[date].entry && dailyData[date].exit) {
      const entryTime = new Date(`2023-01-01 ${dailyData[date].entry}`);
      const exitTime = new Date(`2023-01-01 ${dailyData[date].exit}`);
      const hours = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      dailyData[date].hours = Math.round(hours * 10) / 10;
      totalHours += dailyData[date].hours;
      if (dailyData[date].hours > 8) extras += dailyData[date].hours - 8;
    }
  });

  return {
    points: data || [], // Individual points for table
    summary: {
      data: Object.entries(dailyData).map(([date, item]) => ({ date, ...item })),
      totalHours: Math.round(totalHours * 10) / 10,
      extras: Math.round(extras * 10) / 10,
    }
  };
};

// Mutação para aprovar/rejeitar ponto
const updatePointStatus = async (pointId: string, status: 'aprovado' | 'rejeitado') => {
  const { error } = await supabase
    .from('points')
    .update({ status })
    .eq('id', pointId);
  if (error) throw error;
  return { success: true };
};

const Reports = () => {
  const [filters, setFilters] = useState({ userId: "", dateFrom: "2023-10-01", dateTo: new Date().toISOString().split('T')[0] });
  const { user } = useAuth();
  const isGestor = user?.role === "gestor" || user?.role === "admin";

  const { data: reportData, refetch } = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReports(filters),
    initialData: { points: [], summary: { data: [], totalHours: 0, extras: 0 } },
  });

  const approveMutation = useMutation({
    mutationFn: (pointId: string) => updatePointStatus(pointId, 'aprovado'),
    onSuccess: () => {
      showSuccess("Ponto aprovado!");
      refetch();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (pointId: string) => updatePointStatus(pointId, 'rejeitado'),
    onSuccess: () => {
      showSuccess("Ponto rejeitado!");
      refetch();
    },
  });

  const handleExport = () => {
    const csv = reportData.points.map((p: any) => 
      `${p.profiles.email},${p.type},${new Date(p.timestamp).toLocaleDateString('pt-BR')},${p.location.lat},${p.location.lon},${p.status}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-ponto.csv';
    a.click();
    showSuccess("Relatório exportado!");
  };

  const chartData = reportData.summary.data.map((item: any) => ({
    name: item.date,
    hours: item.hours,
    extras: item.hours > 8 ? item.hours - 8 : 0,
  }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Relatórios de Jornadas</h1>
          <p className="text-gray-600">Filtros, visualização e aprovação de pontos.</p>
        </div>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder="ID do Colaborador (opcional)"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <Button onClick={() => refetch()}>Aplicar Filtros</Button>
          </CardContent>
        </Card>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Gráfico de Horas (Resumo)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#8884d8" name="Horas Trabalhadas" />
                <Bar dataKey="extras" fill="#82ca9d" name="Horas Extras" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pontos Individuais</CardTitle>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Total de Horas: {reportData.summary.totalHours}h | Horas Extras: {reportData.summary.extras}h
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Status</TableHead>
                  {isGestor && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.points.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{`${p.profiles.first_name} ${p.profiles.last_name || ''}`.trim() || p.profiles.email}</TableCell>
                    <TableCell>
                      <Badge variant={p.type === "entrada" ? "default" : "secondary"}>{p.type}</Badge>
                    </TableCell>
                    <TableCell>{new Date(p.timestamp).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{`${p.location.lat.toFixed(4)}, ${p.location.lon.toFixed(4)}`}</TableCell>
                    <TableCell>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="Foto" className="w-8 h-8 rounded" />
                      ) : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    {isGestor && p.status === "pendente" && (
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveMutation.mutate(p.id)}
                          disabled={approveMutation.isPending}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(p.id)}
                          disabled={rejectMutation.isPending}
                        >
                          Rejeitar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {reportData.points.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 7 : 6} className="text-center text-muted-foreground">
                      Nenhum ponto para o período.
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

export default Reports;