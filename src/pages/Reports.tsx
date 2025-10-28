import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { showSuccess } from "@/utils/toast";
import Sidebar from "@/components/Sidebar"; // Nova importação

// Mock data para relatórios (em produção, fetch de /reports/timesheet)
const fetchReports = async (filters: { userId?: string; dateFrom: string; dateTo: string }) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    data: [
      { date: "2023-10-01", entry: "08:05", exit: "18:10", hours: 9.5, status: "extra" as const },
      { date: "2023-10-02", entry: "08:00", exit: "17:00", hours: 8, status: "normal" as const }
    ],
    totalHours: 17.5,
    extras: 1.5
  };
};

const Reports = () => {
  const [filters, setFilters] = useState({ userId: "", dateFrom: "2023-10-01", dateTo: "2023-10-31" });
  const { user } = useAuth();

  const { data: reportData, refetch } = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReports(filters),
    initialData: { data: [], totalHours: 0, extras: 0 }
  });

  // Mutação para aprovação (simulada)
  const approveMutation = useMutation({
    mutationFn: async (recordId: string) => {
      // Mock PATCH /journeys/{id}/approve
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      showSuccess("Ajuste aprovado!");
      refetch();
    }
  });

  const handleExport = () => {
    // Simula export CSV
    showSuccess("Relatório exportado como CSV!");
  };

  const chartData = reportData.data.map((item: any) => ({
    name: item.date,
    hours: item.hours,
    extras: item.status === "extra" ? item.hours - 8 : 0
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
                placeholder="ID do Colaborador"
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
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((item: any) => (
                  <TableRow key={item.date}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.entry}</TableCell>
                    <TableCell>{item.exit}</TableCell>
                    <TableCell>{item.hours}h</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "extra" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(item.date)}
                        disabled={item.status !== "pendente"}
                      >
                        Aprovar
                      </Button>
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

export default Reports;