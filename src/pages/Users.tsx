import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import type { CreateUserResponse } from "@/types";
import Sidebar from "@/components/Sidebar";

interface UserFormData {
  first_name: string;
  email: string;
  password?: string;
  role: "colaborador" | "gestor" | "admin";
}

interface UsersData {
  users: any[];
  total: number;
}

const fetchUsers = async (searchTerm?: string, page = 1, pageSize = 10): Promise<UsersData> => {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .order('first_name', { ascending: true });

  if (searchTerm?.trim()) {
    const search = `%${searchTerm.trim()}%`;
    query = query.or(`email.ilike.${search},first_name.ilike.${search},last_name.ilike.${search}`);
  }

  const rangeQuery = query.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await rangeQuery;
  if (error) throw error;
  return { users: data || [], total: count || 0 };
};

const createUserViaFunction = async (userData: UserFormData): Promise<CreateUserResponse> => {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: userData,
  });
  if (error) throw error;
  return data as CreateUserResponse;
};

const updateUserProfile = async (userId: string, data: Partial<UserFormData>) => {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      first_name: data.first_name,
      role: data.role,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  if (error) throw error;
  
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'perfil_atualizado',
    details: { updated_fields: Object.keys(data) }
  });
  
  return { success: true, message: 'Perfil atualizado!' };
};

const Users = () => {
  const { user: currentUser } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserFormData | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<UsersData>({
    queryKey: ["users", searchTerm, currentPage],
    queryFn: () => fetchUsers(searchTerm, currentPage, pageSize),
  });

  const users = data?.users || [];
  const total = data?.total || 0;

  const createMutation = useMutation({
    mutationFn: createUserViaFunction,
    onSuccess: (response) => {
      if (response.success) {
        showSuccess(response.message || "Usuário criado com sucesso!");
        setIsCreateDialogOpen(false);
        setSearchTerm("");
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        showError(response.error || "Erro ao criar usuário.");
      }
    },
    onError: (error: any) => showError(`Erro: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserFormData> }) => 
      updateUserProfile(userId, data),
    onSuccess: (response) => {
      showSuccess(response.message || "Perfil atualizado!");
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => showError(`Erro: ${error.message}`),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData: UserFormData = {
      first_name: (e.target as any).first_name.value.trim(),
      email: (e.target as any).email.value.trim().toLowerCase(),
      password: (e.target as any).password.value,
      role: (e.target as any).role.value as UserFormData['role'],
    };

    if (!formData.first_name || !formData.email || !formData.password) {
      showError("Nome, email e senha são obrigatórios.");
      return;
    }
    if (formData.password.length < 6) {
      showError("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!['colaborador', 'gestor', 'admin'].includes(formData.role)) {
      showError("Role inválido.");
      return;
    }

    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUserId) return;

    const updateData: Partial<UserFormData> = {
      first_name: (e.target as any).first_name.value.trim(),
      role: (e.target as any).role.value as UserFormData['role'],
    };

    if (!updateData.first_name) {
      showError("Nome é obrigatório.");
      return;
    }

    updateMutation.mutate({ userId: editingUserId, data: updateData });
  };

  const handleEdit = (user: any) => {
    setEditingUser({
      first_name: user.first_name || '',
      email: user.email,
      role: user.role as UserFormData['role'],
    });
    setEditingUserId(user.id);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Confirmar remoção de ${email}? Isso deletará o perfil e a conta de autenticação.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });
      
      if (error) throw error;
      if (data.success) {
        showSuccess(`Usuário ${email} removido com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        showError(data.error || "Erro ao remover usuário.");
      }
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const canCreate = currentUser?.role === 'gestor' || currentUser?.role === 'admin';

  if (!canCreate) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Usuários</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-red-500">
              <p>Acesso negado. Apenas gestores e admins podem gerenciar usuários.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
            <p className="text-gray-600">Crie, edite e gerencie contas de colaboradores.</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha para criar conta completa (auth + profile). Senha mínima: 6 caracteres.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome Completo</Label>
                  <Input id="first_name" name="first_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" minLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="colaborador">
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Usuário"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Mostrando {users.length} de {total} usuários
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado. {searchTerm && 'Tente ajustar a busca.'}
                <Button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} className="ml-2">
                  Limpar Busca
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.first_name} {u.last_name || ''}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "colaborador" ? "secondary" : "default"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(u.updated_at || u.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Dialog open={isEditDialogOpen && editingUserId === u.id} onOpenChange={() => {
                            if (!isEditDialogOpen) {
                              setIsEditDialogOpen(false);
                              setEditingUserId(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Editar {u.first_name}</DialogTitle>
                                <DialogDescription>Atualize nome e role. A senha permanece a mesma.</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit_first_name">Nome Completo</Label>
                                  <Input 
                                    id="edit_first_name" 
                                    name="first_name" 
                                    defaultValue={editingUser?.first_name} 
                                    required 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Email (não editável)</Label>
                                  <Input value={u.email} disabled className="bg-gray-100" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_role">Role</Label>
                                  <Select name="role" defaultValue={editingUser?.role || u.role}>
                                    <SelectTrigger id="edit_role">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="colaborador">Colaborador</SelectItem>
                                      <SelectItem value="gestor">Gestor</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                      </>
                                    ) : (
                                      "Salvar Alterações"
                                    )}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(u.id, u.email)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;