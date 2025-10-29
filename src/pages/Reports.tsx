import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useAuth } from '@/hooks/useAuth';
import type { Profile } from '@/types';

interface ExportPayload {
  start_date: string;
  end_date: string;
}

const exportPayrollData = async (payload: ExportPayload) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Usuário não autenticado.");
  
  const { data, error } = await supabase.functions.invoke('export-payroll', {
    body: payload,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (error) throw error;
  return data;
};

const Reports = () => {
  const { user } = useAuth() as { user: Profile | null };
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';
  
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const exportMutation = useMutation({
    mutationFn: exportPayrollData,
    onMutate: () => {
      return showLoading("Preparando exportação...");
    },
    onSuccess: (data, _, toastId) => {
      dismissToast(toastId);
      showSuccess(data.message || "Exportação concluída com sucesso!");
      console.log("Dados exportados (Preview):", data.data_preview);
    },
    onError: (error: any, _, toastId) => {
      dismissToast(toastId);
      showError(`Falha na exportação: ${error.message}`);
    },
  });

  const handleExport = () => {
    if (!startDate || !endDate) {
      showError("Selecione o período de início e fim.");
      return;
    }
    
    exportMutation.mutate({
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="w-full">
      {/* Título e Conteúdo Alinhados à Esquerda (usando o padding do MainLayout) */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios e BI</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Análise de dados e ferramentas de exportação.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulo de BI Integrado (Placeholder) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-card-foreground">Dashboard Analítico (BI)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-left">
              Aqui será integrado o dashboard de Business Intelligence com gráficos e métricas avançadas de produtividade e conformidade.
            </p>
            <div className="h-64 bg-muted mt-4 flex items-center justify-center rounded-lg border border-dashed">
                <span className="text-muted-foreground">Gráfico de Exemplo (Em Desenvolvimento)</span>
            </div>
          </CardContent>
        </Card>

        {/* Módulo de Exportação */}
        {isGestorOrAdmin && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center">
                <FileText className="h-5 w-5 mr-2" /> Exportação Folha de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione o período para exportar os registros de ponto aprovados.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>Início</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : <span>Fim</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <Button 
                onClick={handleExport} 
                className="w-full" 
                disabled={exportMutation.isPending || !startDate || !endDate}
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Reports;