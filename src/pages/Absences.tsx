import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plane, Loader2, Check, X, PlusCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import type { Profile } from '@/types';

interface Absence {
  id: string;
  user_id: string;
  type: 'ferias' | 'afastamento' | 'licenca';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  profiles?: { first_name: string | null; email: string | null };
}

const fetchAbsences = async (isGestor: boolean): Promise<Absence[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase
    .from('absences')
    .select(`
      id, user_id, type, start_date, end_date, reason, status,
      profiles(first_name, email)
    `) // Explicitly selecting columns
    .order('created_at', { ascending: false });
    
  if (!isGestor && user) {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Absence[];
};

const updateAbsenceStatus = async (id: string, status: 'aprovado' | 'rejeitado') => {
  const { error } = await supabase
    .from('absences')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

const createAbsence = async (data: Omit<Absence, 'id' | 'status' | 'user_id' | 'profiles'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");
  
  const { error } = await supabase
    .from('absences')
    .insert({ ...data, user_id: userId });
  if (error) throw error;
};

const getStatusVariant = (status: Absence['status']) => {
  switch (status) {
    case "aprovado": return "default";
    case "rejeitado": return "destructive";
    default: return "secondary";
  }
};

const Absences = () => {
  const { user } = useAuth() as { user: Profile | null };
  const queryClient = useQueryClient();
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAbsenceType, setNewAbsenceType] = useState<Absence['type'] | undefined>(undefined);
  const [newAbsenceStartDate, setNewAbsenceStartDate] = useState<Date | undefined>(undefined);
  const [newAbsenceEndDate, setNewAbsenceEndDate] = useState<Date | undefined>(undefined);
  const [newAbsenceReason, setNewAbsenceReason] = useState('');

  const { data: absences, isLoading, refetch } = useQuery({
    queryKey: ["absences", isGestorOrAdmin],
    queryFn: () => fetchAbsences(isGestorOrAdmin),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'aprovado' | 'rejeitado' }) => updateAbsenceStatus(id, status),
    onSuccess: () => {
      showSuccess("Status de ausência atualizado!");
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
    onError: (error: any) => showError(`Erro ao atualizar status: ${error.message}`),
  });

  const createMutation = useMutation({
    mutationFn: createAbsence,
    onSuccess: () => {
      showSuccess("Solicitação de ausência enviada com sucesso!");
      setIsCreateDialogOpen(false);
      // Reset form state
      setNewAbsenceType(undefined);
      setNewAbsenceStartDate(undefined);
      setNewAbsenceEndDate(undefined);
      setNewAbsenceReason('');
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
    onError: (error: any) => showError(`Erro ao solicitar ausência: ${error.message}`),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAbsenceStartDate || !newAbsenceEndDate || !newAbsenceType) {
      showError("Preencha todos os campos obrigatórios (Tipo, Início e Fim).");
      return;
    }
    
    createMutation.mutate({
      start_date: format(newAbsenceStartDate, 'yyyy-MM-dd'),
      end_date: format(newAbsenceEndDate, 'yyyy-MM-dd'),
      type: newAbsenceType,
      reason: newAbsenceReason,
    });
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!absences || absences.length === 0) {
      return (
        <div className="text-left text-muted-foreground py-8">
          Nenhuma solicitação de ausência encontrada.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {isGestorOrAdmin && <TableHead>Colaborador</TableHead>}
            <TableHead>Tipo</TableHead>
            <TableHead>Período</TableHead>
            <TableHead className="hidden md:table-cell">Motivo</TableHead>
            <TableHead>Status</TableHead>
            {isGestorOrAdmin && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {absences.map((absence) => (
            <TableRow key={absence.id}>
              {isGestorOrAdmin && (
                <TableCell className="font-medium text-card-foreground">
                  {absence.profiles?.first_name || absence.profiles?.email}
                </TableCell>
              )}
              <TableCell>
                <Badge variant="secondary">{absence.type}</Badge>
              </TableCell>
              <TableCell className="text-card-foreground text-sm">
                {format(new Date(absence.start_date), 'dd/MM/yyyy')} - {format(new Date(absence.end_date), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                {absence.reason || 'N/A'}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(absence.status)}>
                  {absence.status}
                </Badge>
              </TableCell>
              {isGestorOrAdmin && (
                <TableCell className="space-x-2">
                  {absence.status === 'pendente' && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => updateMutation.mutate({ id: absence.id, status: 'aprovado' })}
                        disabled={updateMutation.isPending}
                        title="Aprovar"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => updateMutation.mutate({ id: absence.id, status: 'rejeitado' })}
                        disabled={updateMutation.isPending}
                        title="Rejeitar"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </TableCell>
              )}
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
          <Plane className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Férias e Afastamentos</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isGestorOrAdmin ? "Gerencie e aprove solicitações de ausência." : "Solicite e acompanhe suas férias e afastamentos."}
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Solicitar Ausência
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Nova Solicitação</DialogTitle>
              <DialogDescription>
                Preencha o período e o tipo de ausência.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Ausência</Label>
                <Select 
                  name="type" 
                  required 
                  value={newAbsenceType}
                  onValueChange={(value) => setNewAbsenceType(value as Absence['type'])}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="afastamento">Afastamento</SelectItem>
                    <SelectItem value="licenca">Licença</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newAbsenceStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAbsenceStartDate ? format(newAbsenceStartDate, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newAbsenceStartDate}
                        onSelect={setNewAbsenceStartDate}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newAbsenceEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAbsenceEndDate ? format(newAbsenceEndDate, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newAbsenceEndDate}
                        onSelect={setNewAbsenceEndDate}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) => newAbsenceStartDate ? date < newAbsenceStartDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo (Opcional)</Label>
                <Input 
                  id="reason" 
                  name="reason" 
                  value={newAbsenceReason}
                  onChange={(e) => setNewAbsenceReason(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || !newAbsenceStartDate || !newAbsenceEndDate || !newAbsenceType}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className="ml-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-card-foreground">Minhas Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTableContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Absences;