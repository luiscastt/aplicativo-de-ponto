import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import SuspenseLoader from "./components/SuspenseLoader";

// Lazy Loading das Páginas
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Users = React.lazy(() => import("./pages/Users"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Audit = React.lazy(() => import("./pages/Audit"));
const Absences = React.lazy(() => import("./pages/Absences"));
const Devices = React.lazy(() => import("./pages/Devices"));
const Chat = React.lazy(() => import("./pages/Chat"));
const Announcements = React.lazy(() => import("./pages/Announcements")); // Novo

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Suspense fallback={<SuspenseLoader />}>
            <Routes>
              {/* Root path handles redirection based on auth state */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes wrapped in MainLayout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/audit" element={<Audit />} />
                  <Route path="/absences" element={<Absences />} />
                  <Route path="/devices" element={<Devices />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/announcements" element={<Announcements />} />
                </Route>
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;