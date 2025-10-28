"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError } from "@/utils/toast";
import { MapPin, Camera, Clock } from "lucide-react";
import { Point } from "@/types";

const PointRegistration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [type, setType] = useState<"entrada" | "saida">("entrada");

  const getLocation = () => {
    if (!navigator.geolocation) {
      showError("Geolocalização não suportada pelo browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        showSuccess("Localização obtida!");
      },
      (error) => {
        showError(`Erro na geolocalização: ${error.message}`);
      }
    );
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
          location,
          photo_url: photoUrl,
          status: 'pendente',
        });
      if (error) throw error;

      showSuccess(`Ponto de ${type} registrado com sucesso!`);
      setLocation(null);
      setPhotoFile(null);
      setType("entrada"); // Reset para próximo
    } catch (error: any) {
      showError(`Erro ao registrar: ${error.message}`);
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