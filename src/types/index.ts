export interface Profile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: 'colaborador' | 'gestor' | 'admin';
  avatar_url?: string;
  updated_at?: string;
}

export type PointType = 'entrada' | 'saida' | 'almoco' | 'pausa';

export interface CreateUserResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export type ToastId = string;