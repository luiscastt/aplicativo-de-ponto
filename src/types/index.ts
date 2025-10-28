export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: "colaborador" | "gestor" | "admin";
  avatar_url?: string;
  updated_at: string;
}