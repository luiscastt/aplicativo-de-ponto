import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Profile } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface UserFormData {
  first_name: string;
  email: string;
  password?: string;
  role: "colaborador" | "gestor" | "admin";
}

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

interface EditUserDialogProps {
  user: Profile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserFormData> }) => 
      updateUserProfile(userId, data),
    onSuccess: (response) => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => showError(`Erro: ${error.message}`),
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const form = e.currentTarget as HTMLFormElement;
    const updateData: Partial<UserFormData> = {
      first_name: (form.elements.namedItem("edit_first_name") as HTMLInputElement).value.trim(),
      role: (form.elements.namedItem("edit_role") as HTMLSelectElement).value as UserFormData['role'],
    };

    if (!updateData.first_name) {
      showError("Nome é obrigatório.");
      return;
    }

    updateMutation.mutate({ userId: user.id, data: updateData });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              name="edit_first_name"
              defaultValue={user.first_name || ''} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label>Email (não editável)</Label>
            <Input value={user.email} disabled className="bg-gray-100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_role">Role</Label>
            <Select name="edit_role" defaultValue={user.role}>
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

export default EditUserDialog;