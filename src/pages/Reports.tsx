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

// Fetch reports: points por período, join profiles, calcular horas
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

  // Calcular horas por dia (simples: pares entrada-saida)
  const dailyData: { [date: string]: { entry?: string; exit?: string; hours: number; status: string } } = {};
  let totalHours = 0;
  let extras = 0;

  data?.forEach((p: any) => {
    const date = new Date(p.timestamp).toISOString().split('T')[0];
    const time = new Date(p.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    if (!dailyData[date]) {
      dailyData[date] = { entry: null, exit: null, hours: 0, status: p.status };
    }
    if (p.type === 'entrada') dailyData[date].entry = time;
    if (p.type === 'saida') dailyData[date].exit = time;

    // Calcular horas (simplificado)
    if (dailyData[date].entry && dailyData[date].exit) {
      const entryTime = new Date(`2023-01-01 ${dailyData[date].entry}`);
      const exitTime = new Date(`2023-01-01 ${dailyData[date].exit}`);
      const hours = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
      dailyData[date].hours = Math.round(hours * 10) / 10;
      totalHours += dailyData[date].hours;
      if (dailyData[date].hours > 8) extras += dailyData[date].hours - 8;
      dailyData[date].status = p.status; // Último status
    }
  });

  return {
    data: Object.entries(dailyData).map(([date, item]) => ({ date, ...item })),
    totalHours: Math.round(totalHours * 10) / 10,
    extras: Math.round(extras * 10) / 10,
  };
};

// Mutação para aprovar (update status)
const approvePoint = async (pointId: string) => {
  const { error } = await supabase
    .from('points')
    .update({ status: 'aprovado' })
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
    initialData: { data: [], totalHours: 0, extras: 0 },
  });

  const approveMutation = useMutation({
    mutationFn: approvePoint,
    onSuccess: () => {
      showSuccess("Ponto aprovado!");
      refetch();
    },
  });

  const handleExport = () => {
    // Simula CSV (em prod, use lib como papaparse)
    const csv = reportData.data.map((item: any) => 
      `${item.date},${item.entry || ''},${item.exit || ''},${item.hours},${item.status}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-ponto.csv';
    a.click();
    showSuccess("Relatório exportado!");
  };

  const chartData = reportData.data.map((item: any) => ({
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
          <p className="text-gray-600">Filtros e visualização de horas trabalhadas.</p>
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
            <CardTitle>Gráfico de Horas</CardTitle>
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
            <CardTitle>Jornadas Detalhadas</CardTitle>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Total de Horas: {reportData.totalHours}h | Horas Extras: {reportData.extras}h
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Status</TableHead>
                  {isGestor && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((item: any) => (
                  <TableRow key={item.date}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.entry || "N/A"}</TableCell>
                    <TableCell>{item.exit || "N/A"}</TableCell>
                    <TableCell>{item.hours > 0 ? `${item.hours}h` : "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "aprovado" ? "default" : item.status === "rejeitado" ? "destructive" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    {isGestor && (
                      <TableCell>
                        {item.status === "pendente" && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(item.pointId || item.date)} // Assume pointId disponível ou ajuste
                            disabled={approveMutation.isPending}
                          >
                            Aprovar
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {reportData.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 6 : 5} className="text-center text-muted-foreground">
                      Nenhum dado para o período.
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