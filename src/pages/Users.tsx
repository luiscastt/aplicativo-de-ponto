import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Edit, Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import Sidebar from "@/components/Sidebar";

// Mock data para usuários (em produção, fetch de /users ou Supabase.from('users').select())
const fetchUsers = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [
    { id: "1", name: "João Silva", email: "joao@empresa.com", role: "colaborador" as const, photoUrl: "/placeholder.svg" },
    { id: "2", name: "Maria Oliveira", email: "maria@empresa.com", role: "colaborador" as const, photoUrl: "/placeholder.svg" }
  ];
};

// Mock add user (em produção, POST /users ou Supabase.from('users').insert())
const addUser = async (userData: { name: string; email: string; role: "colaborador" | "gestor" }) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { id: Date.now().toString(), ...userData, photoUrl: "/placeholder.svg" };
};

// Mock delete user
const deleteUser = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return { success: true };
};

const Users = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", role: "colaborador" as const });

  const { data: users, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const addMutation = useMutation({
    mutationFn: addUser,
    onSuccess: () => {
      showSuccess("Usuário adicionado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", role: "colaborador" });
      refetch();
    },
    onError: () => showError("Erro ao adicionar usuário.")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showSuccess("Usuário removido!");
      refetch();
    },
    onError: () => showError("Erro ao remover usuário.")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Confirmar remoção?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
            <p className="text-gray-600">Adicione e gerencie colaboradores.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Colaborador</DialogTitle>
                <DialogDescription>Preencha os dados para onboard.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "colaborador" | "gestor" })}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="gestor">Gestor</option>
                  </select>
                </div>
                {/* Foto base para facial: em produção, upload file e store em Supabase storage */}
                <div className="space-y-2">
                  <Label>Foto Base (para facial, opcional no MVP)</Label>
                  <Input type="file" accept="image/*" onChange={() => { /* Handle upload */ }} />
                  <p className="text-sm text-muted-foreground">Captura selfie durante onboarding no app.</p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "colaborador" ? "secondary" : "default"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;