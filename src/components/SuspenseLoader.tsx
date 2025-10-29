import { Loader2 } from "lucide-react";
import React from "react";

const SuspenseLoader: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando conteúdo...</p>
      </div>
    </div>
  );
};

export default SuspenseLoader;