import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usamos a Service Role Key para criar usuários
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  try {
    const { first_name, email, password, role } = await req.json();

    if (!first_name || !email || !password || !role) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Criar o usuário na tabela auth.users
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma o email automaticamente para uso interno
      user_metadata: {
        first_name,
        role,
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError.message);
      return new Response(JSON.stringify({ success: false, error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // O trigger 'handle_new_user' no DB deve cuidar da criação do perfil.
    // No entanto, para garantir que o nome esteja correto, podemos confiar no trigger.

    return new Response(JSON.stringify({ 
      success: true, 
      message: `User ${email} created successfully.`,
      user_id: authData.user?.id
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('General error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});