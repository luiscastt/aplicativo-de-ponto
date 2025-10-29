import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Smartphone, Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showSuccess, showError } from '@/utils/toast';
import type { Profile } from '@/types';

interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_model: string;
  last_login: string;
  is_active: boolean;
  profiles?: { first_name: string | null; email: string | null };
}

const fetchDevices = async (isGestor: boolean): Promise<Device[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase
    .from('active_devices')
    .select(`
      *,
      profiles(first_name, email)
    `)
    .order('last_login', { ascending: false });
    
  if (!isGestor && user) {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Device[];
};

const updateDeviceStatus = async (deviceId: string, isActive: boolean) => {
  const { error } = await supabase
    .from('active_devices')
    .update({ is_active: isActive, last_login: new Date().toISOString() })
    .eq('id', deviceId);
  if (error) throw error;
};

const Devices = () => {
  const { user } = useAuth() as { user: Profile | null };
  const queryClient = useQueryClient();
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["devices", isGestorOrAdmin],
    queryFn: () => fetchDevices(isGestorOrAdmin),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => updateDeviceStatus(id, isActive),
    onSuccess: (_, variables) => {
      showSuccess(`Dispositivo ${variables.isActive ? 'ativado' : 'desativado'} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (error: any) => showError(`Erro ao atualizar dispositivo: ${error.message}`),
  });

  const handleToggle = (device: Device) => {
    updateMutation.mutate({ id: device.id, isActive: !device.is_active });
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!devices || devices.length === 0) {
      return (
        <div className="text-left text-muted-foreground py-8">
          Nenhum dispositivo ativo encontrado.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {isGestorOrAdmin && <TableHead>Colaborador</TableHead>}
            <TableHead>Modelo</TableHead>
            <TableHead className="hidden sm:table-cell">ID Único</TableHead>
            <TableHead>Último Login</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              {isGestorOrAdmin && (
                <TableCell className="font-medium text-card-foreground">
                  {device.profiles?.first_name || device.profiles?.email}
                </TableCell>
              )}
              <TableCell className="text-card-foreground text-sm">
                {device.device_model || 'Desconhecido'}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                {device.device_id}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(device.last_login).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <Badge variant={device.is_active ? "default" : "destructive"}>
                  {device.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Toggle 
                  pressed={device.is_active} 
                  onPressedChange={() => handleToggle(device)}
                  disabled={updateMutation.isPending}
                  aria-label={`Toggle ${device.device_model}`}
                >
                  {device.is_active ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                </Toggle>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Smartphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Controle de Dispositivos</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isGestorOrAdmin ? "Gerencie quais dispositivos estão autorizados a bater ponto." : "Seus dispositivos ativos."}
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-card-foreground">Dispositivos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTableContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Devices;