"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import type { Profile } from "@/types";

interface CompanySettings {
  geofence_center: { lat: number; lng: number };
  geofence_radius: number;
  tolerance_minutes: number;
  photo_retention_days: number;
  updated_at: string;
}

const Settings = () => {
  const { user } = useAuth() as { user: Profile | null };
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .eq("id", "default")
      .single();

    if (error && error.code !== "PGRST116") {
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
    }

    setSettings(data ?? {
      geofence_center: { lat: -23.5505, lng: -46.6333 },
      geofence_radius: 100,
      tolerance_minutes: 15,
      photo_retention_days: 30,
      updated_at: new Date().toISOString(),
    });
  };

  const updateSettings = async () => {
    if (!settings || !user) return;

    setUpdating(true);
    const { error } = await supabase
      .from("company_settings")
      .upsert({
        id: "default",
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configurações",
        description: error.message,
      });
    } else {
      toast({
        title: "Configurações salvas!",
        description: "As alterações foram aplicadas.",
      });
    }
    setUpdating(false);
  };

  const handleSliderChange = (key: keyof CompanySettings, value: number[]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value[0] });
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-4 h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-0">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações da Empresa</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Geofence</CardTitle>
            <CardDescription>Definir área permitida para registro de pontos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Centro da Área (Latitude, Longitude)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    step="any"
                    value={settings?.geofence_center.lat ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, geofence_center: { ...prev.geofence_center, lat: parseFloat(e.target.value) || 0 } } : null)}
                    placeholder="Latitude"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="any"
                    value={settings?.geofence_center.lng ?? ""}
                    onChange={(e) => setSettings((prev) => prev ? { ...prev, geofence_center: { ...prev.geofence_center, lng: parseFloat(e.target.value) || 0 } } : null)}
                    placeholder="Longitude"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Raio da Área (metros)</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className="text-sm font-medium w-20 flex-shrink-0 text-card-foreground">{settings?.geofence_radius ?? 100} m</span>
                <Slider
                  value={[settings?.geofence_radius ?? 100]}
                  onValueChange={(value) => handleSliderChange("geofence_radius", value)}
                  min={50}
                  max={500}
                  step={10}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Tolerâncias</CardTitle>
            <CardDescription>Configurações de tempo e validação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tolerância para Horário (minutos)</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className="text-sm font-medium w-20 flex-shrink-0 text-card-foreground">{settings?.tolerance_minutes ?? 15} min</span>
                <Slider
                  value={[settings?.tolerance_minutes ?? 15]}
                  onValueChange={(value) => handleSliderChange("tolerance_minutes", value)}
                  min={5}
                  max={60}
                  step={5}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Armazenamento de Fotos</CardTitle>
            <CardDescription>Período de retenção das imagens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Dias de Retenção</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className="text-sm font-medium w-20 flex-shrink-0 text-card-foreground">{settings?.photo_retention_days ?? 30} dias</span>
                <Slider
                  value={[settings?.photo_retention_days ?? 30]}
                  onValueChange={(value) => handleSliderChange("photo_retention_days", value)}
                  min={7}
                  max={90}
                  step={7}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={updateSettings} className="w-full" disabled={updating || !settings}>
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Settings;