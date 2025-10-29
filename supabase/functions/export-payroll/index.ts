// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Inicializar Supabase Client com Service Role Key (necessário para acesso irrestrito aos dados)
  const supabaseClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // 2. Autenticação Manual (Verificar se o usuário é Gestor/Admin)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { start_date, end_date } = await req.json();

    if (!start_date || !end_date) {
      return new Response(JSON.stringify({ success: false, error: 'Missing start_date or end_date.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 3. Verificar Role do Usuário (Gestor/Admin)
    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || !['gestor', 'admin'].includes(profile.role)) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: Only managers and admins can export data.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 4. Simulação de Exportação de Dados (usando Service Role Key)
    // Aqui, buscaríamos todos os pontos aprovados no período
    const { data: pointsData, error: pointsError } = await supabaseClient
        .from('points')
        .select(`
            timestamp, type, user_id,
            profiles(email, first_name, last_name)
        `)
        .eq('status', 'aprovado')
        .gte('timestamp', start_date)
        .lte('timestamp', end_date);

    if (pointsError) throw new Error(pointsError.message);

    // 5. Processamento e Retorno (Simulando um arquivo CSV/JSON grande)
    const totalRecords = pointsData?.length || 0;
    
    // Log de auditoria
    await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'exportacao_folha_pagamento',
        details: { 
            start_date, 
            end_date, 
            records_exported: totalRecords 
        }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Exportação de ${totalRecords} registros de ponto concluída com sucesso.`,
      data_preview: pointsData?.slice(0, 5) // Retorna apenas uma prévia
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('General error:', error);
    return new Response(JSON.stringify({ success: false, error: `Internal Server Error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});