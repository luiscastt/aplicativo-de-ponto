"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError, showLoading } from "@/utils/toast";
import { MapPin, Camera, Clock, AlertCircle } from "lucide-react";
import { Point } from "@/types";
import { calculateDistance, isWithinGeofence } from "@/utils/geofence";
import { useQuery } from "@tanstack/react-query";

const fetchSettings = async () => {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', 'default')
    .single();
  if (error) throw error;
  return data;
};

const PointRegistration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [type, setType] = useState<"entrada" | "saida">("entrada");
  const [geofenceWarning, setGeofenceWarning] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: !!user,
  });

  const getLocation = async () => {
    if (!navigator.geolocation) {
      showError("Geolocalização não suportada pelo browser.");
      return;
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    const newLocation = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
    setLocation(newLocation);
    showSuccess("Localização obtida!");

    // Check geofence
    if (settings?.geofence_center && settings.geofence_radius) {
      const center = settings.geofence_center as { lat: number; lon: number };
      const within = isWithinGeofence(newLocation, center, settings.geofence_radius);
      setGeofenceWarning(!within);
      if (!within) {
        showError(`Aviso: Fora do geofence (${calculateDistance(newLocation.lat, newLocation.lon, center.lat, center.lon).toFixed(0)}m). Registro pendente para aprovação.`);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      showSuccess("Foto selecionada!");
    }
  };

  const registerPoint = async () => {
    if (!location) {
      showError("Obtenha a localização primeiro.");
      return;
    }
    if (!user?.id) {
      showError("Usuário não autenticado.");
      return;
    }

    setLoading(true);
    const toastId = showLoading("Registrando ponto...");
    try {
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('point-photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: false,
          });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('point-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('points')
        .insert({
          user_id: user.id,
          type,
          timestamp: new Date().toISOString(), // Use current time
          location,
          photo_url: photoUrl,
          status: geofenceWarning ? 'pendente' : 'aprovado', // Auto-aprovar se dentro geofence
        });
      if (error) throw error;

      showSuccess(`Ponto de ${type} registrado! ${geofenceWarning ? '(Pendente aprovação)' : '(Aprovado)'}`, { id: toastId });
      setLocation(null);
      setPhotoFile(null);
      setType("entrada");
      setGeofenceWarning(false);
    } catch (error: any) {
      showError(`Erro ao registrar: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Registrar Ponto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <MapPin className="mr-2 h-4 w-4" />
            Localização
          </label>
          <Button type="button" onClick={getLocation} variant="outline" className="w-full">
            Obter Localização Atual
          </Button>
          {location && (
            <p className="text-sm text-muted-foreground">
              {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              {geofenceWarning && (
                <span className="ml-2 text-orange-500 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" /> Fora do geofence
                </span>
              )}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Camera className="mr-2 h-4 w-4" />
            Foto (Selfie)
          </label>
          <Input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="w-full"
          />
          {photoFile && <p className="text-sm text-muted-foreground">{photoFile.name}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "entrada" | "saida")}
            className="w-full p-2 border rounded-md"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
        <Button onClick={registerPoint} disabled={loading || !location} className="w-full">
          {loading ? "Registrando..." : `Registrar ${type}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PointRegistration;