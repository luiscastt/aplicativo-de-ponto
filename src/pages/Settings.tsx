import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError } from "@/utils/toast";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";

const fetchSettings = async () => {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', 'default')
    .single();
  if (error) throw error;
  return data;
};

const updateSettings = async (data: {
  geofence_center: { lat: number; lon: number };
  geofence_radius: number;
  tolerance_minutes: number;
  photo_retention_days: number;
}) => {
  const { error } = await supabase
    .from('company_settings')
    .update({ 
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'default');
  if (error) throw error;
  return { success: true };
};

const Settings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ 
    geofence_center: { lat: -23.5505, lon: -46.6333 }, // Default SP
    geofence_radius: 100, 
    tolerance_minutes: 15, 
    photo_retention_days: 30 
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      showSuccess("Configurações atualizadas com sucesso!");
      setFormData(settings);
    },
    onError: () => showError("Erro ao atualizar configurações.")
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        geofence_center: settings.geofence_center,
        geofence_radius: settings.geofence_radius,
        tolerance_minutes: settings.tolerance_minutes,
        photo_retention_days: settings.photo_retention_days,
      });
    }
  }, [settings]);

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
                <Label>Centro Geofence (Lat, Lon)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Latitude"
                    value={formData.geofence_center.lat}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      geofence_center: { 
                        ...formData.geofence_center, 
                        lat: parseFloat(e.target.value) 
                      } 
                    })}
                    step="any"
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Longitude"
                    value={formData.geofence_center.lon}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      geofence_center: { 
                        ...formData.geofence_center, 
                        lon: parseFloat(e.target.value) 
                      } 
                    })}
                    step="any"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">Localização da empresa para validação de pontos.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="geofenceRadius">Raio de Geofence (metros)</Label>
                <Input
                  id="geofenceRadius"
                  type="number"
                  value={formData.geofence_radius}
                  onChange={(e) => setFormData({ ...formData, geofence_radius: parseInt(e.target.value) })}
                  min={50}
                  max={500}
                  required
                />
                <p className="text-sm text-muted-foreground">Distância máxima permitida para registro de ponto.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toleranceMinutes">Tolerância para Atrasos (minutos)</Label>
                <Input
                  id="toleranceMinutes"
                  type="number"
                  value={formData.tolerance_minutes}
                  onChange={(e) => setFormData({ ...formData, tolerance_minutes: parseInt(e.target.value) })}
                  min={5}
                  max={30}
                  required
                />
                <p className="text-sm text-muted-foreground">Tempo auto-aprovado para atrasos (CLT).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photoRetentionDays">Retenção de Fotos (dias)</Label>
                <Input
                  id="photoRetentionDays"
                  type="number"
                  value={formData.photo_retention_days}
                  onChange={(e) => setFormData({ ...formData, photo_retention_days: parseInt(e.target.value) })}
                  min={7}
                  max={90}
                  required
                />
                <p className="text-sm text-muted-foreground">Período de armazenamento de selfies (LGPD).</p>
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