import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Loader2, PlusCircle, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showSuccess, showError } from '@/utils/toast';
import type { Profile } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Announcement {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: { first_name: string | null; email: string | null };
}

const fetchAnnouncements = async (): Promise<Announcement[]> => {
  const { data, error } = await supabase
    .from('announcements')
    .select(`
      *,
      profiles(first_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data as Announcement[];
};

const createAnnouncement = async (title: string, content: string) => {
  const { error } = await supabase
    .from('announcements')
    .insert({ title, content });
  
  if (error) throw error;
};

const deleteAnnouncement = async (id: string) => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

const Announcements = () => {
  const { user } = useAuth() as { user: Profile | null };
  const queryClient = useQueryClient();
  const isGestorOrAdmin = user?.role === 'gestor' || user?.role === 'admin';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: ({ title, content }: { title: string, content: string }) => createAnnouncement(title, content),
    onSuccess: () => {
      showSuccess("Aviso publicado com sucesso!");
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: any) => showError(`Erro ao publicar aviso: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      showSuccess("Aviso removido.");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: any) => showError(`Erro ao remover aviso: ${error.message}`),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const content = (form.elements.namedItem("content") as HTMLTextAreaElement).value.trim();

    if (!title || !content) {
      showError("Título e conteúdo são obrigatórios.");
      return;
    }
    
    createMutation.mutate({ title, content });
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja deletar este aviso?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Avisos da Empresa</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Mantenha-se atualizado com as comunicações importantes da gestão.
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        {isGestorOrAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">Publicar Novo Aviso</DialogTitle>
                <DialogDescription>
                  Este aviso será visível para todos os colaboradores.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea id="content" name="content" required rows={5} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      "Publicar Aviso"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-card-foreground">Últimos Avisos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {announcements?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum aviso publicado ainda.</p>
                ) : (
                  announcements?.map((announcement) => (
                    <Card key={announcement.id} className="shadow-sm border-l-4 border-primary">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg text-card-foreground text-left">{announcement.title}</CardTitle>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span>
                              {announcement.profiles?.first_name || announcement.profiles?.email || 'Sistema'}
                            </span>
                          </div>
                          <span>
                            {format(new Date(announcement.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-left text-sm text-card-foreground">
                        <p>{announcement.content}</p>
                      </CardContent>
                      {isGestorOrAdmin && (
                        <CardFooter className="p-4 pt-0 flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(announcement.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Deletar
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Announcements;