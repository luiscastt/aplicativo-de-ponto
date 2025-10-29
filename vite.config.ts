import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  base: "/web-painel-ponto/", // Definindo o caminho base explícito para o GitHub Pages
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Configuração para code splitting manual
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separa grandes dependências em chunks
            if (id.includes('@supabase/supabase-js') || id.includes('@tanstack/react-query')) {
              return 'vendor-supabase-query';
            }
            if (id.includes('react-router-dom') || id.includes('react-dom')) {
              return 'vendor-react-router';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Coloca o resto das dependências em um chunk genérico
            return 'vendor';
          }
        },
      },
    },
  },
}));