import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { AuthProvider } from "./hooks/useAuth";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClient } from "@/integrations/supabase/client";

const supabase = createClient();

createRoot(document.getElementById("root")!).render(
  <SessionContextProvider supabaseClient={supabase}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </SessionContextProvider>
);