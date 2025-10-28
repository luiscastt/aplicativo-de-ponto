import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null; // Redireciona automaticamente

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Bem-vindo ao Painel de Ponto</CardTitle>
          <CardDescription>Sistema de controle de jornada para empresas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => navigate("/login")} className="w-full">
            Acessar Painel
          </Button>
          <p className="text-sm text-gray-500 text-center">Ou use: gestor@empresa.com / 123</p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default Index;