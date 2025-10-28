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
import { UserPlus, Edit, Trash2, Search, Loader2, RefreshCw } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import type { CreateUserResponse, Profile } from "@/types";

interface UserFormData {
  first_name: string;
  email: string;
  password?: string;
  role: "colaborador" | "gestor" | "admin";
}

interface UsersData {
  users: Profile[];
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
  return { users: data as Profile[] || [], total: count || 0 };
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
  const [editingUser, setEditingUser] = useState<Partial<Profile> | null>(null);
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
    const form = e.currentTarget as HTMLFormElement;
    const formData: UserFormData = {
      first_name: (form.elements.namedItem("first_name") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim().toLowerCase(),
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      role: (form.elements.namedItem("role") as HTMLSelectElement).value as UserFormData['role'],
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
    
    const form = e.currentTarget as HTMLFormElement;
    const updateData: Partial<UserFormData> = {
      first_name: (form.elements.namedItem("edit_first_name") as HTMLInputElement).value.trim(),
      role: (form.elements.namedItem("edit_role") as HTMLSelectElement).value as UserFormData['role'],
    };

    if (!updateData.first_name) {
      showError("Nome é obrigatório.");
      return;
    }

    updateMutation.mutate({ userId: editingUserId, data: updateData });
  };

  const handleEdit = (user: Profile) => {
    setEditingUser({
      first_name: user.first_name || '',
      email: user.email,
      role: user.role,
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
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Gestão de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-red-500">
            <p>Acesso negado. Apenas gestores e admins podem gerenciar usuários.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Títulos Centralizados */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestão de Usuários</h1>
        <p className="text-sm text-muted-foreground">Crie, edite e gerencie contas de colaboradores.</p>
      </div>

      {/* Conteúdo Alinhado à Esquerda com Largura Limitada */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 sm:mt-0 w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">Criar Novo Usuário</DialogTitle>
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
          {/* Espaçamento para alinhar o botão à direita em desktop, mas mantendo a centralização do título acima */}
          <div className="hidden sm:block flex-grow" /> 
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full sm:w-auto">
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
              <div className="text-sm text-muted-foreground flex-shrink-0">
                Mostrando {users.length} de {total} usuários
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado. {searchTerm && 'Tente ajustar a busca.'}
                <Button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} className="ml-2" variant="link">
                  Limpar Busca
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Data de Atualização</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-card-foreground">
                            {u.first_name} {u.last_name || ''}
                          </TableCell>
                          <TableCell className="text-card-foreground">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === "colaborador" ? "secondary" : "default"}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-card-foreground">
                            {new Date(u.updated_at || '').toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="space-x-2">
                            <EditUserDialog 
                              user={u} 
                              isEditDialogOpen={isEditDialogOpen && editingUserId === u.id}
                              setIsEditDialogOpen={setIsEditDialogOpen}
                              handleEdit={handleEdit}
                              handleEditSubmit={handleEditSubmit}
                              editingUser={editingUser}
                              updateMutation={updateMutation}
                            />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(u.id, u.email || 'usuário')}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden space-y-4">
                  {users.map((u) => (
                    <Card key={u.id} className="shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-base truncate text-card-foreground">{u.first_name} {u.last_name || ''}</p>
                          <Badge variant={u.role === "colaborador" ? "secondary" : "default"} className="ml-2 flex-shrink-0">
                            {u.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                        <p className="text-xs text-muted-foreground">Atualizado em: {new Date(u.updated_at || '').toLocaleDateString('pt-BR')}</p>
                        <div className="flex justify-end space-x-2 pt-2">
                          <EditUserDialog 
                            user={u} 
                            isEditDialogOpen={isEditDialogOpen && editingUserId === u.id}
                            setIsEditDialogOpen={setIsEditDialogOpen}
                            handleEdit={handleEdit}
                            handleEditSubmit={handleEditSubmit}
                            editingUser={editingUser}
                            updateMutation={updateMutation}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(u.id, u.email || 'usuário')}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

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

// Componente auxiliar para o Diálogo de Edição (para simplificar o Users.tsx)
interface EditUserDialogProps {
  user: Profile;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  handleEdit: (user: Profile) => void;
  handleEditSubmit: (e: React.FormEvent) => void;
  editingUser: Partial<Profile> | null;
  updateMutation: ReturnType<typeof useMutation<any, any, { userId: string; data: Partial<UserFormData>; }>>;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  isEditDialogOpen,
  setIsEditDialogOpen,
  handleEdit,
  handleEditSubmit,
  editingUser,
  updateMutation
}) => {
  return (
    <Dialog 
      open={isEditDialogOpen} 
      onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          // Limpa o estado de edição ao fechar
          handleEdit(user); // Re-seta o usuário para garantir que o diálogo abra corretamente na próxima vez
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Editar {user.first_name}</DialogTitle>
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
            <Input value={user.email} disabled className="bg-gray-100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_role">Role</Label>
            <Select name="role" defaultValue={editingUser?.role || user.role}>
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
  );
};

export default Users;