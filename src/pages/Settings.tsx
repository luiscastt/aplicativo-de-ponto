import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError } from "@/utils/toast";
import Sidebar from "@/components/Sidebar";

// Mock fetch para configurações (em produção, GET /companies/{id}/geofence)
const fetchSettings = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    geofenceRadius: 100, // metros
    toleranceMinutes: 15,
    photoRetentionDays: 30
  };
};

// Mock update (em produção, PATCH /companies/{id}/geofence)
const updateSettings = async (data: { geofenceRadius: number; toleranceMinutes: number; photoRetentionDays: number }) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, data };
};

const Settings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ geofenceRadius: 100, toleranceMinutes: 15, photoRetentionDays: 30 });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (result) => {
      showSuccess("Configurações atualizadas com sucesso!");
      setFormData(result.data);
    },
    onError: () => showError("Erro ao atualizar configurações.")
  });

  if (isLoading) return <div className="p-8">Carregando configurações...</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
          <p className="text-gray-600">Ajuste parâmetros como geofence e retenção de dados.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Geofence e Regras</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="geofenceRadius">Raio de Geofence (metros)</Label>
                <Input
                  id="geofenceRadius"
                  type="number"
                  value={formData.geofenceRadius}
                  onChange={(e) => setFormData({ ...formData, geofenceRadius: parseInt(e.target.value) })}
                  min={50}
                  max={500}
                  required
                />
                <p className="text-sm text-muted-foreground">Distância máxima permitida para registro de ponto (padrão: 100m).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toleranceMinutes">Tolerância para Atrasos (minutos)</Label>
                <Input
                  id="toleranceMinutes"
                  type="number"
                  value={formData.toleranceMinutes}
                  onChange={(e) => setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value) })}
                  min={5}
                  max={30}
                  required
                />
                <p className="text-sm text-muted-foreground">Tempo auto-aprovado para atrasos (CLT conformidade).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photoRetentionDays">Retenção de Fotos (dias)</Label>
                <Input
                  id="photoRetentionDays"
                  type="number"
                  value={formData.photoRetentionDays}
                  onChange={(e) => setFormData({ ...formData, photoRetentionDays: parseInt(e.target.value) })}
                  min={7}
                  max={90}
                  required
                />
                <p className="text-sm text-muted-foreground">Período de armazenamento de selfies (LGPD: mínimo 7 dias para auditoria).</p>
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;