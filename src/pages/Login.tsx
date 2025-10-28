import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess } from "@/utils/toast";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const handleAuthStateChange = async (event: any, session: any) => {
    if (event === 'SIGNED_IN') {
      showSuccess("Login realizado com sucesso!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Login no Painel de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#6366f1',
                    brandContrast: '#ffffff',
                  },
                },
              },
            }}
            theme="light"
            onAuthStateChange={handleAuthStateChange}
          />
          <p className="text-sm text-gray-500 text-center mt-4">Crie usuários no Supabase dashboard para testar (ex: gestor@empresa.com / senha123).</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;