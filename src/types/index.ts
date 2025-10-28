export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: "colaborador" | "gestor" | "admin";
  avatar_url?: string;
  updated_at: string;
}

export interface Point {
  id: string;
  user_id: string;
  type: "entrada" | "saida";
  timestamp: string;
  location: { lat: number; lon: number };
  photo_url?: string;
  status: "pendente" | "aprovado" | "rejeitado";
  created_at: string;
  user_name?: string; // Denormalizado para display
}