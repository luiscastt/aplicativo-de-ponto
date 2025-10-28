"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Camera, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import type { PointType } from "@/types";

const PointRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<PointType>("entrada");
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState(false);
  const toastId = showLoading("Obtendo localização...");

  useEffect(() => {
    if (!navigator.geolocation) {
      showError("Geolocalização não suportada pelo navegador", { id: toastId });
      dismissToast(toastId);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
        dismissToast(toastId);
        showSuccess("Localização obtida com sucesso!");
      },
      (error) => {
        dismissToast(toastId);
        showError(`Erro ao obter localização: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const registerPoint = async () => {
    if (!location || !user) return;

    setLoading(true);
    const toastId = showLoading("Registrando ponto...");

    try {
      let photoUrl = null;
      if (photo) {
        const { data, error } = await supabase.storage
          .from("point-photos")
          .upload(`${user.id}/${Date.now()}-${photo.name}`, photo);

        if (error) throw error;
        photoUrl = data.path;
      }

      // Check geofence (simplified - in real app, compare with company_settings)
      const isWithinGeofence = true; // Placeholder logic
      const status = isWithinGeofence ? "aprovado" : "pendente";

      const { error } = await supabase
        .from("points")
        .insert({
          user_id: user.id,
          type,
          timestamp: new Date().toISOString(),
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          },
          photo_url: photoUrl,
          status,
        });

      if (error) throw error;

      showSuccess(`Ponto de ${type} registrado! ${geofenceWarning ? '(Pendente aprovação)' : '(Aprovado)'}`, { id: toastId });
      setLocation(null);
      setPhoto(null);
      setPhotoPreview(null);
      setGeofenceWarning(false);
      navigate("/dashboard");
    } catch (error: any) {
      showError(`Erro ao registrar: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Aguardando localização...</CardTitle>
            <CardDescription className="text-center">
              Permitir acesso à localização para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">Isso pode demorar alguns segundos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-center">
            <Clock className="mr-2 h-5 w-5" />
            Registro de Ponto
          </CardTitle>
          <CardDescription>
            {user?.first_name ? `Olá, ${user.first_name}!` : "Registre seu ponto"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Ponto</Label>
            <Select value={type} onValueChange={(value: PointType) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="almoco">Almoço</SelectItem>
                <SelectItem value="pausa">Pausa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Lat: {location.coords.latitude.toFixed(6)}, Lng: {location.coords.longitude.toFixed(6)}
              </span>
            </div>
            {geofenceWarning && (
              <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-md">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">Fora da área permitida - aguarde aprovação</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Foto (Opcional)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
              {photoPreview ? (
                <div className="space-y-2">
                  <img src={photoPreview} alt="Preview" className="max-w-full h-32 object-cover rounded" />
                  <Button variant="outline" size="sm" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Trocar Foto
                  </Button>
                </div>
              ) : (
                <>
                  <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                    id="photo"
                  />
                  <label htmlFor="photo" className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                    Tocar para tirar foto
                  </label>
                </>
              )}
            </div>
          </div>

          <Button onClick={registerPoint} className="w-full" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Registrar Ponto
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PointRegistration;